import { RealtimeChannel } from '@supabase/supabase-js';
import {
  MediaItem,
  PersonalMediaState,
  CustomList,
  UserSettings,
} from '../../types/movie';
import {
  loadUserStates,
  saveUserStates,
  loadCustomLists,
  saveCustomLists,
  loadMediaCache,
  saveMediaCache,
  loadUserSettings,
  saveUserSettings,
} from '../storage';
import { getSupabaseClient, loadSupabaseConfig, SyncState } from './config';
import { getCloudSession, getCloudUser } from './auth';
import { normalizeDurationToSeconds, secondsToMinutes } from './durationUtils';
import {
  deduplicateMediaItemsAndStates,
  findMediaItemByIdOrAlias,
  getStateTimestamp,
  hasStateInteraction,
} from '../../utils/mediaDedup';
import { fetchTMDBDetails, findTMDBByImdbId } from '../tmdb';
import { fetchImdbPreview } from '../omdb';

export interface SyncStatusInfo {
  state: SyncState;
  lastSyncAt: string | null;
  pendingQueueCount: number;
  errorMessage?: string | null;
  isRealtimeConnected: boolean;
}

interface OfflineQueueEntry {
  id: string;
  table: 'user_media_states' | 'user_custom_lists' | 'user_media_items' | 'user_app_settings';
  action: 'upsert' | 'delete';
  payload: any;
  timestamp: string;
}

const STORAGE_KEYS = {
  OFFLINE_QUEUE: 'ehsaan_supabase_offline_queue_v1',
  LAST_SYNC: 'ehsaan_supabase_last_sync_v1',
};

let currentSyncStatus: SyncStatusInfo = {
  state: 'not_configured',
  lastSyncAt: null,
  pendingQueueCount: 0,
  errorMessage: null,
  isRealtimeConnected: false,
};

let realtimeChannel: RealtimeChannel | null = null;
let realtimeUserId: string | null = null;
let isSyncing = false;
let activeSyncPromise: Promise<{ success: boolean; message: string }> | null = null;
let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let lastBackgroundSyncAttemptAt = 0;

// Listeners for sync status changes
const statusListeners: Set<(status: SyncStatusInfo) => void> = new Set();

export function subscribeToSyncStatus(listener: (status: SyncStatusInfo) => void): () => void {
  statusListeners.add(listener);
  listener(currentSyncStatus);
  return () => {
    statusListeners.delete(listener);
  };
}

function updateSyncStatus(partial: Partial<SyncStatusInfo>): void {
  currentSyncStatus = { ...currentSyncStatus, ...partial };
  for (const listener of statusListeners) {
    try {
      listener(currentSyncStatus);
    } catch (e) {
      console.error('Error in sync status listener:', e);
    }
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('ehsaan:supabase-sync-status', { detail: currentSyncStatus })
    );
  }
}

export function getSyncStatus(): SyncStatusInfo {
  return currentSyncStatus;
}

/**
 * Resolves the authenticated user quickly from local session first (works offline too),
 * falling back to getCloudUser() if needed.
 */
async function resolveAuthenticatedUser() {
  const session = await getCloudSession();
  if (session?.user) return session.user;
  return await getCloudUser();
}

/**
 * Loads pending offline operations from localStorage
 */
function loadOfflineQueue(): OfflineQueueEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Saves pending offline operations to localStorage
 */
function saveOfflineQueue(queue: OfflineQueueEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
    updateSyncStatus({ pendingQueueCount: queue.length });
  } catch (err) {
    console.error('Failed to save offline queue:', err);
  }
}

/**
 * Adds an operation to the offline write queue
 */
export function enqueueOfflineChange(
  table: OfflineQueueEntry['table'],
  action: OfflineQueueEntry['action'],
  payload: any
): void {
  const queue = loadOfflineQueue();
  // Deduplicate queued entries by table + entity identifier
  const key = payload.media_id || payload.id || 'settings';
  const filtered = queue.filter(
    item => !(item.table === table && (item.payload.media_id === key || item.payload.id === key))
  );

  filtered.push({
    id: `${table}-${key}-${Date.now()}`,
    table,
    action,
    payload,
    timestamp: new Date().toISOString(),
  });

  saveOfflineQueue(filtered);
}

/**
 * Helper to safely extract integer value or null
 */
export function parseSafeInt(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') {
    return isNaN(val) || !isFinite(val) ? null : Math.round(val);
  }
  const clean = String(val).replace(/,/g, '').trim();
  const num = parseInt(clean, 10);
  return isNaN(num) ? null : num;
}

/**
 * Helper to safely extract float value or null
 */
export function parseSafeFloat(val: unknown, decimals: number = 2): number | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') {
    return isNaN(val) || !isFinite(val) ? null : Number(val.toFixed(decimals));
  }
  const clean = String(val).replace(/,/g, '').trim();
  const num = parseFloat(clean);
  return isNaN(num) ? null : Number(num.toFixed(decimals));
}

/**
 * Helper to safely extract 4-digit release year or null
 */
export function parseSafeYear(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number' && !isNaN(val) && val >= 1880 && val <= 2100) {
    return Math.round(val);
  }
  const match = String(val).match(/\b(18|19|20)\d{2}\b/);
  return match ? parseInt(match[0], 10) : null;
}

/**
 * Converts a camelCase MediaItem into snake_case database row.
 * Normalizes duration strings ("29 min", "1 hr 20 min") into canonical integer seconds,
 * sanitizes year ("2008–2013" -> 2008), counts, ratings, and genres.
 */
