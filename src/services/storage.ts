import {
  MediaItem,
  PersonalMediaState,
  CustomList,
  UserSettings,
  HomeSectionsConfig,
  DEFAULT_KEYBOARD_SHORTCUTS,
} from '../types/movie';
import {
  INITIAL_MEDIA_ITEMS,
  INITIAL_USER_STATES,
  INITIAL_CUSTOM_LISTS,
} from '../data/mockLibrary';

export const CURRENT_SCHEMA_VERSION = 2;
const MAX_BACKUP_FILE_BYTES = 10 * 1024 * 1024; // 10MB safety limit

const STORAGE_KEYS = {
  USER_STATES: 'ehsaan_user_states_v1',
  CUSTOM_LISTS: 'ehsaan_custom_lists_v1',
  MEDIA_CACHE: 'ehsaan_media_cache_v1',
  USER_SETTINGS: 'ehsaan_user_settings_v1',
};

export const DEFAULT_HOME_SECTIONS: HomeSectionsConfig = {
  showTopMovies: true,
  showTopSeries: true,
  showContinueWatching: true,
  showFavorites: true,
  showRecentlyWatched: true,
  showExplore: true,
};

export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'cream',
  backdropOpacity: 0.35,
  viewMode: 'grid',
  posterQuality: 'high',
  homeSections: DEFAULT_HOME_SECTIONS,
  imageStorageMode: 'online',
  keyboardShortcuts: DEFAULT_KEYBOARD_SHORTCUTS,
};

export interface LibraryBackupPackage {
  schemaVersion: number;
  exportedAt: string;
  app: string;
  data: {
    mediaItems: MediaItem[];
    userStates: Record<string, PersonalMediaState>;
    customLists: CustomList[];
    userSettings: UserSettings;
  };
}

export interface ImportResult {
  success: boolean;
  message: string;
  restoredCounts?: {
    mediaCount: number;
    statesCount: number;
    listsCount: number;
  };
}

export interface StorageStats {
  usedKb: number;
  totalItems: number;
  watchedCount: number;
  watchlistCount: number;
  listsCount: number;
}

// ---------------------------------------------------------------------------
// Personal Data Loaders & Savers (Safe localStorage operations)
// ---------------------------------------------------------------------------

export function loadUserStates(): Record<string, PersonalMediaState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER_STATES);
    if (!raw) {
      saveUserStates(INITIAL_USER_STATES);
      return INITIAL_USER_STATES;
    }
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : INITIAL_USER_STATES;
  } catch (err) {
    console.error('Error reading user states from storage:', err);
    return INITIAL_USER_STATES;
  }
}

export function saveUserStates(states: Record<string, PersonalMediaState>): boolean {
  try {
    localStorage.setItem(STORAGE_KEYS.USER_STATES, JSON.stringify(states));
    return true;
  } catch (err) {
    console.error('Error saving user states to storage:', err);
    return false;
  }
}

export function loadCustomLists(): CustomList[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CUSTOM_LISTS);
    if (!raw) {
      saveCustomLists(INITIAL_CUSTOM_LISTS);
      return INITIAL_CUSTOM_LISTS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_CUSTOM_LISTS;
  } catch (err) {
    console.error('Error reading custom lists:', err);
    return INITIAL_CUSTOM_LISTS;
  }
}

export function saveCustomLists(lists: CustomList[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEYS.CUSTOM_LISTS, JSON.stringify(lists));
    return true;
  } catch (err) {
    console.error('Error saving custom lists to storage:', err);
    return false;
  }
}

export function loadMediaCache(): MediaItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MEDIA_CACHE);
    if (!raw) {
      saveMediaCache(INITIAL_MEDIA_ITEMS);
      return INITIAL_MEDIA_ITEMS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_MEDIA_ITEMS;
  } catch (err) {
    console.error('Error reading media cache:', err);
    return INITIAL_MEDIA_ITEMS;
  }
}

export function saveMediaCache(items: MediaItem[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEYS.MEDIA_CACHE, JSON.stringify(items));
    return true;
  } catch (err) {
    console.error('Error saving media cache to storage:', err);
    return false;
  }
}

