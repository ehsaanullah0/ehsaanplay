import {
  MediaItem,
  PersonalMediaState,
  CustomList,
} from '../types/movie';
import {
  loadMediaCache,
  saveMediaCache,
  loadUserStates,
  saveUserStates,
  loadCustomLists,
  saveCustomLists,
} from './storage';
import LZString from 'lz-string';
import QRCode from 'qrcode';

export type ChangeOperation =
  | 'add'
  | 'update_state'
  | 'update_media'
  | 'delete'
  | 'list_create'
  | 'list_update'
  | 'list_delete'
  | 'list_item_add'
  | 'list_item_remove';

export interface LibraryChangeEntry {
  changeId: number;
  timestamp: number;
  entityId: string;
  operation: ChangeOperation;
  data?: {
    mediaItem?: Partial<MediaItem>;
    state?: Partial<PersonalMediaState>;
    list?: Partial<CustomList>;
    listItemId?: string;
  };
}

export interface RecentChangesPackage {
  format: 'ehsaan-play-recent-changes';
  version: 1;
  exportedAt: number;
  fromChangeId: number;
  toChangeId: number;
  changeCount: number;
  changes: LibraryChangeEntry[];
}

export interface CheckpointConfig {
  lastExportedChangeId: number;
  devices?: Record<string, { lastExportedChangeId: number; deviceName?: string }>;
}

export interface ChangesValidationResult {
  valid: boolean;
  message?: string;
  package?: RecentChangesPackage;
  summary?: {
    totalChanges: number;
    newItemsCount: number;
    updatesCount: number;
    deletionsCount: number;
    listsCount: number;
  };
}

export interface ApplyChangesResult {
  success: boolean;
  message: string;
  appliedCount: number;
  newItemsCount: number;
  updatesCount: number;
  deletionsCount: number;
  listsCount: number;
}

const STORAGE_KEYS = {
  ENTRIES: 'ehsaan_change_log_entries_v1',
  COUNTER: 'ehsaan_change_log_counter_v1',
  CHECKPOINT: 'ehsaan_change_log_checkpoint_v1',
};

const MAX_CHANGE_LOG_ENTRIES = 2500;
export const MAX_QR_SAFE_LENGTH = 1400;
export const TRANSFER_CODE_PREFIX = 'EP-RC1-';

// ---------------------------------------------------------------------------
// 1. Persistent Change Log Queue & Monotonic ID Generator
// ---------------------------------------------------------------------------

export function getNextChangeId(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.COUNTER);
    let counter = raw ? parseInt(raw, 10) : 1840;
    if (isNaN(counter) || counter < 1000) counter = 1840;

    // To prevent counter from falling behind the checkpoint
    const checkpoint = loadCheckpoint();
    const lastExported = checkpoint.lastExportedChangeId;
    if (counter < lastExported) {
      counter = lastExported;
    }

    // Also prevent counter from falling behind any existing loaded entries
    const entries = loadChangeLogEntries();
    if (entries.length > 0) {
      const maxEntryId = entries[entries.length - 1].changeId;
      if (counter < maxEntryId) {
        counter = maxEntryId;
      }
    }

    counter += 1;
    localStorage.setItem(STORAGE_KEYS.COUNTER, counter.toString());
    return counter;
  } catch (err) {
    console.error('Error incrementing change log counter:', err);
    return Date.now();
  }
}

export function loadChangeLogEntries(): LibraryChangeEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ENTRIES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Error loading change log entries:', err);
    return [];
  }
}

function saveChangeLogEntries(entries: LibraryChangeEntry[]): boolean {
  try {
    // Keep within reasonable bounded size (FIFO)
    const trimmed = entries.length > MAX_CHANGE_LOG_ENTRIES
      ? entries.slice(entries.length - MAX_CHANGE_LOG_ENTRIES)
      : entries;
    localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(trimmed));
    return true;
  } catch (err) {
    console.error('Error saving change log entries:', err);
    return false;
  }
}