export function mapMediaItemToDbRow(userId: string, item: MediaItem) {
  const runtimeSeconds = normalizeDurationToSeconds(item.runtime);
  const year = parseSafeYear(item.year) || parseSafeYear(item.releaseDate);

  const seasonsCount = parseSafeInt(item.seasonsCount);
  const episodesCount = parseSafeInt(item.episodesCount);
  const voteCount = parseSafeInt(item.voteCount) ?? 0;
  const tmdbId = parseSafeInt(item.tmdbId);

  const tmdbRating = parseSafeFloat(item.tmdbRating, 2);
  const imdbRating = parseSafeFloat(item.imdbRating, 2);
  const popularity = parseSafeFloat(item.popularity, 2);

  let genres: string[] = [];
  if (Array.isArray(item.genres)) {
    genres = item.genres.map(String).filter(Boolean);
  } else if (typeof item.genres === 'string') {
    genres = (item.genres as string).split(',').map(g => g.trim()).filter(Boolean);
  }

  const seasons = Array.isArray(item.seasons) ? item.seasons : null;
  const episodesList = Array.isArray(item.episodesList) ? item.episodesList : null;
  const castData = Array.isArray(item.cast) ? item.cast : [];
  const crewData = Array.isArray(item.crew) ? item.crew : [];
  const providers = Array.isArray(item.providers) ? item.providers : [];

  return {
    user_id: userId,
    id: String(item.id),
    type: item.type === 'tv' ? 'tv' : 'movie',
    title: String(item.title || item.originalTitle || 'Untitled'),
    original_title: item.originalTitle ? String(item.originalTitle) : null,
    release_date: item.releaseDate ? String(item.releaseDate) : null,
    year,
    runtime: runtimeSeconds,
    seasons_count: seasonsCount,
    episodes_count: episodesCount,
    seasons,
    episodes_list: episodesList,
    overview: item.overview ? String(item.overview) : null,
    tagline: item.tagline ? String(item.tagline) : null,
    poster_url: item.posterUrl ? String(item.posterUrl) : null,
    backdrop_url: item.backdropUrl ? String(item.backdropUrl) : null,
    tmdb_id: tmdbId,
    tmdb_rating: tmdbRating,
    vote_count: voteCount,
    genres,
    cast_data: castData,
    crew_data: crewData,
    trailer_url: item.trailerUrl ? String(item.trailerUrl) : null,
    providers,
    country: item.country ? String(item.country) : null,
    production_company: item.productionCompany ? String(item.productionCompany) : null,
    status: item.status ? String(item.status) : null,
    language: item.language ? String(item.language) : null,
    imdb_id: item.imdbId ? String(item.imdbId) : null,
    imdb_rating: imdbRating,
    popularity,
    metadata_source: item.metadataSource ? String(item.metadataSource) : 'cache',
    fallback_poster_url: item.fallbackPosterUrl ? String(item.fallbackPosterUrl) : null,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Converts a database row into camelCase MediaItem.
 * Converts canonical database seconds back into minutes expected by UI components.
 */
export function mapDbRowToMediaItem(row: any): MediaItem {
  const runtimeMinutes = secondsToMinutes(row.runtime);

  return {
    id: String(row.id),
    type: row.type || 'movie',
    title: row.title,
    originalTitle: row.original_title || row.title,
    releaseDate: row.release_date || '',
    year: parseSafeYear(row.year) || new Date().getFullYear(),
    runtime: runtimeMinutes,
    seasonsCount: parseSafeInt(row.seasons_count) || undefined,
    episodesCount: parseSafeInt(row.episodes_count) || undefined,
    seasons: row.seasons || undefined,
    episodesList: row.episodes_list || undefined,
    overview: row.overview || '',
    tagline: row.tagline || undefined,
    posterUrl: row.poster_url || '',
    backdropUrl: row.backdrop_url || '',
    tmdbId: parseSafeInt(row.tmdb_id) || undefined,
    tmdbRating: row.tmdb_rating ? parseFloat(row.tmdb_rating) : undefined,
    voteCount: parseSafeInt(row.vote_count) || 0,
    genres: Array.isArray(row.genres) ? row.genres : [],
    cast: Array.isArray(row.cast_data) ? row.cast_data : [],
    crew: Array.isArray(row.crew_data) ? row.crew_data : [],
    trailerUrl: row.trailer_url || undefined,
    providers: Array.isArray(row.providers) ? row.providers : [],
    country: row.country || undefined,
    productionCompany: row.production_company || undefined,
    status: row.status || undefined,
    language: row.language || undefined,
    imdbId: row.imdb_id || undefined,
    imdbRating: row.imdb_rating ? parseFloat(row.imdb_rating) : undefined,
    popularity: row.popularity ? parseFloat(row.popularity) : undefined,
    metadataSource: row.metadata_source || 'cache',
    fallbackPosterUrl: row.fallback_poster_url || undefined,
  };
}

/**
 * Converts a PersonalMediaState into database row
 */
export function mapPersonalStateToDbRow(userId: string, state: PersonalMediaState) {
  const rating = parseSafeFloat(state.personalRating, 1);
  const progress = Math.min(100, Math.max(0, parseSafeInt(state.progressPercent) ?? 0));

  return {
    user_id: userId,
    media_id: String(state.mediaId),
    in_watchlist: !!state.inWatchlist,
    is_watched: !!state.isWatched,
    is_favorite: !!state.isFavorite,
    favorited_at: state.favoritedAt || null,
    personal_rating: rating,
    rating_tag: state.ratingTag || null,
    notes: state.notes ? String(state.notes) : null,
    progress_percent: progress,
    last_watched_at: state.lastWatchedAt || null,
    added_at: state.addedAt || new Date().toISOString(),
    tv_progress: state.tvProgress || null,
    updated_at: state.updatedAt || new Date().toISOString(),
  };
}

/**
 * Converts database row to PersonalMediaState
 */
export function mapDbRowToPersonalState(row: any): PersonalMediaState {
  return {
    mediaId: String(row.media_id),
    inWatchlist: !!row.in_watchlist,
    isWatched: !!row.is_watched,
    isFavorite: !!row.is_favorite,
    favoritedAt: row.favorited_at || undefined,
    personalRating: row.personal_rating ? parseFloat(row.personal_rating) : undefined,
    ratingTag: row.rating_tag || undefined,
    notes: row.notes || undefined,
    progressPercent: parseSafeInt(row.progress_percent) || 0,
    lastWatchedAt: row.last_watched_at || undefined,
    addedAt: row.added_at || new Date().toISOString(),
    updatedAt: row.updated_at || undefined,
    tvProgress: row.tv_progress || undefined,
  };
}

/**
 * Converts CustomList to database row
 */
export function mapCustomListToDbRow(userId: string, list: CustomList) {
  return {
    user_id: userId,
    id: list.id,
    title: list.title,
    description: list.description || null,
    color_tag: list.colorTag || '#4E562F',
    is_ai_generated: !!list.isAiGenerated,
    ai_label: list.aiLabel || null,
    item_ids: list.itemIds || [],
    created_at: list.createdAt || new Date().toISOString(),
    updated_at: list.updatedAt || new Date().toISOString(),
  };
}

/**
 * Converts database row to CustomList
 */
export function mapDbRowToCustomList(row: any): CustomList {
  return {
    id: row.id,
    title: row.title,
    description: row.description || undefined,
    colorTag: row.color_tag || '#4E562F',
    isAiGenerated: !!row.is_ai_generated,
    aiLabel: row.ai_label || undefined,
    itemIds: row.item_ids || [],
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

/**
 * Fetches all rows for a user without hitting PostgREST's 1,000-row default page limit.
 */
async function fetchAllUserRows(
  client: any,
  table: 'user_media_states' | 'user_custom_lists' | 'user_media_items',
  userId: string
): Promise<{ data: any[]; error: any }> {
  const PAGE_SIZE = 1000;
  const allRows: any[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await client
      .from(table)
      .select('*')
      .eq('user_id', userId)
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      return { data: allRows, error };
    }

    if (!data || data.length === 0) {
      break;
    }

    allRows.push(...data);
    if (data.length < PAGE_SIZE) {
      break;
    }
    from += PAGE_SIZE;
  }

  return { data: allRows, error: null };
}

/**
 * Merges two MediaItem records keeping richer non-empty metadata.
 */
function mergeMediaItemMetadata(local: MediaItem, cloud: MediaItem): MediaItem {
  const hasGoodLocalPoster = Boolean(local.posterUrl && !local.posterUrl.includes('N/A') && local.posterUrl.length > 5);
  const hasGoodCloudPoster = Boolean(cloud.posterUrl && !cloud.posterUrl.includes('N/A') && cloud.posterUrl.length > 5);
  const hasGoodLocalBackdrop = Boolean(local.backdropUrl && !local.backdropUrl.includes('N/A') && local.backdropUrl.length > 5);
  const hasGoodCloudBackdrop = Boolean(cloud.backdropUrl && !cloud.backdropUrl.includes('N/A') && cloud.backdropUrl.length > 5);

  return {
    ...cloud,
    ...local,
    id: local.id,
    imdbId: local.imdbId || cloud.imdbId,
    tmdbId: local.tmdbId || cloud.tmdbId,
    posterUrl: hasGoodLocalPoster ? local.posterUrl : (hasGoodCloudPoster ? cloud.posterUrl : local.posterUrl),
    fallbackPosterUrl: local.fallbackPosterUrl || cloud.fallbackPosterUrl,
    backdropUrl: hasGoodLocalBackdrop ? local.backdropUrl : (hasGoodCloudBackdrop ? cloud.backdropUrl : local.backdropUrl),
    overview: (local.overview && local.overview.length > 20) ? local.overview : (cloud.overview || local.overview),
    genres: (local.genres && local.genres.length > 0) ? local.genres : (cloud.genres || []),
    cast: (local.cast && local.cast.length > 0) ? local.cast : (cloud.cast || []),
    crew: (local.crew && local.crew.length > 0) ? local.crew : (cloud.crew || []),
    providers: (local.providers && local.providers.length > 0) ? local.providers : (cloud.providers || []),
    seasonsCount: Math.max(local.seasonsCount || 0, cloud.seasonsCount || 0) || undefined,
    episodesCount: Math.max(local.episodesCount || 0, cloud.episodesCount || 0) || undefined,
    seasons: (local.seasons && local.seasons.length > 0) ? local.seasons : cloud.seasons,
    episodesList: (local.episodesList && local.episodesList.length > 0) ? local.episodesList : cloud.episodesList,
  };
}

/**
 * Resolves a single missing MediaItem by its ID (`tmdb-movie-*`, `tmdb-tv-*`, or `tt...`)
 * from TMDB / OMDb so synced watchlist items always appear even if the originating device
 * did not upload the `user_media_items` row yet.
 */
export async function resolveSingleMissingMediaItem(
  mediaId: string,
  settings?: UserSettings
): Promise<MediaItem | null> {
  if (!mediaId) return null;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return null;

  const activeSettings = settings || loadUserSettings();

  try {
    if (mediaId.startsWith('tmdb-movie-') || mediaId.startsWith('tmdb-tv-')) {
      const type = mediaId.startsWith('tmdb-tv-') ? 'tv' : 'movie';
      const numericId = mediaId.replace(/^tmdb-(movie|tv)-/, '');
      if (numericId) {
        const fetched = await fetchTMDBDetails(numericId, type, activeSettings.tmdbApiKey);
        if (fetched && fetched.title) {
          return { ...fetched, id: mediaId };
        }
      }
    } else if (mediaId.startsWith('tt')) {
      try {
        const tmdbMatch = await findTMDBByImdbId(mediaId, activeSettings.tmdbApiKey);
        if (tmdbMatch) {
          const fetched = await fetchTMDBDetails(tmdbMatch.id, tmdbMatch.type, activeSettings.tmdbApiKey);
          if (fetched && fetched.title) {
            return { ...fetched, id: mediaId, imdbId: mediaId };
          }
        }
      } catch {
        // Fallback to OMDb below
      }

      const omdbPreview = await fetchImdbPreview(mediaId, activeSettings.omdbApiKey);
      if (omdbPreview.success && omdbPreview.data?.mediaItem) {
        return {
          ...omdbPreview.data.mediaItem,
          id: mediaId,
          imdbId: mediaId,
        };
      }
    }
  } catch (err) {
    console.warn(`Failed to resolve missing synced media item (${mediaId}):`, err);
  }

  return null;
}

/**
 * Resolves up to a bounded batch of missing media items referenced by active synced states.
 */
async function resolveMissingMediaItemsBatch(
  missingMediaIds: string[],
  settings: UserSettings
): Promise<MediaItem[]> {
  if (missingMediaIds.length === 0) return [];
  if (typeof navigator !== 'undefined' && !navigator.onLine) return [];

  const cappedIds = missingMediaIds.slice(0, 25);
  const resolved: MediaItem[] = [];
  const CHUNK_SIZE = 5;

  for (let i = 0; i < cappedIds.length; i += CHUNK_SIZE) {
    const chunk = cappedIds.slice(i, i + CHUNK_SIZE);
    const results = await Promise.allSettled(
      chunk.map(id => resolveSingleMissingMediaItem(id, settings))
    );
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) {
        resolved.push(r.value);
      }
    }
  }

  return resolved;
}

export interface ReconcileInput {
  userId: string;
  localStates: Record<string, PersonalMediaState>;
  cloudStates: PersonalMediaState[];
  localLists: CustomList[];
  cloudLists: CustomList[];
  localMedia: MediaItem[];
  cloudMedia: MediaItem[];
}

export interface ReconcileOutput {
  mergedStates: Record<string, PersonalMediaState>;
  mergedLists: CustomList[];
  mergedMedia: MediaItem[];
  hasLocalChanges: boolean;
  missingMediaIds: string[];
  statesToUpload: PersonalMediaState[];
  listsToUpload: CustomList[];
  mediaItemsToUpload: MediaItem[];
}

/**
 * Pure reconciliation logic merging cloud and local states, lists, and media items.
 * Ensures:
 * - Newer `updatedAt` timestamps always win (even for watchlist toggles on older items)
 * - Un-interacted local stubs never block interacted cloud states on timestamp ties
 * - Active local states & active local media items absent from cloud are queued for upload
 * - Active cloud states without a local MediaItem are identified for metadata hydration
 */
export function reconcileCloudAndLocalData(input: ReconcileInput): ReconcileOutput {
  const { localStates, cloudStates, localLists, cloudLists, localMedia, cloudMedia } = input;

  let hasLocalChanges = false;
  const statesToUpload: PersonalMediaState[] = [];
  const listsToUpload: CustomList[] = [];
  const mediaItemsToUpload: MediaItem[] = [];

  // A. Merge Media States
  const mergedStates: Record<string, PersonalMediaState> = { ...localStates };
  const cloudStateMap = new Map<string, PersonalMediaState>();

  for (const cs of cloudStates) {
    cloudStateMap.set(cs.mediaId, cs);
    const ls = mergedStates[cs.mediaId];
    if (!ls) {
      mergedStates[cs.mediaId] = cs;
      hasLocalChanges = true;
    } else {
      const cloudTime = getStateTimestamp(cs);
      const localTime = getStateTimestamp(ls);
      const cloudActive = hasStateInteraction(cs);
      const localActive = hasStateInteraction(ls);

      const cloudWins =
        cloudTime > localTime ||
        (!localActive && cloudActive && cloudTime >= localTime);

      if (cloudWins) {
        const mergedTvCompleted = {
          ...(ls.tvProgress?.completedEpisodes || {}),
          ...(cs.tvProgress?.completedEpisodes || {}),
        };
        const hasMergedEpisodes = Object.keys(mergedTvCompleted).length > 0;
        const tvProgress = cs.tvProgress
          ? {
              ...cs.tvProgress,
              completedEpisodes: cs.isWatched === false && cs.progressPercent === 0
                ? (cs.tvProgress.completedEpisodes || {})
                : (hasMergedEpisodes ? mergedTvCompleted : cs.tvProgress.completedEpisodes),
            }
          : ls.tvProgress;

        mergedStates[cs.mediaId] = {
          ...ls,
          ...cs,
          tvProgress,
        };
        hasLocalChanges = true;
      } else if (localTime > cloudTime || (localActive && !cloudActive)) {
        statesToUpload.push(ls);
      }
    }
  }

  // Push active local-only states that do not exist in cloud yet
  for (const ls of Object.values(localStates)) {
    if (!ls || !ls.mediaId) continue;
    if (!cloudStateMap.has(ls.mediaId) && hasStateInteraction(ls)) {
      statesToUpload.push(ls);
    }
  }

  // B. Merge Custom Lists
  const mergedListsMap = new Map<string, CustomList>();
  const cloudListMap = new Map<string, CustomList>();
  for (const l of localLists) mergedListsMap.set(l.id, l);

  for (const cl of cloudLists) {
    cloudListMap.set(cl.id, cl);
    const ll = mergedListsMap.get(cl.id);
    if (!ll) {
      mergedListsMap.set(cl.id, cl);
      hasLocalChanges = true;
    } else {
      const cloudTime = new Date(cl.updatedAt || cl.createdAt || 0).getTime();
      const localTime = new Date(ll.updatedAt || ll.createdAt || 0).getTime();
      if (cloudTime > localTime) {
        mergedListsMap.set(cl.id, cl);
        hasLocalChanges = true;
      } else if (localTime > cloudTime) {
        listsToUpload.push(ll);
      }
    }
  }

  for (const ll of localLists) {
    if (!cloudListMap.has(ll.id)) {
      listsToUpload.push(ll);
    }
  }

  // C. Merge Media Items
  const mergedMediaMap = new Map<string, MediaItem>();
  const cloudMediaMap = new Map<string, MediaItem>();
  for (const m of localMedia) mergedMediaMap.set(m.id, m);

  for (const cm of cloudMedia) {
    cloudMediaMap.set(cm.id, cm);
    const existing = mergedMediaMap.get(cm.id);
    if (!existing) {
      mergedMediaMap.set(cm.id, cm);
      hasLocalChanges = true;
    } else {
      const mergedItem = mergeMediaItemMetadata(existing, cm);
      mergedMediaMap.set(cm.id, mergedItem);
    }
  }

  const mergedMediaArr = Array.from(mergedMediaMap.values());

  // D. Ensure active states' local MediaItems are also uploaded to cloud `user_media_items`
  //    AND identify any active synced states that still lack MediaItem metadata locally.
  const missingMediaIds: string[] = [];
  for (const [mediaId, st] of Object.entries(mergedStates)) {
    if (!hasStateInteraction(st)) continue;
    const matchedItem = findMediaItemByIdOrAlias(mediaId, mergedMediaArr);
    if (matchedItem) {
      if (!cloudMediaMap.has(matchedItem.id)) {
        mediaItemsToUpload.push(matchedItem);
      }
    } else {
      missingMediaIds.push(mediaId);
    }
  }

  return {
    mergedStates,
    mergedLists: Array.from(mergedListsMap.values()),
    mergedMedia: mergedMediaArr,
    hasLocalChanges,
    missingMediaIds,
    statesToUpload,
    listsToUpload,
    mediaItemsToUpload,
  };
}

/**
 * Executes a full bidirectional sync with Supabase:
 * 1. Flushes pending offline write queue.
 * 2. Fetches all cloud records (with pagination) for the authenticated user.
 * 3. Merges local and cloud data using updatedAt timestamps & interaction checks.
 * 4. Self-heals missing MediaItems via TMDB/OMDb and deduplicates alias IDs.
 * 5. Saves merged results locally, dispatches refresh events, and pushes local-only updates.
 */
export async function executeFullSync(): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!client) {
    updateSyncStatus({ state: 'not_configured' });
    return { success: false, message: 'Supabase client not configured.' };
  }

  const user = await resolveAuthenticatedUser();
  if (!user) {
    updateSyncStatus({ state: 'connected_unauthenticated' });
    return { success: false, message: 'Please sign in to sync with your cloud database.' };
  }

  if (isSyncing && activeSyncPromise) {
    return activeSyncPromise;
  }

  isSyncing = true;
  updateSyncStatus({ state: 'syncing', errorMessage: null });

  const runSync = async (): Promise<{ success: boolean; message: string }> => {
    try {
      // Phase 1: Flush Offline Write Queue
      await flushOfflineQueue(client, user.id);

      // Phase 2: Pull latest cloud data (paginated beyond 1,000 rows)
      const [statesRes, listsRes, mediaRes, settingsRes] = await Promise.all([
        fetchAllUserRows(client, 'user_media_states', user.id),
        fetchAllUserRows(client, 'user_custom_lists', user.id),
        fetchAllUserRows(client, 'user_media_items', user.id),
        client.from('user_app_settings').select('*').eq('user_id', user.id).maybeSingle(),
      ]);

      if (statesRes.error) throw new Error(`States fetch error: ${statesRes.error.message}`);
      if (listsRes.error) throw new Error(`Lists fetch error: ${listsRes.error.message}`);
      if (mediaRes.error) throw new Error(`Media fetch error: ${mediaRes.error.message}`);

      // Phase 3: Reconcile and Merge Data
      const localStates = loadUserStates();
      const localLists = loadCustomLists();
      const localMedia = loadMediaCache();
      const localSettings = loadUserSettings();

      const cloudStates = (statesRes.data || []).map(mapDbRowToPersonalState);
      const cloudLists = (listsRes.data || []).map(mapDbRowToCustomList);
      const cloudMedia = (mediaRes.data || []).map(mapDbRowToMediaItem);

      const reconciled = reconcileCloudAndLocalData({
        userId: user.id,
        localStates,
        cloudStates,
        localLists,
        cloudLists,
        localMedia,
        cloudMedia,
      });

      let hasLocalChanges = reconciled.hasLocalChanges;

      // Enqueue any newer / local-only records to push back to cloud
      for (const ls of reconciled.statesToUpload) {
        enqueueOfflineChange('user_media_states', 'upsert', mapPersonalStateToDbRow(user.id, ls));
      }
      for (const ll of reconciled.listsToUpload) {
        enqueueOfflineChange('user_custom_lists', 'upsert', mapCustomListToDbRow(user.id, ll));
      }
      for (const lm of reconciled.mediaItemsToUpload) {
        enqueueOfflineChange('user_media_items', 'upsert', mapMediaItemToDbRow(user.id, lm));
      }

      // Self-heal missing media items (for watchlist/watched/favorite states synced without item metadata)
      let nextMedia = reconciled.mergedMedia;
      if (reconciled.missingMediaIds.length > 0) {
        const resolvedItems = await resolveMissingMediaItemsBatch(reconciled.missingMediaIds, localSettings);
        if (resolvedItems.length > 0) {
          const mediaById = new Map(nextMedia.map(m => [m.id, m]));
          for (const item of resolvedItems) {
            if (!mediaById.has(item.id)) {
              mediaById.set(item.id, item);
              enqueueOfflineChange('user_media_items', 'upsert', mapMediaItemToDbRow(user.id, item));
              hasLocalChanges = true;
            }
          }
          nextMedia = Array.from(mediaById.values());
        }
      }

      // Deduplicate & align alias IDs across merged media, states, and lists
      const { cleanMedia, cleanStates, cleanLists } = deduplicateMediaItemsAndStates(
        nextMedia,
        reconciled.mergedStates,
        reconciled.mergedLists
      );

      // Detect if deduplication itself remapped keys or consolidated records
      const dedupChanged =
        cleanMedia.length !== localMedia.length ||
        Object.keys(cleanStates).length !== Object.keys(localStates).length;

      // D. Merge App Settings
      if (settingsRes.data && settingsRes.data.settings_json) {
        const cloudSettings = settingsRes.data.settings_json as UserSettings;
        const cloudTime = new Date(settingsRes.data.updated_at).getTime();
        const lastLocalSync = localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
        const localSyncTime = lastLocalSync ? new Date(lastLocalSync).getTime() : 0;

        if (cloudTime > localSyncTime) {
          saveUserSettings({ ...localSettings, ...cloudSettings });
        }
      }

      // Save merged results locally whenever cloud data or alias alignment changed anything
      if (hasLocalChanges || dedupChanged) {
        saveUserStates(cleanStates);
        saveCustomLists(cleanLists);
        saveMediaCache(cleanMedia);

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('ehsaan:library-change'));
        }
      }

      // Mark successful sync
      const nowIso = new Date().toISOString();
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, nowIso);

      // Flush any newly queued local-to-cloud updates
      await flushOfflineQueue(client, user.id);

      updateSyncStatus({
        state: 'sync_active',
        lastSyncAt: nowIso,
        errorMessage: null,
        pendingQueueCount: loadOfflineQueue().length,
      });

      return { success: true, message: 'Synchronization completed successfully.' };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Synchronization failed.';
      console.error('Full sync error:', err);
      updateSyncStatus({
        state: 'error',
        errorMessage: errorMsg,
      });
      return { success: false, message: errorMsg };
    } finally {
      isSyncing = false;
      activeSyncPromise = null;
    }
  };

  activeSyncPromise = runSync();
  return activeSyncPromise;
}

