import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  MediaItem,
  PersonalMediaState,
  CustomList,
  UserSettings,
  SeasonInfo,
  RatingTagId,
} from '../types/movie';
import {
  loadUserStates,
  saveUserStates,
  loadCustomLists,
  saveCustomLists,
  loadMediaCache,
  saveMediaCache,
  loadUserSettings,
  saveUserSettings,
  resetLibraryToDefault,
  deleteAllLibraryData,
  importLibraryBackup,
} from '../services/storage';
import {
  fetchNetflixTop10Movies,
  fetchNetflixTop10Series,
  fetchMediaDetails,
  fetchExploreRecommendations,
  getTVShowInitialMetadata,
  getCuratedExploreMediaItems,
  KNOWN_TV_SHOWS_METADATA,
} from '../data/curatedCatalog';
import { fetchDetailsWithFallback } from '../services/metadataFallback';
import {
  recordLibraryChange,
  applyRecentChanges,
  RecentChangesPackage,
} from '../services/recentChanges';
import { clearImageCache } from '../services/imageStorage';
import {
  initializeRealtimeSubscription,
  initGlobalSyncListeners,
  executeFullSync,
  syncMediaItemToCloud,
} from '../services/supabase/syncService';
import { loadSupabaseConfig } from '../services/supabase/config';
import { getCloudSession, getCloudUser, subscribeToAuthChanges } from '../services/supabase/auth';
import { normalizeDurationToSeconds } from '../services/supabase/durationUtils';
import {
  normalizeMediaTitle,
  areMediaItemsSame,
  getCanonicalKeyForItem,
  deduplicateMediaItemsAndStates,
  hasStateInteraction,
  resolveStateForMediaItem,
} from '../utils/mediaDedup';

export {
  normalizeMediaTitle,
  areMediaItemsSame,
  getCanonicalKeyForItem,
  deduplicateMediaItemsAndStates,
};