/**
 * Appends a lightweight change entry to the persistent queue.
 * Never serializes the full library.
 */
export function recordLibraryChange(
  operation: ChangeOperation,
  entityId: string,
  data?: LibraryChangeEntry['data']
): LibraryChangeEntry {
  const changeId = getNextChangeId();
  const timestamp = Date.now();

  // Strip artwork/images from data to enforce zero-artwork lightweight payload
  let sanitizedData = data;
  if (data?.mediaItem) {
    const m = data.mediaItem;
    // Keep only compact relative TMDB path or URL, never base64 data URLs
    const cleanPoster = typeof m.posterUrl === 'string' && !m.posterUrl.startsWith('data:') && !m.posterUrl.startsWith('blob:')
      ? (m.posterUrl.startsWith('https://image.tmdb.org/t/p/') ? m.posterUrl.replace(/^https:\/\/image\.tmdb\.org\/t\/p\/(w\d+|original)/, '') : m.posterUrl)
      : undefined;
    const cleanBackdrop = typeof m.backdropUrl === 'string' && !m.backdropUrl.startsWith('data:') && !m.backdropUrl.startsWith('blob:')
      ? (m.backdropUrl.startsWith('https://image.tmdb.org/t/p/') ? m.backdropUrl.replace(/^https:\/\/image\.tmdb\.org\/t\/p\/(w\d+|original)/, '') : m.backdropUrl)
      : undefined;

    sanitizedData = {
      ...data,
      mediaItem: {
        id: m.id,
        title: m.title,
        type: m.type,
        year: m.year,
        tmdbId: m.tmdbId,
        tmdbRating: m.tmdbRating,
        genres: m.genres,
        runtime: m.runtime,
        overview: m.overview ? m.overview.slice(0, 200) : undefined,
        tagline: m.tagline,
        voteCount: m.voteCount,
        posterUrl: cleanPoster,
        backdropUrl: cleanBackdrop,
      },
    };
  }

  const entry: LibraryChangeEntry = {
    changeId,
    timestamp,
    entityId,
    operation,
    data: sanitizedData,
  };

  const current = loadChangeLogEntries();
  current.push(entry);
  saveChangeLogEntries(current);

  return entry;
}

// ---------------------------------------------------------------------------
// 2. Checkpoints
// ---------------------------------------------------------------------------

export function loadCheckpoint(): CheckpointConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CHECKPOINT);
    if (!raw) return { lastExportedChangeId: 0, devices: {} };
    const parsed = JSON.parse(raw);
    return {
      lastExportedChangeId: typeof parsed.lastExportedChangeId === 'number' ? parsed.lastExportedChangeId : 0,
      devices: parsed.devices && typeof parsed.devices === 'object' ? parsed.devices : {},
    };
  } catch {
    return { lastExportedChangeId: 0, devices: {} };
  }
}

export function saveCheckpoint(lastExportedChangeId: number, deviceId?: string, deviceName?: string): void {
  try {
    const current = loadCheckpoint();
    const updated: CheckpointConfig = {
      lastExportedChangeId: Math.max(current.lastExportedChangeId, lastExportedChangeId),
      devices: { ...current.devices },
    };

    if (deviceId) {
      updated.devices![deviceId] = {
        lastExportedChangeId,
        deviceName: deviceName || updated.devices![deviceId]?.deviceName || `Device ${deviceId.slice(0, 4)}`,
      };
    }

    localStorage.setItem(STORAGE_KEYS.CHECKPOINT, JSON.stringify(updated));
  } catch (err) {
    console.error('Error saving checkpoint:', err);
  }
}