/**
 * Triggers a throttled non-blocking background sync (e.g. when switching to Watchlist tab).
 */
export function triggerBackgroundSync(minIntervalMs = 3000): void {
  const config = loadSupabaseConfig();
  if (!config) return;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;

  const now = Date.now();
  if (now - lastBackgroundSyncAttemptAt < minIntervalMs) return;
  lastBackgroundSyncAttemptAt = now;

  executeFullSync().catch(() => {
    // Silent failure for background sync
  });
}

function getConflictTarget(table: OfflineQueueEntry['table']): string {
  switch (table) {
    case 'user_media_states':
      return 'user_id,media_id';
    case 'user_app_settings':
      return 'user_id';
    case 'user_custom_lists':
    case 'user_media_items':
    default:
      return 'user_id,id';
  }
}

/**
 * Flushes all pending operations in the offline queue
 */
async function flushOfflineQueue(client: any, userId: string): Promise<void> {
  const queue = loadOfflineQueue();
  if (queue.length === 0) return;

  const remaining: OfflineQueueEntry[] = [];

  for (const entry of queue) {
    try {
      if (entry.action === 'upsert') {
        const payloadWithUser = { ...entry.payload, user_id: userId };
        const { error } = await client
          .from(entry.table)
          .upsert(payloadWithUser, { onConflict: getConflictTarget(entry.table) });
        if (error) {
          console.error(`Failed to flush queue entry ${entry.id}:`, error);
          remaining.push(entry);
        }
      } else if (entry.action === 'delete') {
        const idField = entry.table === 'user_media_states' ? 'media_id' : 'id';
        const targetId = entry.payload[idField];
        const { error } = await client
          .from(entry.table)
          .delete()
          .eq('user_id', userId)
          .eq(idField, targetId);
        if (error) {
          remaining.push(entry);
        }
      }
    } catch {
      remaining.push(entry);
    }
  }

  saveOfflineQueue(remaining);
}