export function loadUserSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER_SETTINGS);
    if (!raw) {
      saveUserSettings(DEFAULT_SETTINGS);
      return DEFAULT_SETTINGS;
    }
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch (err) {
    console.error('Error reading settings from storage:', err);
    return DEFAULT_SETTINGS;
  }
}

export function saveUserSettings(settings: UserSettings): boolean {
  try {
    localStorage.setItem(STORAGE_KEYS.USER_SETTINGS, JSON.stringify(settings));
    return true;
  } catch (err) {
    console.error('Error saving settings to storage:', err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Storage Statistics (Personal Data vs Artwork)
// ---------------------------------------------------------------------------

export function getStorageStats(): StorageStats {
  try {
    let totalChars = 0;
    for (const key of Object.values(STORAGE_KEYS)) {
      const val = localStorage.getItem(key);
      if (val) totalChars += val.length;
    }
    const userStates = loadUserStates();
    const lists = loadCustomLists();
    const media = loadMediaCache();

    let watched = 0;
    let watchlist = 0;
    for (const state of Object.values(userStates)) {
      if (state.isWatched) watched++;
      if (state.inWatchlist) watchlist++;
    }

    return {
      usedKb: Math.round((totalChars * 2) / 1024), // Approx UTF-16 character byte size
      totalItems: media.length,
      watchedCount: watched,
      watchlistCount: watchlist,
      listsCount: lists.length,
    };
  } catch {
    return {
      usedKb: 0,
      totalItems: 0,
      watchedCount: 0,
      watchlistCount: 0,
      listsCount: 0,
    };
  }
}

// ---------------------------------------------------------------------------
// Versioned Compact JSON Backup Export
// ---------------------------------------------------------------------------

export function exportLibraryBackup(): string {
  const mediaItems = loadMediaCache();
  const userStates = loadUserStates();
  const customLists = loadCustomLists();
  const userSettings = loadUserSettings();

  // Sanitize media items to ensure NO base64 image data is embedded in JSON
  const sanitizedMedia: MediaItem[] = mediaItems.map(item => ({
    ...item,
    posterUrl: typeof item.posterUrl === 'string' && !item.posterUrl.startsWith('data:') ? item.posterUrl : '',
    backdropUrl: typeof item.backdropUrl === 'string' && !item.backdropUrl.startsWith('data:') ? item.backdropUrl : '',
  }));

  const backupPackage: LibraryBackupPackage = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    app: 'EHSAAN MOVIE',
    data: {
      mediaItems: sanitizedMedia,
      userStates,
      customLists,
      userSettings,
    },
  };

  return JSON.stringify(backupPackage, null, 2);
}

// ---------------------------------------------------------------------------
// Transactional, Defensive Backup Import
// ---------------------------------------------------------------------------

export function importLibraryBackup(jsonString: string): ImportResult {
  if (!jsonString || typeof jsonString !== 'string') {
    return { success: false, message: 'Invalid backup: empty content received.' };
  }

  // 1. File size check
  if (jsonString.length > MAX_BACKUP_FILE_BYTES) {
    return { success: false, message: 'Backup file exceeds maximum allowed size (10 MB).' };
  }

  // 2. Snapshot current localStorage state for rollback if write fails
  const snapshot = {
    userStates: localStorage.getItem(STORAGE_KEYS.USER_STATES),
    customLists: localStorage.getItem(STORAGE_KEYS.CUSTOM_LISTS),
    mediaCache: localStorage.getItem(STORAGE_KEYS.MEDIA_CACHE),
    userSettings: localStorage.getItem(STORAGE_KEYS.USER_SETTINGS),
  };

  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || typeof parsed !== 'object') {
      return { success: false, message: 'Invalid backup: not a valid JSON object.' };
    }

    // 3. Extract data from either v2 package or legacy v1 format
    let targetMedia: MediaItem[] = [];
    let targetStates: Record<string, PersonalMediaState> = {};
    let targetLists: CustomList[] = [];
    let targetSettings: UserSettings = DEFAULT_SETTINGS;

    if (parsed.schemaVersion === 2 && parsed.data && typeof parsed.data === 'object') {
      // Version 2 Schema
      if (Array.isArray(parsed.data.mediaItems)) {
        targetMedia = parsed.data.mediaItems.filter((m: unknown): m is MediaItem => Boolean(m && typeof m === 'object' && 'id' in m && 'title' in m));
      }
      if (parsed.data.userStates && typeof parsed.data.userStates === 'object' && !Array.isArray(parsed.data.userStates)) {
        targetStates = parsed.data.userStates;
      }
      if (Array.isArray(parsed.data.customLists)) {
        targetLists = parsed.data.customLists.filter((l: unknown): l is CustomList => Boolean(l && typeof l === 'object' && 'id' in l && 'title' in l));
      }
      if (parsed.data.userSettings && typeof parsed.data.userSettings === 'object') {
        targetSettings = { ...DEFAULT_SETTINGS, ...parsed.data.userSettings };
      }
    } else {
      // Legacy v1 Schema migration
      if (Array.isArray(parsed.mediaCache) || Array.isArray(parsed.mediaItems)) {
        targetMedia = (parsed.mediaCache || parsed.mediaItems).filter((m: unknown): m is MediaItem => Boolean(m && typeof m === 'object' && 'id' in m && 'title' in m));
      }
      if (parsed.userStates && typeof parsed.userStates === 'object' && !Array.isArray(parsed.userStates)) {
        targetStates = parsed.userStates;
      }
      if (Array.isArray(parsed.customLists)) {
        targetLists = parsed.customLists.filter((l: unknown): l is CustomList => Boolean(l && typeof l === 'object' && 'id' in l && 'title' in l));
      }
      if (parsed.userSettings && typeof parsed.userSettings === 'object') {
        targetSettings = { ...DEFAULT_SETTINGS, ...parsed.userSettings };
      }
    }

    // Ensure we keep existing media if backup has none
    if (targetMedia.length === 0) {
      targetMedia = loadMediaCache();
    }

    // 4. Perform atomic writes to localStorage
    localStorage.setItem(STORAGE_KEYS.MEDIA_CACHE, JSON.stringify(targetMedia));
    localStorage.setItem(STORAGE_KEYS.USER_STATES, JSON.stringify(targetStates));
    localStorage.setItem(STORAGE_KEYS.CUSTOM_LISTS, JSON.stringify(targetLists));
    localStorage.setItem(STORAGE_KEYS.USER_SETTINGS, JSON.stringify(targetSettings));

    // 5. Verification step
    const verifyStates = localStorage.getItem(STORAGE_KEYS.USER_STATES);
    const verifyMedia = localStorage.getItem(STORAGE_KEYS.MEDIA_CACHE);
    if (!verifyStates || !verifyMedia) {
      throw new Error('Write verification failed.');
    }

    return {
      success: true,
      message: 'Library backup successfully verified and restored.',
      restoredCounts: {
        mediaCount: targetMedia.length,
        statesCount: Object.keys(targetStates).length,
        listsCount: targetLists.length,
      },
    };
  } catch (err) {
    // 6. Rollback to snapshot on ANY error
    try {
      if (snapshot.userStates !== null) localStorage.setItem(STORAGE_KEYS.USER_STATES, snapshot.userStates);
      if (snapshot.customLists !== null) localStorage.setItem(STORAGE_KEYS.CUSTOM_LISTS, snapshot.customLists);
      if (snapshot.mediaCache !== null) localStorage.setItem(STORAGE_KEYS.MEDIA_CACHE, snapshot.mediaCache);
      if (snapshot.userSettings !== null) localStorage.setItem(STORAGE_KEYS.USER_SETTINGS, snapshot.userSettings);
    } catch {
      // ignore rollback secondary errors
    }

    return {
      success: false,
      message: err instanceof Error ? `Import failed: ${err.message}` : 'Import failed due to corrupted data.',
    };
  }
}

export function deleteAllLibraryData(): void {
  saveUserStates({});
  saveCustomLists([]);
}

export function resetLibraryToDefault(): void {
  saveUserStates(INITIAL_USER_STATES);
  saveCustomLists(INITIAL_CUSTOM_LISTS);
  saveMediaCache(INITIAL_MEDIA_ITEMS);
  saveUserSettings(DEFAULT_SETTINGS);
}