export function reconstructChangeLogFromLibrary(force = false): void {
  try {
    const explicitlyCleared = localStorage.getItem('ehsaan_changelog_explicitly_cleared') === 'true';
    if (explicitlyCleared && !force) return;

    const states = loadUserStates();
    const media = loadMediaCache();
    const entries = loadChangeLogEntries();
    
    // If we already have entries, we do not need to reconstruct
    if (entries.length > 0) return;

    let startId = 1840;
    const newEntries: LibraryChangeEntry[] = [];
    const mediaMap = new Map<string, MediaItem>(media.map(m => [m.id, m]));

    for (const [mediaId, state] of Object.entries(states)) {
      const isInteresting = state.inWatchlist || state.isWatched || state.isFavorite || state.personalRating || state.notes;
      if (!isInteresting) continue;

      const item = mediaMap.get(mediaId);
      if (item) {
        startId += 1;
        newEntries.push({
          changeId: startId,
          timestamp: Date.now() - 60000,
          entityId: mediaId,
          operation: 'add',
          data: {
            mediaItem: {
              id: item.id,
              title: item.title,
              type: item.type,
              year: item.year,
              tmdbId: item.tmdbId,
              tmdbRating: item.tmdbRating,
              genres: item.genres,
              posterUrl: item.posterUrl,
            },
            state: {
              inWatchlist: state.inWatchlist,
              isWatched: state.isWatched,
              isFavorite: state.isFavorite,
              personalRating: state.personalRating,
              notes: state.notes,
              progressPercent: state.progressPercent,
              tvProgress: state.tvProgress,
              addedAt: state.addedAt || new Date().toISOString(),
            }
          }
        });
      }
    }

    if (newEntries.length > 0) {
      localStorage.setItem(STORAGE_KEYS.COUNTER, startId.toString());
      localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(newEntries));
      localStorage.setItem(STORAGE_KEYS.CHECKPOINT, JSON.stringify({ lastExportedChangeId: 1840, devices: {} }));
    }
  } catch (err) {
    console.error('Error reconstructing change log from library:', err);
  }
}

export function clearChangeLogHistory(): void {
  try {
    const entries = loadChangeLogEntries();
    const maxChangeId = entries.length > 0 ? entries[entries.length - 1].changeId : 1840;
    
    localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify([]));
    saveCheckpoint(maxChangeId);
    localStorage.setItem('ehsaan_changelog_explicitly_cleared', 'true');
  } catch (err) {
    console.error('Error clearing change log history:', err);
  }
}

export function getChangeLogStats() {
  let entries = loadChangeLogEntries();
  if (entries.length === 0) {
    reconstructChangeLogFromLibrary();
    entries = loadChangeLogEntries();
  }
  const checkpoint = loadCheckpoint();

  const minChangeId = entries.length > 0 ? entries[0].changeId : 0;
  const maxChangeId = entries.length > 0 ? entries[entries.length - 1].changeId : 0;
  const lastExported = checkpoint.lastExportedChangeId;

  const unexportedCount = entries.filter(e => e.changeId > lastExported).length;

  return {
    totalEntries: entries.length,
    minChangeId,
    maxChangeId,
    lastExportedChangeId: lastExported,
    unexportedCount,
  };
}

export function getRecentChanges(options?: {
  fromChangeId?: number;
  toChangeId?: number;
  limit?: number;
}): LibraryChangeEntry[] {
  let entries = loadChangeLogEntries();
  if (entries.length === 0) {
    reconstructChangeLogFromLibrary();
    entries = loadChangeLogEntries();
  }
  const checkpoint = loadCheckpoint();

  // If fromChangeId is not specified, do NOT filter by lastExportedChangeId + 1 if limit is specified
  const from = options?.fromChangeId !== undefined
    ? options.fromChangeId
    : (options?.limit !== undefined ? 0 : checkpoint.lastExportedChangeId + 1);

  if (from > 0) {
    entries = entries.filter(e => e.changeId >= from);
  }

  if (options?.toChangeId !== undefined) {
    entries = entries.filter(e => e.changeId <= options.toChangeId!);
  }

  if (options?.limit && options.limit > 0) {
    entries = entries.slice(-options.limit);
  }

  return entries;
}

// ---------------------------------------------------------------------------
// 3. Packaging & Serialization
// ---------------------------------------------------------------------------