/**
 * Uploads a state modification to Supabase immediately (or queues if offline)
 */
export function syncStateChangeToCloud(state: PersonalMediaState): void {
  const client = getSupabaseClient();
  resolveAuthenticatedUser().then(async user => {
    if (!client || !user) return;

    const row = mapPersonalStateToDbRow(user.id, state);
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      enqueueOfflineChange('user_media_states', 'upsert', row);
      return;
    }

    try {
      const { error } = await client
        .from('user_media_states')
        .upsert(row, { onConflict: 'user_id,media_id' });
      if (error) {
        enqueueOfflineChange('user_media_states', 'upsert', row);
      }
    } catch {
      enqueueOfflineChange('user_media_states', 'upsert', row);
    }
  });
}

/**
 * Uploads a custom list change to Supabase immediately
 */
export function syncCustomListChangeToCloud(list: CustomList): void {
  const client = getSupabaseClient();
  resolveAuthenticatedUser().then(async user => {
    if (!client || !user) return;

    const row = mapCustomListToDbRow(user.id, list);
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      enqueueOfflineChange('user_custom_lists', 'upsert', row);
      return;
    }

    try {
      const { error } = await client
        .from('user_custom_lists')
        .upsert(row, { onConflict: 'user_id,id' });
      if (error) {
        enqueueOfflineChange('user_custom_lists', 'upsert', row);
      }
    } catch {
      enqueueOfflineChange('user_custom_lists', 'upsert', row);
    }
  });
}