export function useMediaLibrary() {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [userStates, setUserStates] = useState<Record<string, PersonalMediaState>>({});
  const [customLists, setCustomLists] = useState<CustomList[]>([]);
  const [settings, setSettings] = useState<UserSettings>(loadUserSettings());
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize from storage & fetch live Netflix top titles + 50+ Explore titles if cache is small
  useEffect(() => {
    const loadedMedia = loadMediaCache();
    const loadedStates = loadUserStates();
    const loadedLists = loadCustomLists();
    const loadedSettings = loadUserSettings();

    // Ensure 100% pristine clean start for every user (wipe any legacy auto-seeded titles from watchlist)
    let cleanStates = loadedStates;
    const cleanStartDone = localStorage.getItem('ehsaan_clean_start_v8');
    if (!cleanStartDone) {
      cleanStates = {};
      saveUserStates({});
      saveCustomLists([]);
      try {
        localStorage.removeItem('ehsaan_change_log_entries_v1');
        localStorage.removeItem('ehsaan_change_log_counter_v1');
        localStorage.removeItem('ehsaan_change_log_checkpoint_v1');
        localStorage.removeItem('ehsaan_changelog_explicitly_cleared');
      } catch {
        // ignore
      }
      localStorage.setItem('ehsaan_clean_start_v8', 'true');
    }

    setMediaItems(loadedMedia);
    setUserStates(cleanStates);
    setCustomLists(loadedLists);
    setSettings(loadedSettings);
    document.documentElement.setAttribute('data-theme', loadedSettings.theme);
    document.documentElement.setAttribute('data-color-scheme', loadedSettings.colorScheme || 'olive');
    document.documentElement.setAttribute('data-font', loadedSettings.tweaks?.fontFamily || 'google-sans-flex');

    const initCatalog = async () => {
      let fetchedCatalog: MediaItem[] = [];
      const hasLegacyMockItems = loadedMedia.some(m => m.id === 'm-dune-2' || m.id === 'm-oppenheimer' || m.id === 'm-interstellar');

      // Fetch top Netflix titles and 50+ Explore titles if catalog has fewer than 40 items or legacy mocks
      if (!loadedMedia || loadedMedia.length < 40 || hasLegacyMockItems) {
        try {
          const [netflixMovies, netflixSeries, exploreItems] = await Promise.all([
            fetchNetflixTop10Movies(loadedSettings.tmdbApiKey),
            fetchNetflixTop10Series(loadedSettings.tmdbApiKey),
            fetchExploreRecommendations(
              loadedSettings.recommendationProvider || 'tmdb',
              loadedSettings.tmdbApiKey,
              loadedSettings.omdbApiKey
            ),
          ]);
          fetchedCatalog = [...netflixMovies, ...netflixSeries, ...exploreItems];
        } catch (err) {
          console.error('Failed to fetch live titles:', err);
        }
      }

      // CRITICAL: Re-read latest storage AFTER async network await so we NEVER overwrite
      // watchlist items/states that executeFullSync() or Realtime synced while catalog was loading!
      const latestMedia = loadMediaCache();
      const latestStates = loadUserStates();
      const latestLists = loadCustomLists();

      const uniqueMap = new Map<string, MediaItem>();
      for (const item of (latestMedia || [])) {
        if (!item.id.includes('m-dune-2') && !item.id.includes('m-oppenheimer') && !item.id.includes('m-interstellar')) {
          uniqueMap.set(item.id, item);
        }
      }
      for (const item of fetchedCatalog) {
        if (!uniqueMap.has(item.id)) {
          uniqueMap.set(item.id, item);
        }
      }

      // Auto-repair any TV series with outdated seasons metadata (e.g. Breaking Bad with 1 season)
      const repairedMedia = Array.from(uniqueMap.values()).map(item => {
        if (item.type === 'tv' && item.id) {
          const meta = getTVShowInitialMetadata(item.id);
          if (meta && (!item.seasonsCount || item.seasonsCount < meta.seasonsCount || !item.seasons)) {
            return {
              ...item,
              seasonsCount: meta.seasonsCount,
              episodesCount: meta.episodesCount,
              seasons: meta.seasons || item.seasons,
            };
          }
        }
        return item;
      });

      // Ensure all items in user states that have progress or are in watchlist exist in mediaItems
      const exploreFallbackItems = getCuratedExploreMediaItems();
      const existingIds = new Set(repairedMedia.map(m => m.id));
      for (const [stateId, st] of Object.entries(latestStates)) {
        if (!existingIds.has(stateId) && (st.inWatchlist || (st.progressPercent && st.progressPercent > 0))) {
          const found = exploreFallbackItems.find(m => m.id === stateId);
          if (found) {
            repairedMedia.push(found);
            existingIds.add(stateId);
          }
        }
      }

      const { cleanMedia, cleanStates: dedupedStates, cleanLists } = deduplicateMediaItemsAndStates(
        repairedMedia,
        latestStates,
        latestLists
      );
      saveMediaCache(cleanMedia);
      saveUserStates(dedupedStates);
      saveCustomLists(cleanLists);
      setMediaItems(cleanMedia);
      setUserStates(dedupedStates);
      setCustomLists(cleanLists);
      setIsInitialized(true);
    };

    initCatalog();
  }, []);

  // Force refresh in-memory state from storage (used after delta merge or Supabase sync)
  const refreshLibrary = useCallback(() => {
    const rawMedia = loadMediaCache();
    const rawStates = loadUserStates();
    const rawLists = loadCustomLists();
    const { cleanMedia, cleanStates: dedupedStates, cleanLists } = deduplicateMediaItemsAndStates(rawMedia, rawStates, rawLists);
    if (
      cleanMedia.length !== rawMedia.length ||
      Object.keys(dedupedStates).length !== Object.keys(rawStates).length
    ) {
      saveMediaCache(cleanMedia);
      saveUserStates(dedupedStates);
      saveCustomLists(cleanLists);
    }
    setMediaItems(cleanMedia);
    setUserStates(dedupedStates);
    setCustomLists(cleanLists);
  }, []);

  // Listen for Supabase Realtime & cloud sync events to refresh local in-memory state
  useEffect(() => {
    const handleLibraryChange = () => {
      refreshLibrary();
    };

    window.addEventListener('ehsaan:library-change', handleLibraryChange);

    // Initialize Supabase cross-device sync if user has connected their database
    const cleanupGlobalListeners = initGlobalSyncListeners();
    let cleanupRealtime = () => {};
    let cleanupAuth = () => {};

    const activateCloudSync = () => {
      const config = loadSupabaseConfig();
      if (!config) return;
      getCloudSession().then(async session => {
        const user = session?.user || (await getCloudUser());
        if (user) {
          cleanupRealtime();
          cleanupRealtime = initializeRealtimeSubscription();
          executeFullSync();
        }
      });
    };

    const attachAuthListener = () => {
      cleanupAuth();
      cleanupAuth = subscribeToAuthChanges(user => {
        if (user) {
          cleanupRealtime();
          cleanupRealtime = initializeRealtimeSubscription();
          executeFullSync();
        } else {
          cleanupRealtime();
          cleanupRealtime = () => {};
        }
      });
    };

    const handleConfigChange = () => {
      attachAuthListener();
      activateCloudSync();
    };

    window.addEventListener('ehsaan:supabase-config-change', handleConfigChange);
    attachAuthListener();
    activateCloudSync();

    return () => {
      window.removeEventListener('ehsaan:library-change', handleLibraryChange);
      window.removeEventListener('ehsaan:supabase-config-change', handleConfigChange);
      cleanupGlobalListeners();
      cleanupAuth();
      cleanupRealtime();
    };
  }, [refreshLibrary]);

  // Update theme, color scheme & font on settings change
  const updateSettings = useCallback((partial: Partial<UserSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...partial };
      saveUserSettings(updated);
      if (partial.theme) {
        document.documentElement.setAttribute('data-theme', partial.theme);
      }
      if (partial.colorScheme) {
        document.documentElement.setAttribute('data-color-scheme', partial.colorScheme);
      }
      if (updated.tweaks?.fontFamily) {
        document.documentElement.setAttribute('data-font', updated.tweaks.fontFamily);
      }
      return updated;
    });
  }, []);

  // Helper to ensure a personal state exists
  const getOrCreateState = useCallback(
    (mediaId: string, existingStates: Record<string, PersonalMediaState>): PersonalMediaState => {
      const nowIso = new Date().toISOString();
      return (
        existingStates[mediaId] || {
          mediaId,
          inWatchlist: false,
          isWatched: false,
          isFavorite: false,
          addedAt: nowIso,
          updatedAt: nowIso,
        }
      );
    },
    []
  );

  // Synchronously persist a MediaItem into local cache + React state so subsequent state calls always see it
  const upsertMediaCacheSync = useCallback((item: MediaItem): MediaItem => {
    const currentMedia = loadMediaCache();
    const match = currentMedia.find(m => areMediaItemsSame(m, item));
    let savedItem: MediaItem;
    let nextList: MediaItem[];

    if (match) {
      savedItem = { ...match, ...item, id: match.id };
      nextList = currentMedia.map(m => (m.id === match.id ? savedItem : m));
    } else {
      savedItem = item;
      nextList = [item, ...currentMedia];
    }

    saveMediaCache(nextList);
    setMediaItems(nextList);
    return savedItem;
  }, []);

  // Hydrate item with rich details using TMDB with automatic OMDb fallback
  const hydrateMediaDetails = useCallback(async (item: MediaItem) => {
    try {
      const { details } = await fetchDetailsWithFallback(item, settings.tmdbApiKey, settings.omdbApiKey);
      const meta = item.type === 'tv' && item.id ? getTVShowInitialMetadata(item.id) : undefined;
      const seasonsCount = item.type === 'tv'
        ? (details.seasonsCount || meta?.seasonsCount || item.seasonsCount || 1)
        : undefined;
      const episodesCount = item.type === 'tv'
        ? (details.episodesCount || meta?.episodesCount || item.episodesCount || 8)
        : undefined;
      const seasons = item.type === 'tv'
        ? (details.seasons || meta?.seasons || item.seasons)
        : undefined;

      const enriched: MediaItem = {
        ...item,
        ...details,
        id: item.id, // Strictly preserve original item.id to prevent key shifting and duplicate states
        imdbId: details.imdbId || item.imdbId,
        tmdbId: details.tmdbId || item.tmdbId,
        genres: details.genres || item.genres || [],
        cast: details.cast && details.cast.length > 0 ? details.cast : item.cast,
        crew: details.crew && details.crew.length > 0 ? details.crew : item.crew,
        providers: details.providers && details.providers.length > 0 ? details.providers : item.providers,
        seasonsCount,
        episodesCount,
        seasons,
      };

      const latestMedia = loadMediaCache();
      const matched = latestMedia.find(m => m.id === item.id || areMediaItemsSame(m, item));
      const finalEnriched = matched ? { ...enriched, id: matched.id } : enriched;
      const next = matched
        ? latestMedia.map(m => (m.id === matched.id ? finalEnriched : m))
        : [...latestMedia, finalEnriched];
      saveMediaCache(next);
      setMediaItems(next);

      const latestStates = loadUserStates();
      if (hasStateInteraction(latestStates[finalEnriched.id])) {
        syncMediaItemToCloud(finalEnriched);
      }

      return finalEnriched;
    } catch {
      const meta = item.type === 'tv' && item.id ? getTVShowInitialMetadata(item.id) : undefined;
      if (meta && item.type === 'tv') {
        const enriched: MediaItem = {
          ...item,
          seasonsCount: meta.seasonsCount,
          episodesCount: meta.episodesCount,
          seasons: meta.seasons || item.seasons,
        };
        return enriched;
      }
      return item;
    }
  }, [settings.omdbApiKey, settings.tmdbApiKey]);

  // Helper to resolve target MediaItem & canonicalId using both React state and localStorage cache
  const resolveTargetMediaAndId = useCallback(
    (mediaId: string, optionalItem?: MediaItem): { canonicalId: string; mediaItem?: MediaItem } => {
      const cache = loadMediaCache();
      const target =
        optionalItem ||
        mediaItems.find(m => m.id === mediaId) ||
        cache.find(m => m.id === mediaId);
      const matched = target
        ? (cache.find(m => areMediaItemsSame(m, target)) || mediaItems.find(m => areMediaItemsSame(m, target)))
        : undefined;
      const canonicalId = matched ? matched.id : mediaId;
      let mediaItem = matched || target;
      if (optionalItem && !matched) {
        mediaItem = upsertMediaCacheSync(optionalItem);
      } else if (mediaItem && !cache.some(m => m.id === mediaItem!.id)) {
        mediaItem = upsertMediaCacheSync(mediaItem);
      }
      return { canonicalId, mediaItem };
    },
    [mediaItems, upsertMediaCacheSync]
  );

  // Toggle Watchlist with comprehensive deduplication & guaranteed media-item + state cloud sync
  const toggleWatchlist = useCallback((mediaId: string, optionalItem?: MediaItem) => {
    const { canonicalId, mediaItem } = resolveTargetMediaAndId(mediaId, optionalItem);
    const prev = loadUserStates();
    const current = getOrCreateState(canonicalId, prev);
    const nextWatchlist = !current.inWatchlist;
    const nowIso = new Date().toISOString();

    const updatedState: PersonalMediaState = {
      ...current,
      mediaId: canonicalId,
      inWatchlist: nextWatchlist,
      updatedAt: nowIso,
    };

    const updated: Record<string, PersonalMediaState> = {
      ...prev,
      [canonicalId]: updatedState,
    };

    if (mediaId !== canonicalId) {
      updated[mediaId] = {
        ...getOrCreateState(mediaId, prev),
        mediaId,
        inWatchlist: nextWatchlist,
        updatedAt: nowIso,
      };
    }

    saveUserStates(updated);
    setUserStates(updated);
    recordLibraryChange('update_state', canonicalId, {
      state: updatedState,
      mediaItem,
    });
  }, [getOrCreateState, resolveTargetMediaAndId]);

  // Quick action: Remove from Watchlist
  const removeFromWatchlist = useCallback((mediaId: string) => {
    const cache = loadMediaCache();
    const allMedia = cache.length > 0 ? cache : mediaItems;
    const target = allMedia.find(m => m.id === mediaId);
    const targetImdbId = target?.imdbId;
    const targetTmdbId = target?.tmdbId;
    const targetTitleKey = target
      ? `${target.type || 'movie'}-${normalizeMediaTitle(target.title)}-${target.year}`
      : null;

    const prev = loadUserStates();
    const updated = { ...prev };
    const nowIso = new Date().toISOString();
    const touchedIds: string[] = [];

    for (const key of Object.keys(updated)) {
      const item = allMedia.find(m => m.id === key);
      const matchesId = key === mediaId;
      const matchesImdb = !!(targetImdbId && item?.imdbId === targetImdbId);
      const matchesTmdb = !!(targetTmdbId && item?.tmdbId === targetTmdbId);
      const matchesTitle = !!(
        targetTitleKey &&
        item &&
        `${item.type || 'movie'}-${normalizeMediaTitle(item.title)}-${item.year}` === targetTitleKey
      );

      if (matchesId || matchesImdb || matchesTmdb || matchesTitle) {
        updated[key] = {
          ...updated[key],
          inWatchlist: false,
          isWatched: false,
          progressPercent: 0,
          updatedAt: nowIso,
        };
        touchedIds.push(key);
      }
    }

    saveUserStates(updated);
    setUserStates(updated);

    const idsToSync = touchedIds.length > 0 ? touchedIds : [mediaId];
    for (const id of idsToSync) {
      recordLibraryChange('update_state', id, {
        state: { inWatchlist: false, isWatched: false, progressPercent: 0, updatedAt: nowIso },
        mediaItem: target,
      });
    }
  }, [mediaItems]);

  // Quick action: Dismiss from Continue Watching
  const dismissFromWatching = useCallback((mediaId: string) => {
    const { canonicalId, mediaItem } = resolveTargetMediaAndId(mediaId);
    const prev = loadUserStates();
    const current = getOrCreateState(canonicalId, prev);
    const nowIso = new Date().toISOString();

    const updatedState: PersonalMediaState = {
      ...current,
      mediaId: canonicalId,
      progressPercent: 0,
      updatedAt: nowIso,
      tvProgress: current.tvProgress
        ? {
            ...current.tvProgress,
            completedEpisodes: {},
          }
        : undefined,
    };

    const updated = {
      ...prev,
      [canonicalId]: updatedState,
    };
    saveUserStates(updated);
    setUserStates(updated);
    recordLibraryChange('update_state', canonicalId, {
      state: { progressPercent: 0, updatedAt: nowIso },
      mediaItem,
    });
  }, [getOrCreateState, resolveTargetMediaAndId]);

  // Build complete episode map consistently across markWatched & toggleWatched
  const buildCompletedTVProgress = useCallback((mediaItem?: MediaItem) => {
    if (!mediaItem || mediaItem.type !== 'tv') return undefined;
    const knownMeta = mediaItem.id ? KNOWN_TV_SHOWS_METADATA[mediaItem.id] : undefined;
    const seasonsList = mediaItem.seasons && mediaItem.seasons.length > 0 ? mediaItem.seasons : knownMeta?.seasons;
    const seasons = Math.max(mediaItem.seasonsCount || 0, knownMeta?.seasonsCount || 0, seasonsList?.length || 0, 1);
    const totalEp = Math.max(
      mediaItem.episodesCount || 0,
      knownMeta?.episodesCount || 0,
      seasonsList?.reduce((acc: number, s: SeasonInfo) => acc + (s.episodeCount || 0), 0) || 0,
      seasons * 8
    );
    const epPerSeason = Math.ceil(totalEp / seasons);
    const completedEpisodes: Record<string, boolean> = {};
    let lastSeasonEpCount = epPerSeason;

    for (let s = 1; s <= seasons; s++) {
      const sCount = seasonsList?.find((sn: SeasonInfo) => sn.seasonNumber === s)?.episodeCount || epPerSeason;
      if (s === seasons) lastSeasonEpCount = sCount;
      for (let e = 1; e <= sCount; e++) {
        completedEpisodes[`s${s}e${e}`] = true;
      }
    }

    return {
      currentSeason: seasons,
      currentEpisode: lastSeasonEpCount,
      completedEpisodes,
    };
  }, []);

  // Quick action: Mark Watching / In Progress
  const markWatching = useCallback((mediaId: string, optionalItem?: MediaItem) => {
    const { canonicalId, mediaItem } = resolveTargetMediaAndId(mediaId, optionalItem);
    const prev = loadUserStates();
    const current = getOrCreateState(canonicalId, prev);
    const nextProgress = (current.progressPercent && current.progressPercent > 0 && current.progressPercent < 100)
      ? current.progressPercent
      : 50;
    const nowIso = new Date().toISOString();

    const updatedState: PersonalMediaState = {
      ...current,
      mediaId: canonicalId,
      inWatchlist: true,
      isWatched: false,
      progressPercent: nextProgress,
      lastWatchedAt: nowIso,
      updatedAt: nowIso,
    };

    const updated: Record<string, PersonalMediaState> = {
      ...prev,
      [canonicalId]: updatedState,
    };
    if (mediaId !== canonicalId && prev[mediaId]) {
      updated[mediaId] = { ...updatedState, mediaId };
    }
    saveUserStates(updated);
    setUserStates(updated);
    recordLibraryChange('update_state', canonicalId, {
      state: updatedState,
      mediaItem,
    });
  }, [getOrCreateState, resolveTargetMediaAndId]);

  // Quick action: Mark Watched (100%)
  const markWatched = useCallback((mediaId: string, optionalItem?: MediaItem) => {
    const { canonicalId, mediaItem } = resolveTargetMediaAndId(mediaId, optionalItem);
    const prev = loadUserStates();
    const current = getOrCreateState(canonicalId, prev);
    const nextTvProgress = mediaItem?.type === 'tv'
      ? buildCompletedTVProgress(mediaItem)
      : current.tvProgress;

    const nowIso = new Date().toISOString();
    const updatedState: PersonalMediaState = {
      ...current,
      mediaId: canonicalId,
      isWatched: true,
      progressPercent: 100,
      lastWatchedAt: nowIso,
      updatedAt: nowIso,
      tvProgress: nextTvProgress,
    };

    const updated: Record<string, PersonalMediaState> = {
      ...prev,
      [canonicalId]: updatedState,
    };
    if (mediaId !== canonicalId && prev[mediaId]) {
      updated[mediaId] = { ...updatedState, mediaId };
    }
    saveUserStates(updated);
    setUserStates(updated);
    recordLibraryChange('update_state', canonicalId, {
      state: updatedState,
      mediaItem,
    });
  }, [buildCompletedTVProgress, getOrCreateState, resolveTargetMediaAndId]);

  // Toggle Watched - Unwatched -> Watched (100%), Watching -> Watched (100%), Watched -> Unwatched (0%)
  const toggleWatched = useCallback((mediaId: string, optionalItem?: MediaItem) => {
    const { canonicalId, mediaItem } = resolveTargetMediaAndId(mediaId, optionalItem);
    const prev = loadUserStates();
    const current = getOrCreateState(canonicalId, prev);
    const isWatched = !!current.isWatched;
    const isWatching = !isWatched && (current.progressPercent || 0) > 0;

    let nextIsWatched = false;
    let nextProgressPercent = 0;
    let nextTvProgress = current.tvProgress;

    if (!isWatched || isWatching) {
      nextIsWatched = true;
      nextProgressPercent = 100;
      if (mediaItem?.type === 'tv') {
        nextTvProgress = buildCompletedTVProgress(mediaItem);
      }
    } else {
      nextIsWatched = false;
      nextProgressPercent = 0;
      if (mediaItem?.type === 'tv') {
        nextTvProgress = {
          currentSeason: 1,
          currentEpisode: 1,
          completedEpisodes: {},
        };
      }
    }

    const nowIso = new Date().toISOString();
    const updatedState: PersonalMediaState = {
      ...current,
      mediaId: canonicalId,
      isWatched: nextIsWatched,
      progressPercent: nextProgressPercent,
      lastWatchedAt: nowIso,
      updatedAt: nowIso,
      tvProgress: nextTvProgress,
    };

    const updated: Record<string, PersonalMediaState> = {
      ...prev,
      [canonicalId]: updatedState,
    };
    if (mediaId !== canonicalId && prev[mediaId]) {
      updated[mediaId] = { ...updatedState, mediaId };
    }
    saveUserStates(updated);
    setUserStates(updated);
    recordLibraryChange('update_state', canonicalId, {
      state: updatedState,
      mediaItem,
    });
  }, [buildCompletedTVProgress, getOrCreateState, resolveTargetMediaAndId]);

  // Toggle Favorite
  const toggleFavorite = useCallback((mediaId: string, optionalItem?: MediaItem) => {
    const { canonicalId, mediaItem } = resolveTargetMediaAndId(mediaId, optionalItem);
    const prev = loadUserStates();
    const current = getOrCreateState(canonicalId, prev);
    const nextFavorite = !current.isFavorite;
    const nowIso = new Date().toISOString();

    const updatedState: PersonalMediaState = {
      ...current,
      mediaId: canonicalId,
      isFavorite: nextFavorite,
      favoritedAt: nextFavorite ? nowIso : undefined,
      updatedAt: nowIso,
    };

    const updated: Record<string, PersonalMediaState> = {
      ...prev,
      [canonicalId]: updatedState,
    };
    if (mediaId !== canonicalId && prev[mediaId]) {
      updated[mediaId] = { ...updatedState, mediaId };
    }
    saveUserStates(updated);
    setUserStates(updated);
    recordLibraryChange('update_state', canonicalId, {
      state: updatedState,
      mediaItem,
    });
  }, [getOrCreateState, resolveTargetMediaAndId]);

  // Set Personal Rating & Rating Tag
  const setPersonalRating = useCallback((mediaId: string, rating: number | undefined, ratingTag?: RatingTagId, optionalItem?: MediaItem) => {
    const { canonicalId, mediaItem } = resolveTargetMediaAndId(mediaId, optionalItem);
    const prev = loadUserStates();
    const current = getOrCreateState(canonicalId, prev);
    const nowIso = new Date().toISOString();

    const updatedState: PersonalMediaState = {
      ...current,
      mediaId: canonicalId,
      personalRating: rating,
      ratingTag: ratingTag,
      updatedAt: nowIso,
    };

    const updated: Record<string, PersonalMediaState> = {
      ...prev,
      [canonicalId]: updatedState,
    };
    if (mediaId !== canonicalId && prev[mediaId]) {
      updated[mediaId] = { ...updatedState, mediaId };
    }
    saveUserStates(updated);
    setUserStates(updated);
    recordLibraryChange('update_state', canonicalId, {
      state: updatedState,
      mediaItem,
    });
  }, [getOrCreateState, resolveTargetMediaAndId]);

  // Set Personal Notes
  const setNotes = useCallback((mediaId: string, notes: string, optionalItem?: MediaItem) => {
    const { canonicalId, mediaItem } = resolveTargetMediaAndId(mediaId, optionalItem);
    const prev = loadUserStates();
    const current = getOrCreateState(canonicalId, prev);
    const nowIso = new Date().toISOString();

    const updatedState: PersonalMediaState = {
      ...current,
      mediaId: canonicalId,
      notes,
      updatedAt: nowIso,
    };

    const updated: Record<string, PersonalMediaState> = {
      ...prev,
      [canonicalId]: updatedState,
    };
    if (mediaId !== canonicalId && prev[mediaId]) {
      updated[mediaId] = { ...updatedState, mediaId };
    }
    saveUserStates(updated);
    setUserStates(updated);
    recordLibraryChange('update_state', canonicalId, {
      state: updatedState,
      mediaItem,
    });
  }, [getOrCreateState, resolveTargetMediaAndId]);

  // Set Progress (0 - 100%)
  const setProgress = useCallback((mediaId: string, progressPercent: number, optionalItem?: MediaItem) => {
    const { canonicalId, mediaItem } = resolveTargetMediaAndId(mediaId, optionalItem);
    const prev = loadUserStates();
    const current = getOrCreateState(canonicalId, prev);
    const isComplete = progressPercent >= 95;
    let nextTvProgress = current.tvProgress;

    if (mediaItem && mediaItem.type === 'tv') {
      const knownMeta = mediaItem.id ? KNOWN_TV_SHOWS_METADATA[mediaItem.id] : undefined;
      const seasons = Math.max(mediaItem.seasonsCount || 0, knownMeta?.seasonsCount || 0, 1);
      const seasonsList = mediaItem.seasons || knownMeta?.seasons;
      const totalEp = seasonsList && seasonsList.length > 0
        ? seasonsList.reduce((acc: number, s: SeasonInfo) => acc + (s.episodeCount || 0), 0)
        : Math.max(mediaItem.episodesCount || 0, knownMeta?.episodesCount || 0, seasons * 8);

      const epPerSeason = Math.ceil(totalEp / seasons);
      const targetCompletedCount = Math.round((progressPercent / 100) * totalEp);
      const newCompleted: Record<string, boolean> = {};

      let count = 0;
      let lastSeason = 1;
      let lastEp = 1;
      for (let s = 1; s <= seasons; s++) {
        const sCount = seasonsList?.find((sn: SeasonInfo) => sn.seasonNumber === s)?.episodeCount || epPerSeason;
        for (let e = 1; e <= sCount; e++) {
          if (count < targetCompletedCount) {
            newCompleted[`s${s}e${e}`] = true;
            lastSeason = s;
            lastEp = e;
            count++;
          }
        }
      }

      nextTvProgress = {
        currentSeason: lastSeason,
        currentEpisode: lastEp,
        completedEpisodes: newCompleted,
      };
    }

    const nextWatched = isComplete ? true : false;
    const inWatchlist = progressPercent > 0 ? true : current.inWatchlist;
    const nowIso = new Date().toISOString();

    const updatedState: PersonalMediaState = {
      ...current,
      mediaId: canonicalId,
      progressPercent,
      isWatched: nextWatched,
      inWatchlist,
      lastWatchedAt: nowIso,
      updatedAt: nowIso,
      tvProgress: nextTvProgress,
    };

    const updated = {
      ...prev,
      [canonicalId]: updatedState,
    };
    saveUserStates(updated);
    setUserStates(updated);
    recordLibraryChange('update_state', canonicalId, {
      state: updatedState,
      mediaItem,
    });
  }, [getOrCreateState, resolveTargetMediaAndId]);

  // Toggle Episode for TV series - Calculates overall series progress directly from episode checks
  const toggleTVEpisode = useCallback(
    (mediaId: string, season: number, episode: number, optionalItem?: MediaItem) => {
      const { canonicalId, mediaItem } = resolveTargetMediaAndId(mediaId, optionalItem);
      const prev = loadUserStates();
      const current = getOrCreateState(canonicalId, prev);
      const epKey = `s${season}e${episode}`;
      const tvProgress = current.tvProgress || {
        currentSeason: season,
        currentEpisode: episode,
        completedEpisodes: {},
      };

      const currentlyDone = !tvProgress.completedEpisodes[epKey];
      const nextCompleted = {
        ...tvProgress.completedEpisodes,
        [epKey]: currentlyDone,
      };

      const knownMeta = mediaItem?.id ? KNOWN_TV_SHOWS_METADATA[mediaItem.id] : undefined;
      const seasonsList = mediaItem?.seasons || knownMeta?.seasons;
      const totalSeasons = Math.max(mediaItem?.seasonsCount || 0, knownMeta?.seasonsCount || 0, seasonsList?.length || 0, 1);
      const totalEpisodes = seasonsList && seasonsList.length > 0
        ? seasonsList.reduce((acc: number, s: SeasonInfo) => acc + (s.episodeCount || 0), 0)
        : Math.max(mediaItem?.episodesCount || 0, knownMeta?.episodesCount || 0, totalSeasons * 8);

      const completedCount = Object.values(nextCompleted).filter(Boolean).length;
      const calculatedProgress = Math.min(100, Math.round((completedCount / Math.max(1, totalEpisodes)) * 100));

      const isAllDone = totalEpisodes > 1
        ? completedCount >= totalEpisodes
        : (completedCount > 0 && totalEpisodes === 1 && totalSeasons === 1);

      const nextProgress = isAllDone ? 100 : Math.min(99, Math.max(calculatedProgress, completedCount > 0 ? 5 : 0));
      const inWatchlist = completedCount > 0 ? true : current.inWatchlist;
      const nowIso = new Date().toISOString();

      const updatedState: PersonalMediaState = {
        ...current,
        mediaId: canonicalId,
        progressPercent: nextProgress,
        isWatched: isAllDone,
        inWatchlist,
        lastWatchedAt: nowIso,
        updatedAt: nowIso,
        tvProgress: {
          currentSeason: season,
          currentEpisode: episode,
          completedEpisodes: nextCompleted,
        },
      };

      const updated: Record<string, PersonalMediaState> = {
        ...prev,
        [canonicalId]: updatedState,
      };

      if (mediaId !== canonicalId) {
        updated[mediaId] = {
          ...getOrCreateState(mediaId, prev),
          ...updatedState,
          mediaId,
        };
      }

      saveUserStates(updated);
      setUserStates(updated);
      recordLibraryChange('update_state', canonicalId, {
        state: updatedState,
        mediaItem,
      });
    },
    [getOrCreateState, resolveTargetMediaAndId]
  );

  // Toggle All Season Episodes for TV Series
  const toggleSeasonEpisodes = useCallback(
    (mediaId: string, season: number, episodeNumbers: number[], forceMarkDone: boolean, optionalItem?: MediaItem) => {
      const { canonicalId, mediaItem } = resolveTargetMediaAndId(mediaId, optionalItem);
      const prev = loadUserStates();
      const current = getOrCreateState(canonicalId, prev);
      const knownMeta = mediaItem?.id ? KNOWN_TV_SHOWS_METADATA[mediaItem.id] : undefined;
      const seasonsList = mediaItem?.seasons || knownMeta?.seasons;
      const totalSeasons = Math.max(mediaItem?.seasonsCount || 0, knownMeta?.seasonsCount || 0, seasonsList?.length || 0, 1);
      const totalEpisodes = seasonsList && seasonsList.length > 0
        ? seasonsList.reduce((acc: number, s: SeasonInfo) => acc + (s.episodeCount || 0), 0)
        : Math.max(mediaItem?.episodesCount || 0, knownMeta?.episodesCount || 0, totalSeasons * 8);

      const tvProgress = current.tvProgress || {
        currentSeason: season,
        currentEpisode: 1,
        completedEpisodes: {},
      };

      const nextCompleted = {
        ...tvProgress.completedEpisodes,
      };

      for (const ep of episodeNumbers) {
        const epKey = `s${season}e${ep}`;
        if (forceMarkDone) {
          nextCompleted[epKey] = true;
        } else {
          delete nextCompleted[epKey];
        }
      }

      const completedCount = Object.values(nextCompleted).filter(Boolean).length;
      const calculatedProgress = Math.min(100, Math.round((completedCount / Math.max(1, totalEpisodes)) * 100));

      const isAllDone = totalEpisodes > 1
        ? completedCount >= totalEpisodes
        : (completedCount > 0 && totalEpisodes === 1 && totalSeasons === 1);

      const nextProgress = isAllDone ? 100 : Math.min(99, Math.max(calculatedProgress, completedCount > 0 ? 5 : 0));
      const inWatchlist = completedCount > 0 ? true : current.inWatchlist;
      const nowIso = new Date().toISOString();

      const updatedState: PersonalMediaState = {
        ...current,
        mediaId: canonicalId,
        progressPercent: nextProgress,
        isWatched: isAllDone,
        inWatchlist,
        lastWatchedAt: nowIso,
        updatedAt: nowIso,
        tvProgress: {
          currentSeason: season,
          currentEpisode: episodeNumbers[episodeNumbers.length - 1] || 1,
          completedEpisodes: nextCompleted,
        },
      };

      const updated: Record<string, PersonalMediaState> = {
        ...prev,
        [canonicalId]: updatedState,
      };

      if (mediaId !== canonicalId) {
        updated[mediaId] = {
          ...getOrCreateState(mediaId, prev),
          ...updatedState,
          mediaId,
        };
      }

      saveUserStates(updated);
      setUserStates(updated);
      recordLibraryChange('update_state', canonicalId, {
        state: updatedState,
        mediaItem,
      });
    },
    [getOrCreateState, resolveTargetMediaAndId]
  );

  // Custom Lists Management (synchronous storage & change-log updates outside React state updaters)
  const createCustomList = useCallback(
    (title: string, description?: string, colorTag?: string) => {
      const nowIso = new Date().toISOString();
      const newList: CustomList = {
        id: `list-${Date.now()}`,
        title: title.trim(),
        description: description?.trim(),
        createdAt: nowIso,
        updatedAt: nowIso,
        itemIds: [],
        colorTag: colorTag || '#4E562F',
      };
      const prev = loadCustomLists();
      const next = [newList, ...prev];
      saveCustomLists(next);
      setCustomLists(next);
      recordLibraryChange('list_create', newList.id, { list: newList });
      return newList;
    },
    []
  );

  const updateCustomList = useCallback(
    (id: string, title: string, description?: string, colorTag?: string) => {
      const prev = loadCustomLists();
      const nowIso = new Date().toISOString();
      const next = prev.map(list => {
        if (list.id !== id) return list;
        return {
          ...list,
          title: title.trim(),
          description: description?.trim(),
          colorTag: colorTag || list.colorTag,
          updatedAt: nowIso,
          isAiGenerated: false,
          aiLabel: undefined,
        };
      });
      saveCustomLists(next);
      setCustomLists(next);
      recordLibraryChange('list_update', id, {
        list: { title: title.trim(), description: description?.trim(), colorTag },
      });
    },
    []
  );

  const deleteCustomList = useCallback((id: string) => {
    const prev = loadCustomLists();
    const next = prev.filter(l => l.id !== id);
    saveCustomLists(next);
    setCustomLists(next);
    recordLibraryChange('list_delete', id);
  }, []);

  const addItemToList = useCallback((listId: string, mediaId: string, optionalItem?: MediaItem) => {
    const { canonicalId, mediaItem } = resolveTargetMediaAndId(mediaId, optionalItem);
    const prev = loadCustomLists();
    const nowIso = new Date().toISOString();
    let changed = false;

    const next = prev.map(list => {
      if (list.id !== listId) return list;
      if (list.itemIds.includes(canonicalId) || list.itemIds.includes(mediaId)) return list;
      changed = true;
      return {
        ...list,
        itemIds: [...list.itemIds, canonicalId],
        updatedAt: nowIso,
      };
    });

    if (changed) {
      saveCustomLists(next);
      setCustomLists(next);
      recordLibraryChange('list_item_add', listId, { listItemId: canonicalId, mediaItem });
    }
  }, [resolveTargetMediaAndId]);

  const removeItemFromList = useCallback((listId: string, mediaId: string) => {
    const currentMedia = loadMediaCache();
    const { canonicalId, mediaItem } = resolveTargetMediaAndId(mediaId);
    const matchedItem = mediaItem || currentMedia.find(m => m.id === mediaId);
    const aliasIds = new Set<string>([mediaId, canonicalId]);
    if (matchedItem) {
      aliasIds.add(matchedItem.id);
      if (matchedItem.imdbId) aliasIds.add(matchedItem.imdbId);
      if (matchedItem.tmdbId) aliasIds.add(`tmdb-${matchedItem.type || 'movie'}-${matchedItem.tmdbId}`);
    }

    const prev = loadCustomLists();
    const nowIso = new Date().toISOString();
    let changed = false;

    const next = prev.map(list => {
      if (list.id !== listId) return list;
      const filteredIds = list.itemIds.filter(id => !aliasIds.has(id));
      if (filteredIds.length !== list.itemIds.length) {
        changed = true;
      }
      return {
        ...list,
        itemIds: filteredIds,
        updatedAt: nowIso,
      };
    });

    if (changed) {
      saveCustomLists(next);
      setCustomLists(next);
      recordLibraryChange('list_item_remove', listId, { listItemId: canonicalId, mediaItem: matchedItem });
    }
  }, [resolveTargetMediaAndId]);

  // Add new media to cache synchronously (e.g. from search or exploration) without creating duplicates
  const addMediaToLibrary = useCallback((item: MediaItem) => {
    const savedItem = upsertMediaCacheSync(item);
    const latestStates = loadUserStates();
    if (hasStateInteraction(latestStates[savedItem.id])) {
      syncMediaItemToCloud(savedItem);
    }
  }, [upsertMediaCacheSync]);

  // Delete media entity from library
  const deleteMediaItem = useCallback((mediaId: string) => {
    const currentMedia = loadMediaCache();
    const currentStates = loadUserStates();
    const currentLists = loadCustomLists();
    const target = currentMedia.find(m => m.id === mediaId) || mediaItems.find(m => m.id === mediaId);

    const isMatch = (m: MediaItem) => m.id === mediaId || (target ? areMediaItemsSame(m, target) : false);
    const matchedIds = new Set<string>([mediaId]);
    for (const m of currentMedia) {
      if (isMatch(m)) {
        matchedIds.add(m.id);
        if (m.imdbId) matchedIds.add(m.imdbId);
        if (m.tmdbId) matchedIds.add(`tmdb-${m.type || 'movie'}-${m.tmdbId}`);
      }
    }

    const nextMedia = currentMedia.filter(m => !matchedIds.has(m.id) && !isMatch(m));
    const nextStates = { ...currentStates };
    for (const key of Object.keys(nextStates)) {
      if (matchedIds.has(key)) {
        delete nextStates[key];
      }
    }
    const nextLists = currentLists.map(l => ({
      ...l,
      itemIds: l.itemIds.filter(id => !matchedIds.has(id)),
    }));

    saveMediaCache(nextMedia);
    saveUserStates(nextStates);
    saveCustomLists(nextLists);
    setMediaItems(nextMedia);
    setUserStates(nextStates);
    setCustomLists(nextLists);
    recordLibraryChange('delete', target?.id || mediaId);
  }, [mediaItems]);

  // Import Recent Changes (Non-destructive MERGE into current library)
  const importRecentChanges = useCallback((pkg: RecentChangesPackage) => {
    const result = applyRecentChanges(pkg);
    if (result.success) {
      setMediaItems(loadMediaCache());
      setUserStates(loadUserStates());
      setCustomLists(loadCustomLists());
    }
    return result;
  }, []);

  // Calculate Statistics cleanly and accurately
  const stats = useMemo(() => {
    let moviesCount = 0;
    let seriesCount = 0;
    let watchedCount = 0;
    let watchlistCount = 0;
    let favoritesCount = 0;
    let inProgressCount = 0;
    let totalMinutes = 0;
    const seenTitles = new Set<string>();

    for (const item of mediaItems) {
      const normTitle = (item.title || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      const dedupKey = normTitle ? `${normTitle}_${item.year || ''}` : item.id;
      if (seenTitles.has(dedupKey)) continue;
      seenTitles.add(dedupKey);

      if (item.type === 'movie') moviesCount++;
      if (item.type === 'tv') seriesCount++;

      const state = resolveStateForMediaItem(item, userStates) || userStates[item.id];
      if (state) {
        if (state.inWatchlist) watchlistCount++;
        if (state.isFavorite) favoritesCount++;

        // In-progress counter
        if (
          !state.isWatched &&
          state.progressPercent !== undefined &&
          state.progressPercent > 0 &&
          state.progressPercent < 100
        ) {
          inProgressCount++;
        }

        // Determine item's baseline runtime in minutes safely
        let itemRuntimeMinutes = 0;
        if (item.runtime !== undefined && item.runtime !== null) {
          if (typeof item.runtime === 'number' && !isNaN(item.runtime) && item.runtime > 0) {
            // Values > 600 are stored in seconds (e.g. 5400 = 90 min)
            itemRuntimeMinutes = item.runtime > 600 ? Math.round(item.runtime / 60) : Math.round(item.runtime);
          } else if (typeof item.runtime === 'string') {
            const parsedSeconds = normalizeDurationToSeconds(item.runtime);
            if (parsedSeconds && parsedSeconds > 0) {
              itemRuntimeMinutes = Math.round(parsedSeconds / 60);
            } else {
              const match = (item.runtime as string).match(/(\d+)/);
              if (match) {
                const val = parseInt(match[1], 10);
                if (!isNaN(val) && val > 0) {
                  itemRuntimeMinutes = val > 600 ? Math.round(val / 60) : val;
                }
              }
            }
          }
        }

        if (item.type === 'movie') {
          // Standard movie duration fallback if metadata lacked runtime: 100 minutes
          const movieMinutes = itemRuntimeMinutes > 0 ? itemRuntimeMinutes : 100;

          if (state.isWatched) {
            watchedCount++;
            totalMinutes += movieMinutes;
          } else if (state.progressPercent && state.progressPercent > 0) {
            // Include watch time for in-progress movies
            totalMinutes += Math.round((movieMinutes * Math.min(100, state.progressPercent)) / 100);
          }
        } else {
          // TV Series / Multi-episode media
          const avgEpisodeMinutes = itemRuntimeMinutes > 0 ? itemRuntimeMinutes : 45;
          const totalEpisodes =
            item.episodesCount ||
            (item.seasons ? item.seasons.reduce((acc, s) => acc + (s.episodeCount || 0), 0) : 0) ||
            (item.seasonsCount ? item.seasonsCount * 10 : 0) ||
            8;

          if (state.isWatched) {
            watchedCount++;
            totalMinutes += totalEpisodes * avgEpisodeMinutes;
          } else {
            // Count completed episodes if user tracked individual episodes
            const completedEpisodesCount = state.tvProgress?.completedEpisodes
              ? Object.values(state.tvProgress.completedEpisodes).filter(Boolean).length
              : 0;

            if (completedEpisodesCount > 0) {
              totalMinutes += completedEpisodesCount * avgEpisodeMinutes;
            } else if (state.progressPercent && state.progressPercent > 0) {
              // Fallback for TV series with general progress percentage
              const totalSeriesMinutes = totalEpisodes * avgEpisodeMinutes;
              totalMinutes += Math.round((totalSeriesMinutes * Math.min(100, state.progressPercent)) / 100);
            }
          }
        }
      }
    }

    const safeTotalMinutes = Math.max(0, Math.round(totalMinutes));
    const totalHours = Math.floor(safeTotalMinutes / 60);
    const remainingMinutes = safeTotalMinutes % 60;

    let formattedWatchTime = '';
    if (totalHours > 0) {
      formattedWatchTime = remainingMinutes > 0 ? `${totalHours}h ${remainingMinutes}m` : `${totalHours} ${totalHours === 1 ? 'hr' : 'hrs'}`;
    } else if (safeTotalMinutes > 0) {
      formattedWatchTime = `${safeTotalMinutes} min`;
    }

    return {
      moviesCount,
      seriesCount,
      watchedCount,
      watchlistCount,
      favoritesCount,
      inProgressCount,
      totalMinutes: safeTotalMinutes,
      totalHours,
      remainingMinutes,
      formattedWatchTime,
    };
  }, [mediaItems, userStates]);

  // Random item picker (strictly prefers unwatched titles)
  const getRandomItem = useCallback(
    (predicate?: (item: MediaItem) => boolean): MediaItem | null => {
      const basePool = predicate ? mediaItems.filter(predicate) : mediaItems;
      if (basePool.length === 0) return null;
      const unwatched = basePool.filter(i => !resolveStateForMediaItem(i, userStates)?.isWatched);
      const pool = unwatched.length > 0 ? unwatched : basePool;
      const index = Math.floor(Math.random() * pool.length);
      return pool[index];
    },
    [mediaItems, userStates]
  );

  // Delete All Data action (complete purge of all stored titles, watchlists, and image caches)
  const deleteAllData = useCallback(async () => {
    deleteAllLibraryData();
    setUserStates({});
    setCustomLists([]);
    setMediaItems([]);
    saveMediaCache([]);
    await clearImageCache();
    try {
      localStorage.removeItem('ehsaan_change_log_entries_v1');
      localStorage.removeItem('ehsaan_change_log_counter_v1');
      localStorage.removeItem('ehsaan_change_log_checkpoint_v1');
      localStorage.removeItem('ehsaan_changelog_explicitly_cleared');
    } catch {
      // ignore
    }
  }, []);

  // Safely clears image cache and all un-saved discovery titles from media cache
  const clearCachedTitlesAndImages = useCallback(async () => {
    await clearImageCache();
    // Keep only titles that the user actively has in their personal states or custom lists
    const currentStates = loadUserStates();
    const currentMedia = loadMediaCache();
    const currentLists = loadCustomLists();
    const listItemIdSet = new Set(currentLists.flatMap(l => l.itemIds || []));

    const keptMedia = currentMedia.filter(m => {
      const st = resolveStateForMediaItem(m, currentStates);
      if (hasStateInteraction(st)) return true;
      if (listItemIdSet.has(m.id)) return true;
      if (m.imdbId && listItemIdSet.has(m.imdbId)) return true;
      if (m.tmdbId && listItemIdSet.has(`tmdb-${m.type || 'movie'}-${m.tmdbId}`)) return true;
      return false;
    });
    saveMediaCache(keptMedia);
    setMediaItems(keptMedia);
    return true;
  }, []);

  // Reset to seed demo state
  const resetAll = useCallback(async () => {
    resetLibraryToDefault();
    const [netflixMovies, netflixSeries] = await Promise.all([
      fetchNetflixTop10Movies(settings.tmdbApiKey),
      fetchNetflixTop10Series(settings.tmdbApiKey),
    ]);
    const liveMedia = [...netflixMovies, ...netflixSeries];
    setMediaItems(liveMedia);
    saveMediaCache(liveMedia);
    setUserStates({});
    setCustomLists([]);
    setSettings(loadUserSettings());
  }, [settings.tmdbApiKey]);

  const restoreBackup = useCallback((jsonStr: string) => {
    const result = importLibraryBackup(jsonStr);
    if (result.success) {
      setMediaItems(loadMediaCache());
      setUserStates(loadUserStates());
      setCustomLists(loadCustomLists());
      const loadedSettings = loadUserSettings();
      setSettings(loadedSettings);
      document.documentElement.setAttribute('data-theme', loadedSettings.theme);
    }
    return result;
  }, []);

  // One-click action: Reload all movies/series album art and banners
  const reloadAllArtwork = useCallback(
    async (onProgress?: (count: number, total: number) => void) => {
      const current = loadMediaCache();
      const total = current.length;
      let updatedCount = 0;

      const updatedMedia = [...current];
      for (let i = 0; i < current.length; i++) {
        const item = current[i];
        try {
          const { details } = await fetchDetailsWithFallback(item, settings.tmdbApiKey, settings.omdbApiKey);
          if (details.posterUrl || details.backdropUrl) {
            updatedMedia[i] = {
              ...item,
              ...details,
              posterUrl: details.posterUrl || item.posterUrl,
              fallbackPosterUrl: details.posterUrl || item.fallbackPosterUrl || item.posterUrl,
              backdropUrl: details.backdropUrl || item.backdropUrl || item.posterUrl,
            };
            updatedCount++;
          }
        } catch (err) {
          console.warn('Artwork reload failed for item:', item.id, err);
        }
        if (onProgress) onProgress(i + 1, total);
      }

      const { cleanMedia, cleanStates, cleanLists } = deduplicateMediaItemsAndStates(
        updatedMedia,
        loadUserStates(),
        loadCustomLists()
      );

      saveMediaCache(cleanMedia);
      saveUserStates(cleanStates);
      saveCustomLists(cleanLists);
      setMediaItems(cleanMedia);
      setUserStates(cleanStates);
      setCustomLists(cleanLists);

      return { total, updatedCount };
    },
    [settings.tmdbApiKey, settings.omdbApiKey]
  );

  // One-click action: Remove all duplicate titles across media cache, user states & lists
  const removeAllDuplicates = useCallback(() => {
    const currentMedia = loadMediaCache();
    const currentStates = loadUserStates();
    const currentLists = loadCustomLists();

    const { cleanMedia, cleanStates, cleanLists } = deduplicateMediaItemsAndStates(
      currentMedia,
      currentStates,
      currentLists
    );

    const removedCount = currentMedia.length - cleanMedia.length;

    saveMediaCache(cleanMedia);
    saveUserStates(cleanStates);
    saveCustomLists(cleanLists);
    setMediaItems(cleanMedia);
    setUserStates(cleanStates);
    setCustomLists(cleanLists);

    return { beforeCount: currentMedia.length, afterCount: cleanMedia.length, removedCount };
  }, []);

  return {
    isInitialized,
    mediaItems,
    userStates,
    customLists,
    settings,
    stats,
    updateSettings,
    hydrateMediaDetails,
    toggleWatchlist,
    removeFromWatchlist,
    dismissFromWatching,
    markWatching,
    markWatched,
    toggleWatched,
    toggleFavorite,
    setPersonalRating,
    setNotes,
    setProgress,
    toggleTVEpisode,
    toggleSeasonEpisodes,
    createCustomList,
    updateCustomList,
    deleteCustomList,
    addItemToList,
    removeItemFromList,
    addMediaToLibrary,
    getRandomItem,
    deleteAllData,
    clearCachedTitlesAndImages,
    resetAll,
    restoreBackup,
    deleteMediaItem,
    importRecentChanges,
    refreshLibrary,
    reloadAllArtwork,
    removeAllDuplicates,
  };
}