export function createRecentChangesPackage(changes: LibraryChangeEntry[]): RecentChangesPackage {
  if (changes.length === 0) {
    throw new Error('No recent changes available to transfer.');
  }

  const sorted = [...changes].sort((a, b) => a.changeId - b.changeId);
  const fromChangeId = sorted[0].changeId;
  const toChangeId = sorted[sorted.length - 1].changeId;

  return {
    format: 'ehsaan-play-recent-changes',
    version: 1,
    exportedAt: Date.now(),
    fromChangeId,
    toChangeId,
    changeCount: sorted.length,
    changes: sorted,
  };
}

export function exportChangesToJSON(pkg: RecentChangesPackage): string {
  return JSON.stringify(pkg, null, 2);
}

export function encodeChangesToCode(pkg: RecentChangesPackage): string {
  const minifiedJson = JSON.stringify(pkg);
  const compressed = LZString.compressToEncodedURIComponent(minifiedJson);
  return `${TRANSFER_CODE_PREFIX}${compressed}`;
}

export function decodeChangesFromCode(code: string): RecentChangesPackage {
  const trimmed = code.trim();
  let jsonString: string | null = null;

  if (trimmed.startsWith(TRANSFER_CODE_PREFIX)) {
    const payload = trimmed.slice(TRANSFER_CODE_PREFIX.length);
    jsonString = LZString.decompressFromEncodedURIComponent(payload);
    if (!jsonString) {
      throw new Error('Decompression failed. The transfer code may be incomplete or corrupted.');
    }
  } else if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    jsonString = trimmed;
  } else {
    // Attempt standard decompression as fallback
    const decompressed = LZString.decompressFromEncodedURIComponent(trimmed);
    if (decompressed) {
      jsonString = decompressed;
    } else {
      throw new Error('Unrecognized transfer code format. Expected EP-RC1-... or JSON.');
    }
  }

  const parsed = JSON.parse(jsonString);
  return parsed as RecentChangesPackage;
}

// ---------------------------------------------------------------------------
// 4. Defensive Validation
// ---------------------------------------------------------------------------

export function validateChangesPackage(raw: unknown): ChangesValidationResult {
  if (!raw || typeof raw !== 'object') {
    return { valid: false, message: 'Invalid payload: expected an object.' };
  }

  const pkg = raw as Partial<RecentChangesPackage>;

  if (pkg.format !== 'ehsaan-play-recent-changes') {
    return {
      valid: false,
      message: 'Format mismatch: this is not an EHSAAN PLAY Recent Changes payload.',
    };
  }

  if (pkg.version !== 1) {
    return {
      valid: false,
      message: `Unsupported version (${pkg.version}). Only version 1 is supported.`,
    };
  }

  if (!Array.isArray(pkg.changes) || pkg.changes.length === 0) {
    return {
      valid: false,
      message: 'No changes found in the transfer package.',
    };
  }

  let newItemsCount = 0;
  let updatesCount = 0;
  let deletionsCount = 0;
  let listsCount = 0;

  for (let i = 0; i < pkg.changes.length; i++) {
    const c = pkg.changes[i];
    if (typeof c.changeId !== 'number') {
      return { valid: false, message: `Change at index ${i} has an invalid changeId.` };
    }
    if (!c.entityId || typeof c.entityId !== 'string') {
      return { valid: false, message: `Change at index ${i} is missing a stable entityId.` };
    }
    if (!c.operation || typeof c.operation !== 'string') {
      return { valid: false, message: `Change at index ${i} is missing an operation.` };
    }

    if (c.operation === 'add') newItemsCount++;
    else if (c.operation === 'delete') deletionsCount++;
    else if (c.operation.startsWith('list_')) listsCount++;
    else updatesCount++;
  }

  return {
    valid: true,
    package: pkg as RecentChangesPackage,
    summary: {
      totalChanges: pkg.changes.length,
      newItemsCount,
      updatesCount,
      deletionsCount,
      listsCount,
    },
  };
}

// ---------------------------------------------------------------------------
// 5. Non-Destructive Merge Engine (NEVER WIPE, NEVER REPLACE)
// ---------------------------------------------------------------------------