/**
 * Uploads a custom list deletion to Supabase
 */
export function syncCustomListDeletionToCloud(listId: string): void {
  const client = getSupabaseClient();
  resolveAuthenticatedUser().then(async user => {
    if (!client || !user) return;

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      enqueueOfflineChange('user_custom_lists', 'delete', { id: listId });
      return;
    }

    try {
      const { error } = await client
        .from('user_custom_lists')
        .delete()
        .eq('user_id', user.id)
        .eq('id', listId);
      if (error) {
        enqueueOfflineChange('user_custom_lists', 'delete', { id: listId });
      }
    } catch {
      enqueueOfflineChange('user_custom_lists', 'delete', { id: listId });
    }
  });
}

/**
 * Uploads media item to Supabase
 */
export function syncMediaItemToCloud(item: MediaItem): void {
  const client = getSupabaseClient();
  resolveAuthenticatedUser().then(async user => {
    if (!client || !user) return;

    const row = mapMediaItemToDbRow(user.id, item);
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      enqueueOfflineChange('user_media_items', 'upsert', row);
      return;
    }

    try {
      const { error } = await client
        .from('user_media_items')
        .upsert(row, { onConflict: 'user_id,id' });
      if (error) {
        enqueueOfflineChange('user_media_items', 'upsert', row);
      }
    } catch {
      enqueueOfflineChange('user_media_items', 'upsert', row);
    }
  });
}