export function applyRecentChanges(pkg: RecentChangesPackage): ApplyChangesResult {
  const validation = validateChangesPackage(pkg);
  if (!validation.valid || !validation.package) {
    return {
      success: false,
      message: validation.message || 'Validation failed.',
      appliedCount: 0,
      newItemsCount: 0,
      updatesCount: 0,
      deletionsCount: 0,
      listsCount: 0,
    };
  }

  // Load current library records (Destination only, not source of payload)
  const currentMedia = loadMediaCache();
  const currentStates = loadUserStates();
  const currentLists = loadCustomLists();

  let mediaMap = new Map<string, MediaItem>(currentMedia.map(m => [m.id, m]));
  let statesMap = new Map<string, PersonalMediaState>(Object.entries(currentStates));
  let listsMap = new Map<string, CustomList>(currentLists.map(l => [l.id, l]));

  let newItemsCount = 0;
  let updatesCount = 0;
  let deletionsCount = 0;
  let listsCount = 0;

  // Process changes in monotonic sequence
  const sortedChanges = [...validation.package.changes].sort((a, b) => a.changeId - b.changeId);

  for (const change of sortedChanges) {
    const { entityId, operation, data } = change;

    switch (operation) {
      case 'add': {
        if (data?.mediaItem && data.mediaItem.id) {
          const incomingItem = data.mediaItem as MediaItem;
          if (!mediaMap.has(entityId)) {
            const resolvedPoster = incomingItem.posterUrl?.startsWith('/')
              ? `https://image.tmdb.org/t/p/w500${incomingItem.posterUrl}`
              : incomingItem.posterUrl;
            const resolvedBackdrop = incomingItem.backdropUrl?.startsWith('/')
              ? `https://image.tmdb.org/t/p/original${incomingItem.backdropUrl}`
              : incomingItem.backdropUrl;

            // New item to add
            mediaMap.set(entityId, {
              id: entityId,
              title: incomingItem.title || 'Untitled',
              originalTitle: incomingItem.originalTitle || incomingItem.title || 'Untitled',
              releaseDate: incomingItem.releaseDate || (incomingItem.year ? `${incomingItem.year}-01-01` : ''),
              type: incomingItem.type || 'movie',
              year: incomingItem.year || 2024,
              tmdbId: incomingItem.tmdbId || 0,
              tmdbRating: incomingItem.tmdbRating || 0,
              genres: incomingItem.genres || [],
              runtime: incomingItem.runtime,
              overview: incomingItem.overview || '',
              tagline: incomingItem.tagline,
              voteCount: incomingItem.voteCount || 0,
              cast: incomingItem.cast || [],
              crew: incomingItem.crew || [],
              posterUrl: resolvedPoster || '',
              backdropUrl: resolvedBackdrop || '',
            });
            newItemsCount++;
          }
          // Merge incoming personal state if provided
          if (data.state) {
            const existingState = statesMap.get(entityId) || {
              mediaId: entityId,
              inWatchlist: true,
              isWatched: false,
              isFavorite: false,
              addedAt: new Date(change.timestamp).toISOString(),
            };
            statesMap.set(entityId, { ...existingState, ...data.state });
          }
        }
        break;
      }

      case 'update_state': {
        if (data?.state) {
          const existing = statesMap.get(entityId) || {
            mediaId: entityId,
            inWatchlist: false,
            isWatched: false,
            isFavorite: false,
            addedAt: new Date(change.timestamp).toISOString(),
          };
          statesMap.set(entityId, { ...existing, ...data.state });
          updatesCount++;
        }
        break;
      }

      case 'update_media': {
        if (data?.mediaItem && mediaMap.has(entityId)) {
          const existing = mediaMap.get(entityId)!;
          mediaMap.set(entityId, { ...existing, ...data.mediaItem });
          updatesCount++;
        }
        break;
      }

      case 'delete': {
        // Delete only the specified entity
        if (mediaMap.has(entityId)) {
          mediaMap.delete(entityId);
          deletionsCount++;
        }
        if (statesMap.has(entityId)) {
          statesMap.delete(entityId);
        }
        // Remove from custom list membership
        for (const [listId, list] of listsMap.entries()) {
          if (list.itemIds.includes(entityId)) {
            listsMap.set(listId, {
              ...list,
              itemIds: list.itemIds.filter(id => id !== entityId),
              updatedAt: new Date(change.timestamp).toISOString(),
            });
          }
        }
        break;
      }

      case 'list_create': {
        if (data?.list && data.list.title) {
          const listId = entityId;
          const existing = listsMap.get(listId);
          if (!existing) {
            listsMap.set(listId, {
              id: listId,
              title: data.list.title,
              description: data.list.description,
              createdAt: data.list.createdAt || new Date(change.timestamp).toISOString(),
              updatedAt: new Date(change.timestamp).toISOString(),
              itemIds: Array.isArray(data.list.itemIds) ? data.list.itemIds : [],
              colorTag: data.list.colorTag || '#4E562F',
            });
            listsCount++;
          }
        }
        break;
      }

      case 'list_update': {
        if (data?.list && listsMap.has(entityId)) {
          const existing = listsMap.get(entityId)!;
          listsMap.set(entityId, {
            ...existing,
            ...data.list,
            updatedAt: new Date(change.timestamp).toISOString(),
          });
          listsCount++;
        }
        break;
      }

      case 'list_delete': {
        if (listsMap.has(entityId)) {
          listsMap.delete(entityId);
          listsCount++;
        }
        break;
      }

      case 'list_item_add': {
        const list = listsMap.get(entityId);
        const itemId = data?.listItemId;
        if (list && itemId && !list.itemIds.includes(itemId)) {
          listsMap.set(entityId, {
            ...list,
            itemIds: [...list.itemIds, itemId],
            updatedAt: new Date(change.timestamp).toISOString(),
          });
          listsCount++;
        }
        break;
      }

      case 'list_item_remove': {
        const list = listsMap.get(entityId);
        const itemId = data?.listItemId;
        if (list && itemId && list.itemIds.includes(itemId)) {
          listsMap.set(entityId, {
            ...list,
            itemIds: list.itemIds.filter(id => id !== itemId),
            updatedAt: new Date(change.timestamp).toISOString(),
          });
          listsCount++;
        }
        break;
      }

      default:
        break;
    }
  }

  // Atomically save merged data (Never wiping existing records)
  const nextMedia = Array.from(mediaMap.values());
  const nextStates: Record<string, PersonalMediaState> = Object.fromEntries(statesMap.entries());
  const nextLists = Array.from(listsMap.values());

  saveMediaCache(nextMedia);
  saveUserStates(nextStates);
  saveCustomLists(nextLists);

  // Update checkpoint to cover the imported changes
  saveCheckpoint(pkg.toChangeId);

  return {
    success: true,
    message: `Successfully merged ${sortedChanges.length} changes into your library.`,
    appliedCount: sortedChanges.length,
    newItemsCount,
    updatesCount,
    deletionsCount,
    listsCount,
  };
}

// ---------------------------------------------------------------------------
// 6. QR Code Generation with Size Protection
// ---------------------------------------------------------------------------

export async function generateQRCodeDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 320,
    color: {
      dark: '#1C1F13',
      light: '#FAF8F2',
    },
  });
}

export function isPayloadSafeForQR(payload: string): {
  safe: boolean;
  length: number;
  maxSafe: number;
} {
  return {
    safe: payload.length <= MAX_QR_SAFE_LENGTH,
    length: payload.length,
    maxSafe: MAX_QR_SAFE_LENGTH,
  };
}

// ---------------------------------------------------------------------------
// 7. Initial Seed Helper (Provides instant testable unexported changes)
// ---------------------------------------------------------------------------

export function ensureInitialChangeLogSeed(_catalog?: MediaItem[]): void {
  // Clean start: no artificial seed entries for first visit
}