/**
 * Fetches missing media item metadata from cloud `user_media_items` or falls back to TMDB/OMDb
 * when a Realtime state update arrives for an item not yet in localMediaCache.
 */
async function fetchAndCacheMissingMediaItem(mediaId: string): Promise<void> {
  if (!mediaId) return;

  const existingLocal = loadMediaCache();
  if (findMediaItemByIdOrAlias(mediaId, existingLocal)) return;

  const client = getSupabaseClient();
  let fetchedItem: MediaItem | null = null;

  if (client) {
    try {
      const user = await resolveAuthenticatedUser();
      if (user) {
        const { data } = await client
          .from('user_media_items')
          .select('*')
          .eq('user_id', user.id)
          .or(`id.eq.${mediaId},imdb_id.eq.${mediaId}`)
          .limit(1)
          .maybeSingle();
        if (data) {
          fetchedItem = mapDbRowToMediaItem(data);
        }
      }
    } catch {
      // Fall back to TMDB/OMDb below
    }
  }

  if (!fetchedItem) {
    fetchedItem = await resolveSingleMissingMediaItem(mediaId);
  }

  if (fetchedItem) {
    const latestMedia = loadMediaCache();
    const latestStates = loadUserStates();
    const latestLists = loadCustomLists();

    if (!findMediaItemByIdOrAlias(fetchedItem.id, latestMedia)) {
      const { cleanMedia, cleanStates, cleanLists } = deduplicateMediaItemsAndStates(
        [...latestMedia, fetchedItem],
        latestStates,
        latestLists
      );
      saveMediaCache(cleanMedia);
      saveUserStates(cleanStates);
      saveCustomLists(cleanLists);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ehsaan:library-change'));
      }
    }
  }
}

/**
 * Initializes Supabase Realtime channel subscriptions for live cross-device sync
 */
export function initializeRealtimeSubscription(): () => void {
  const client = getSupabaseClient();
  if (!client) {
    return () => {};
  }

  let cancelled = false;

  resolveAuthenticatedUser().then(user => {
    if (cancelled || !user) return;

    // Avoid rebuilding if already subscribed for this exact user and connected
    if (realtimeChannel && realtimeUserId === user.id && currentSyncStatus.isRealtimeConnected) {
      return;
    }

    if (realtimeChannel) {
      client.removeChannel(realtimeChannel);
      realtimeChannel = null;
    }

    realtimeUserId = user.id;
    realtimeChannel = client
      .channel(`ehsaan-play-realtime-sync-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_media_states',
          filter: `user_id=eq.${user.id}`,
        },
        payload => {
          handleRealtimeMediaStateChange(payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_custom_lists',
          filter: `user_id=eq.${user.id}`,
        },
        payload => {
          handleRealtimeCustomListChange(payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_media_items',
          filter: `user_id=eq.${user.id}`,
        },
        payload => {
          handleRealtimeMediaItemChange(payload);
        }
      )
      .subscribe(status => {
        const isConnected = status === 'SUBSCRIBED';
        updateSyncStatus({
          isRealtimeConnected: isConnected,
          state: isConnected ? 'sync_active' : currentSyncStatus.state,
        });
      });
  });

  return () => {
    cancelled = true;
    if (realtimeChannel && client) {
      client.removeChannel(realtimeChannel);
      realtimeChannel = null;
      realtimeUserId = null;
      updateSyncStatus({ isRealtimeConnected: false });
    }
  };
}

function handleRealtimeMediaStateChange(payload: any) {
  if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
    const newState = mapDbRowToPersonalState(payload.new);
    const local = loadUserStates();
    const existing = local[newState.mediaId];

    if (existing) {
      const existingTime = getStateTimestamp(existing);
      const incomingTime = getStateTimestamp(newState);
      if (existingTime > incomingTime && hasStateInteraction(existing)) {
        return; // Keep newer local state
      }
      local[newState.mediaId] = { ...existing, ...newState };
    } else {
      local[newState.mediaId] = newState;
    }

    saveUserStates(local);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ehsaan:library-change'));
    }

    // If this synced watchlist/watched/favorite item isn't in local media cache yet, fetch it
    if (hasStateInteraction(newState)) {
      const localMedia = loadMediaCache();
      if (!findMediaItemByIdOrAlias(newState.mediaId, localMedia)) {
        fetchAndCacheMissingMediaItem(newState.mediaId).catch(() => {
          // ignore async hydration error
        });
      }
    }
  } else if (payload.eventType === 'DELETE') {
    const deletedId = payload.old?.media_id;
    if (deletedId) {
      const local = loadUserStates();
      if (local[deletedId]) {
        delete local[deletedId];
        saveUserStates(local);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('ehsaan:library-change'));
        }
      }
    }
  }
}

function handleRealtimeCustomListChange(payload: any) {
  const local = loadCustomLists();
  if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
    const newList = mapDbRowToCustomList(payload.new);
    const existingIndex = local.findIndex(l => l.id === newList.id);
    if (existingIndex >= 0) {
      local[existingIndex] = newList;
    } else {
      local.unshift(newList);
    }
    saveCustomLists(local);
  } else if (payload.eventType === 'DELETE') {
    const deletedId = payload.old?.id;
    if (deletedId) {
      const filtered = local.filter(l => l.id !== deletedId);
      saveCustomLists(filtered);
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ehsaan:library-change'));
  }
}

function handleRealtimeMediaItemChange(payload: any) {
  if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
    const newItem = mapDbRowToMediaItem(payload.new);
    const localMedia = loadMediaCache();
    const localStates = loadUserStates();
    const localLists = loadCustomLists();

    const existingIndex = localMedia.findIndex(m => m.id === newItem.id);
    if (existingIndex >= 0) {
      localMedia[existingIndex] = mergeMediaItemMetadata(localMedia[existingIndex], newItem);
      saveMediaCache(localMedia);
    } else {
      const { cleanMedia, cleanStates, cleanLists } = deduplicateMediaItemsAndStates(
        [...localMedia, newItem],
        localStates,
        localLists
      );
      saveMediaCache(cleanMedia);
      saveUserStates(cleanStates);
      saveCustomLists(cleanLists);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ehsaan:library-change'));
    }
  }
}

/**
 * Initializes global event handlers for connectivity, tab visibility/focus, and periodic background sync
 */
export function initGlobalSyncListeners(): () => void {
  const handleOnline = () => {
    updateSyncStatus({ state: 'syncing' });
    executeFullSync();
  };

  const scheduleDebouncedSync = (delayMs: number) => {
    if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
    syncDebounceTimer = setTimeout(() => {
      if (typeof navigator === 'undefined' || navigator.onLine) {
        triggerBackgroundSync(2000);
      }
    }, delayMs);
  };

  const handleFocus = () => {
    scheduleDebouncedSync(800);
  };

  const handleVisibilityChange = () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      scheduleDebouncedSync(500);
    }
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('focus', handleFocus);
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleVisibilityChange);
  }

  // Periodic background poll while tab is visible (catches missed Realtime events)
  const periodicTimer = setInterval(() => {
    if (
      typeof document !== 'undefined' &&
      document.visibilityState === 'visible' &&
      (typeof navigator === 'undefined' || navigator.onLine)
    ) {
      triggerBackgroundSync(25000);
    }
  }, 30000);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('focus', handleFocus);
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
    clearInterval(periodicTimer);
    if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
  };
}

/**
 * Forwards any recorded library change from the application to Supabase sync
 */
export function forwardChangeToSupabaseSync(entry: {
  operation: string;
  entityId: string;
  data?: any;
}): void {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    if (entry.operation === 'update_state') {
      const states = loadUserStates();
      const fullState = states[entry.entityId];
      if (fullState) {
        syncStateChangeToCloud(fullState);
      }

      // CRITICAL: Ensure the corresponding MediaItem is also uploaded to `user_media_items`
      // whenever a title is added to watchlist / watched / favorites / rated / progressed,
      // otherwise other synced devices have the state row without the media metadata!
      const media = loadMediaCache();
      const fullItem =
        findMediaItemByIdOrAlias(entry.entityId, media) ||
        (entry.data?.mediaItem && entry.data.mediaItem.id && entry.data.mediaItem.title
          ? (entry.data.mediaItem as MediaItem)
          : undefined);

      if (fullItem && (!fullState || hasStateInteraction(fullState))) {
        syncMediaItemToCloud(fullItem);
      }
    } else if (entry.operation === 'add' || entry.operation === 'update_media') {
      const media = loadMediaCache();
      const fullItem =
        findMediaItemByIdOrAlias(entry.entityId, media) ||
        (entry.data?.mediaItem && entry.data.mediaItem.id && entry.data.mediaItem.title
          ? (entry.data.mediaItem as MediaItem)
          : undefined);
      if (fullItem) {
        syncMediaItemToCloud(fullItem);
      }
    } else if (
      entry.operation === 'list_create' ||
      entry.operation === 'list_update' ||
      entry.operation === 'list_item_add' ||
      entry.operation === 'list_item_remove'
    ) {
      const lists = loadCustomLists();
      const fullList = lists.find(l => l.id === entry.entityId);
      if (fullList) {
        syncCustomListChangeToCloud(fullList);
      }

      if (entry.operation === 'list_item_add' && entry.data?.listItemId) {
        const media = loadMediaCache();
        const addedItem = findMediaItemByIdOrAlias(entry.data.listItemId, media);
        if (addedItem) {
          syncMediaItemToCloud(addedItem);
        }
      }
    } else if (entry.operation === 'list_delete') {
      syncCustomListDeletionToCloud(entry.entityId);
    }
  } catch (err) {
    console.error('Error in forwardChangeToSupabaseSync:', err);
  }
}
