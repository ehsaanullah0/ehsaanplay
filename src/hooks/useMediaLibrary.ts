import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  MediaItem,
  PersonalMediaState,
  CustomList,
  UserSettings,
  SeasonInfo,
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

export function getCanonicalKeyForItem(item: MediaItem): string {
  if (item.imdbId && item.imdbId.startsWith('tt')) {
    return item.imdbId;
  }
  if (item.tmdbId) {
    return `tmdb-${item.type || 'movie'}-${item.tmdbId}`;
  }
  if (item.id && (item.id.startsWith('tt') || item.id.startsWith('tmdb-'))) {
    return item.id;
  }
  const cleanTitle = (item.title || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  if (cleanTitle && item.year) {
    return `${item.type || 'movie'}-${cleanTitle}-${item.year}`;
  }
  return item.id || `unknown-${Math.random()}`;
}

export function deduplicateMediaItemsAndStates(
  rawMedia: MediaItem[],
  rawStates: Record<string, PersonalMediaState>,
  rawLists: CustomList[] = []
): { cleanMedia: MediaItem[]; cleanStates: Record<string, PersonalMediaState>; cleanLists: CustomList[] } {
  const canonicalMap = new Map<string, MediaItem>();
  const idToCanonical = new Map<string, string>();

  // 1. Group and merge media items into canonical entries
  for (const item of rawMedia) {
    if (!item) continue;
    const canonicalKey = getCanonicalKeyForItem(item);
    idToCanonical.set(item.id, canonicalKey);
    if (item.imdbId) idToCanonical.set(item.imdbId, canonicalKey);
    if (item.tmdbId) idToCanonical.set(`tmdb-${item.type || 'movie'}-${item.tmdbId}`, canonicalKey);
    const titleKey = `${item.type || 'movie'}-${(item.title || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '')}-${item.year}`;
    idToCanonical.set(titleKey, canonicalKey);

    const existing = canonicalMap.get(canonicalKey);
    if (!existing) {
      canonicalMap.set(canonicalKey, { ...item, id: canonicalKey });
    } else {
      // Merge rich properties from duplicate item
      const merged: MediaItem = {
        ...existing,
        id: canonicalKey,
        imdbId: existing.imdbId || item.imdbId,
        tmdbId: existing.tmdbId || item.tmdbId,
        posterUrl: existing.posterUrl || item.posterUrl,
        fallbackPosterUrl: existing.fallbackPosterUrl || item.fallbackPosterUrl,
        backdropUrl: existing.backdropUrl || item.backdropUrl,
        overview: existing.overview && existing.overview.length > 20 ? existing.overview : (item.overview || existing.overview),
        genres: Array.from(new Set([...(existing.genres || []), ...(item.genres || [])])),
        cast: existing.cast && existing.cast.length > 0 ? existing.cast : (item.cast || []),
        crew: existing.crew && existing.crew.length > 0 ? existing.crew : (item.crew || []),
        providers: existing.providers && existing.providers.length > 0 ? existing.providers : (item.providers || []),
        seasonsCount: Math.max(existing.seasonsCount || 0, item.seasonsCount || 0) || undefined,
        episodesCount: Math.max(existing.episodesCount || 0, item.episodesCount || 0) || undefined,
        seasons: existing.seasons && existing.seasons.length > 0 ? existing.seasons : item.seasons,
      };
      canonicalMap.set(canonicalKey, merged);
    }
  }

  const cleanMedia = Array.from(canonicalMap.values());

  // 2. Consolidate PersonalMediaStates for all duplicate alias keys
  const cleanStates: Record<string, PersonalMediaState> = {};
  for (const [id, st] of Object.entries(rawStates)) {
    if (!st) continue;
    const itemInMedia = rawMedia.find(m => m.id === id);
    const canonicalKey = idToCanonical.get(id) || (itemInMedia ? getCanonicalKeyForItem(itemInMedia) : id);

    const prevSt = cleanStates[canonicalKey];
    if (!prevSt) {
      cleanStates[canonicalKey] = { ...st, mediaId: canonicalKey };
    } else {
      cleanStates[canonicalKey] = {
        mediaId: canonicalKey,
        inWatchlist: prevSt.inWatchlist || st.inWatchlist,
        isWatched: prevSt.isWatched || st.isWatched,
        isFavorite: prevSt.isFavorite || st.isFavorite,
        progressPercent: Math.max(prevSt.progressPercent || 0, st.progressPercent || 0),
        personalRating: prevSt.personalRating || st.personalRating,
        notes: [prevSt.notes, st.notes].filter(Boolean).join('\n') || undefined,
        addedAt: prevSt.addedAt || st.addedAt,
        favoritedAt: prevSt.favoritedAt || st.favoritedAt,
        lastWatchedAt: prevSt.lastWatchedAt || st.lastWatchedAt,
        tvProgress: prevSt.tvProgress || st.tvProgress,
      };
    }
  }

  // 3. Remap item IDs in Custom Lists
  const cleanLists = rawLists.map(list => {
    const remappedIds = list.itemIds.map(id => idToCanonical.get(id) || id);
    const uniqueIds = Array.from(new Set(remappedIds));
    return { ...list, itemIds: uniqueIds };
  });

  return { cleanMedia, cleanStates, cleanLists };
}

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
        localStorage.removeItem('ehsaan_recent_changes_entries');
        localStorage.removeItem('ehsaan_recent_changes_counter');
        localStorage.removeItem('ehsaan_recent_changes_checkpoint');
      } catch {
        // ignore
      }
      localStorage.setItem('ehsaan_clean_start_v8', 'true');
    }

    setUserStates(cleanStates);
    setCustomLists(loadedLists);
    setSettings(loadedSettings);
    document.documentElement.setAttribute('data-theme', loadedSettings.theme);
    document.documentElement.setAttribute('data-color-scheme', loadedSettings.colorScheme || 'olive');
    document.documentElement.setAttribute('data-font', loadedSettings.tweaks?.fontFamily || 'google-sans-flex');

    const initCatalog = async () => {
      let currentMedia = loadedMedia;
      const hasLegacyMockItems = currentMedia.some(m => m.id === 'm-dune-2' || m.id === 'm-oppenheimer' || m.id === 'm-interstellar');

      // Fetch top Netflix titles and 50+ Explore titles if catalog has fewer than 40 items or legacy mocks
      if (!currentMedia || currentMedia.length < 40 || hasLegacyMockItems) {
        try {
          const [netflixMovies, netflixSeries, exploreItems] = await Promise.all([
            fetchNetflixTop10Movies(loadedSettings.omdbApiKey),
            fetchNetflixTop10Series(loadedSettings.omdbApiKey),
            fetchExploreRecommendations(
              loadedSettings.recommendationProvider || 'tmdb',
              loadedSettings.tmdbApiKey,
              loadedSettings.omdbApiKey
            ),
          ]);
          
          const combined = [...netflixMovies, ...netflixSeries, ...exploreItems];
          const uniqueMap = new Map<string, MediaItem>();
          
          // Preserve any existing items
          for (const item of (currentMedia || [])) {
            if (!item.id.includes('m-dune-2') && !item.id.includes('m-oppenheimer') && !item.id.includes('m-interstellar')) {
              uniqueMap.set(item.id, item);
            }
          }
          
          for (const item of combined) {
            if (!uniqueMap.has(item.id)) {
              uniqueMap.set(item.id, item);
            }
          }
          
          currentMedia = Array.from(uniqueMap.values());
          if (currentMedia.length > 0) {
            saveMediaCache(currentMedia);
          }
        } catch (err) {
          console.error('Failed to fetch live titles:', err);
        }
      }

      // Auto-repair any TV series with outdated seasons metadata (e.g. Breaking Bad with 1 season)
      const repairedMedia = (currentMedia || []).map(item => {
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
      for (const [stateId, st] of Object.entries(cleanStates)) {
        if (!existingIds.has(stateId) && (st.inWatchlist || (st.progressPercent && st.progressPercent > 0))) {
          const found = exploreFallbackItems.find(m => m.id === stateId);
          if (found) {
            repairedMedia.push(found);
            existingIds.add(stateId);
          }
        }
      }

      const finalMedia = repairedMedia;
      const { cleanMedia, cleanStates: dedupedStates, cleanLists } = deduplicateMediaItemsAndStates(finalMedia, cleanStates, loadedLists);
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

  // Force refresh in-memory state from storage (used after delta merge)
  const refreshLibrary = useCallback(() => {
    const rawMedia = loadMediaCache();
    const rawStates = loadUserStates();
    const rawLists = loadCustomLists();
    const { cleanMedia, cleanStates: dedupedStates, cleanLists } = deduplicateMediaItemsAndStates(rawMedia, rawStates, rawLists);
    setMediaItems(cleanMedia);
    setUserStates(dedupedStates);
    setCustomLists(cleanLists);
  }, []);

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
      return (
        existingStates[mediaId] || {
          mediaId,
          inWatchlist: false,
          isWatched: false,
          isFavorite: false,
          addedAt: new Date().toISOString(),
        }
      );
    },
    []
  );

  // Hydrate item with rich details using OMDb with automatic OMDb fallback
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
        genres: details.genres || item.genres || [],
        cast: details.cast && details.cast.length > 0 ? details.cast : item.cast,
        crew: details.crew && details.crew.length > 0 ? details.crew : item.crew,
        providers: details.providers && details.providers.length > 0 ? details.providers : item.providers,
        seasonsCount,
        episodesCount,
        seasons,
      };

      setMediaItems(prev => {
        const next = prev.map(m => (m.id === item.id ? enriched : m));
        if (!next.some(m => m.id === item.id)) {
          next.push(enriched);
        }
        saveMediaCache(next);
        return next;
      });

      return enriched;
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
  }, [settings.omdbApiKey, settings.omdbApiKey]);

  // Toggle Watchlist
  const toggleWatchlist = useCallback((mediaId: string, optionalItem?: MediaItem) => {
    setUserStates(prev => {
      const current = getOrCreateState(mediaId, prev);
      const nextWatchlist = !current.inWatchlist;
      const updated = {
        ...prev,
        [mediaId]: {
          ...current,
          inWatchlist: nextWatchlist,
        },
      };
      saveUserStates(updated);
      const mediaItem = optionalItem || mediaItems.find(m => m.id === mediaId);
      recordLibraryChange('update_state', mediaId, {
        state: { inWatchlist: nextWatchlist },
        mediaItem,
      });

      if (mediaItem && nextWatchlist) {
        setMediaItems(prevItems => {
          if (!prevItems.some(m => m.id === mediaItem.id)) {
            const nextList = [mediaItem, ...prevItems];
            saveMediaCache(nextList);
            return nextList;
          }
          return prevItems;
        });
      }

      return updated;
    });
  }, [getOrCreateState, mediaItems]);

  // Quick action: Remove from Watchlist
  const removeFromWatchlist = useCallback((mediaId: string) => {
    const target = mediaItems.find(m => m.id === mediaId);
    const targetImdbId = target?.imdbId;
    const targetTmdbId = target?.tmdbId;
    const targetTitleKey = target ? `${target.type || 'movie'}-${(target.title || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '')}-${target.year}` : null;

    setUserStates(prev => {
      const updated = { ...prev };
      for (const key of Object.keys(updated)) {
        const item = mediaItems.find(m => m.id === key);
        const matchesId = key === mediaId;
        const matchesImdb = !!(targetImdbId && item?.imdbId === targetImdbId);
        const matchesTmdb = !!(targetTmdbId && item?.tmdbId === targetTmdbId);
        const matchesTitle = !!(targetTitleKey && item && `${item.type || 'movie'}-${(item.title || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '')}-${item.year}` === targetTitleKey);

        if (matchesId || matchesImdb || matchesTmdb || matchesTitle) {
          updated[key] = {
            ...updated[key],
            inWatchlist: false,
            isWatched: false,
            progressPercent: 0,
          };
        }
      }
      saveUserStates(updated);
      recordLibraryChange('update_state', mediaId, {
        state: { inWatchlist: false, isWatched: false, progressPercent: 0 },
        mediaItem: target,
      });
      return updated;
    });
  }, [mediaItems]);

  // Quick action: Dismiss from Continue Watching
  const dismissFromWatching = useCallback((mediaId: string) => {
    setUserStates(prev => {
      const current = getOrCreateState(mediaId, prev);
      const updated = {
        ...prev,
        [mediaId]: {
          ...current,
          progressPercent: 0,
          tvProgress: current.tvProgress
            ? {
                ...current.tvProgress,
                completedEpisodes: {},
              }
            : undefined,
        },
      };
      saveUserStates(updated);
      const mediaItem = mediaItems.find(m => m.id === mediaId);
      recordLibraryChange('update_state', mediaId, { state: { progressPercent: 0 }, mediaItem });
      return updated;
    });
  }, [getOrCreateState, mediaItems]);

  // Quick action: Mark Watching / In Progress
  const markWatching = useCallback((mediaId: string) => {
    setUserStates(prev => {
      const current = getOrCreateState(mediaId, prev);
      const nextProgress = (current.progressPercent && current.progressPercent > 0 && current.progressPercent < 100)
        ? current.progressPercent
        : 50;
      const updated = {
        ...prev,
        [mediaId]: {
          ...current,
          inWatchlist: true,
          isWatched: false,
          progressPercent: nextProgress,
          lastWatchedAt: new Date().toISOString(),
        },
      };
      saveUserStates(updated);
      const mediaItem = mediaItems.find(m => m.id === mediaId);
      recordLibraryChange('update_state', mediaId, {
        state: { inWatchlist: true, isWatched: false, progressPercent: nextProgress },
        mediaItem,
      });
      return updated;
    });
  }, [getOrCreateState, mediaItems]);

  // Quick action: Mark Watched (100%)
  const markWatched = useCallback((mediaId: string) => {
    setUserStates(prev => {
      const current = getOrCreateState(mediaId, prev);
      const mediaItem = mediaItems.find(m => m.id === mediaId);
      let nextTvProgress = current.tvProgress;

      if (mediaItem && mediaItem.type === 'tv') {
        const seasons = mediaItem.seasonsCount || 1;
        const totalEp = mediaItem.episodesCount || seasons * 8;
        const epPerSeason = Math.ceil(totalEp / seasons);
        const allCompleted: Record<string, boolean> = {};
        for (let s = 1; s <= seasons; s++) {
          for (let e = 1; e <= epPerSeason; e++) {
            allCompleted[`s${s}e${e}`] = true;
          }
        }
        nextTvProgress = {
          currentSeason: seasons,
          currentEpisode: epPerSeason,
          completedEpisodes: allCompleted,
        };
      }

      const updated = {
        ...prev,
        [mediaId]: {
          ...current,
          isWatched: true,
          progressPercent: 100,
          lastWatchedAt: new Date().toISOString(),
          tvProgress: nextTvProgress,
        },
      };
      saveUserStates(updated);
      recordLibraryChange('update_state', mediaId, {
        state: { isWatched: true, progressPercent: 100, tvProgress: nextTvProgress },
        mediaItem,
      });
      return updated;
    });
  }, [getOrCreateState, mediaItems]);

  // Toggle Watched - Unwatched -> Watched (100%), Watching -> Watched (100%), Watched -> Unwatched (0%)
  const toggleWatched = useCallback((mediaId: string, optionalItem?: MediaItem) => {
    setUserStates(prev => {
      const current = getOrCreateState(mediaId, prev);
      const isWatched = !!current.isWatched;
      const isWatching = !isWatched && (current.progressPercent || 0) > 0;
      const mediaItem = optionalItem || mediaItems.find(m => m.id === mediaId);

      let nextIsWatched = false;
      let nextProgressPercent = 0;
      let nextTvProgress = current.tvProgress;

      if (!isWatched && !isWatching) {
        // State 1 (Unwatched) -> State 2 (Watched 100%)
        nextIsWatched = true;
        nextProgressPercent = 100;

        if (mediaItem && mediaItem.type === 'tv') {
          const knownMeta = mediaItem.id ? KNOWN_TV_SHOWS_METADATA[mediaItem.id] : undefined;
          const seasons = Math.max(mediaItem.seasonsCount || 0, knownMeta?.seasonsCount || 0, 1);
          const totalEp = Math.max(
            mediaItem.episodesCount || 0,
            knownMeta?.episodesCount || 0,
            (mediaItem.seasons || knownMeta?.seasons)?.reduce((acc: number, s: SeasonInfo) => acc + (s.episodeCount || 0), 0) || 0,
            seasons * 8
          );
          const epPerSeason = Math.ceil(totalEp / seasons);
          const newCompleted: Record<string, boolean> = {};
          for (let s = 1; s <= seasons; s++) {
            const sCount = (mediaItem.seasons || knownMeta?.seasons)?.find((sn: SeasonInfo) => sn.seasonNumber === s)?.episodeCount || epPerSeason;
            for (let e = 1; e <= sCount; e++) {
              newCompleted[`s${s}e${e}`] = true;
            }
          }
          nextTvProgress = {
            currentSeason: seasons,
            currentEpisode: epPerSeason,
            completedEpisodes: newCompleted,
          };
        }
      } else if (isWatching) {
        // State 2 (Watching) -> Mark fully Watched (100%)
        nextIsWatched = true;
        nextProgressPercent = 100;

        if (mediaItem && mediaItem.type === 'tv') {
          const knownMeta = mediaItem.id ? KNOWN_TV_SHOWS_METADATA[mediaItem.id] : undefined;
          const seasons = Math.max(mediaItem.seasonsCount || 0, knownMeta?.seasonsCount || 0, 1);
          const totalEp = Math.max(
            mediaItem.episodesCount || 0,
            knownMeta?.episodesCount || 0,
            (mediaItem.seasons || knownMeta?.seasons)?.reduce((acc: number, s: SeasonInfo) => acc + (s.episodeCount || 0), 0) || 0,
            seasons * 8
          );
          const epPerSeason = Math.ceil(totalEp / seasons);
          const newCompleted: Record<string, boolean> = {};
          for (let s = 1; s <= seasons; s++) {
            const sCount = (mediaItem.seasons || knownMeta?.seasons)?.find((sn: SeasonInfo) => sn.seasonNumber === s)?.episodeCount || epPerSeason;
            for (let e = 1; e <= sCount; e++) {
              newCompleted[`s${s}e${e}`] = true;
            }
          }
          nextTvProgress = {
            currentSeason: seasons,
            currentEpisode: epPerSeason,
            completedEpisodes: newCompleted,
          };
        }
      } else {
        // State 3 (Watched) -> Reset to Unwatched (0%)
        nextIsWatched = false;
        nextProgressPercent = 0;

        if (mediaItem && mediaItem.type === 'tv') {
          nextTvProgress = {
            currentSeason: 1,
            currentEpisode: 1,
            completedEpisodes: {},
          };
        }
      }

      const updated = {
        ...prev,
        [mediaId]: {
          ...current,
          isWatched: nextIsWatched,
          progressPercent: nextProgressPercent,
          lastWatchedAt: new Date().toISOString(),
          tvProgress: nextTvProgress,
        },
      };
      saveUserStates(updated);
      recordLibraryChange('update_state', mediaId, {
        state: { isWatched: nextIsWatched, progressPercent: nextProgressPercent, tvProgress: nextTvProgress },
        mediaItem,
      });

      if (mediaItem) {
        setMediaItems(prevItems => {
          if (!prevItems.some(m => m.id === mediaItem.id)) {
            const nextList = [mediaItem, ...prevItems];
            saveMediaCache(nextList);
            return nextList;
          }
          return prevItems;
        });
      }

      return updated;
    });
  }, [getOrCreateState, mediaItems]);

  // Toggle Favorite
  const toggleFavorite = useCallback((mediaId: string) => {
    setUserStates(prev => {
      const current = getOrCreateState(mediaId, prev);
      const nextFavorite = !current.isFavorite;
      const updated = {
        ...prev,
        [mediaId]: {
          ...current,
          isFavorite: nextFavorite,
          favoritedAt: nextFavorite ? new Date().toISOString() : undefined,
        },
      };
      saveUserStates(updated);
      const mediaItem = mediaItems.find(m => m.id === mediaId);
      recordLibraryChange('update_state', mediaId, { state: { isFavorite: nextFavorite }, mediaItem });
      return updated;
    });
  }, [getOrCreateState, mediaItems]);

  // Set Personal Rating
  const setPersonalRating = useCallback((mediaId: string, rating: number | undefined) => {
    setUserStates(prev => {
      const current = getOrCreateState(mediaId, prev);
      const updated = {
        ...prev,
        [mediaId]: {
          ...current,
          personalRating: rating,
        },
      };
      saveUserStates(updated);
      const mediaItem = mediaItems.find(m => m.id === mediaId);
      recordLibraryChange('update_state', mediaId, { state: { personalRating: rating }, mediaItem });
      return updated;
    });
  }, [getOrCreateState, mediaItems]);

  // Set Personal Notes
  const setNotes = useCallback((mediaId: string, notes: string) => {
    setUserStates(prev => {
      const current = getOrCreateState(mediaId, prev);
      const updated = {
        ...prev,
        [mediaId]: {
          ...current,
          notes,
        },
      };
      saveUserStates(updated);
      const mediaItem = mediaItems.find(m => m.id === mediaId);
      recordLibraryChange('update_state', mediaId, { state: { notes }, mediaItem });
      return updated;
    });
  }, [getOrCreateState, mediaItems]);

  // Set Progress (0 - 100%)
  const setProgress = useCallback((mediaId: string, progressPercent: number, optionalItem?: MediaItem) => {
    setUserStates(prev => {
      const current = getOrCreateState(mediaId, prev);
      const isComplete = progressPercent >= 95;
      const mediaItem = optionalItem || mediaItems.find(m => m.id === mediaId);
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

      // CRITICAL FIX: In-progress between 1% and 94% is strictly NOT watched.
      // Automatically keep in watchlist while actively watching.
      const nextWatched = isComplete ? true : false;
      const inWatchlist = progressPercent > 0 ? true : current.inWatchlist;

      const updated = {
        ...prev,
        [mediaId]: {
          ...current,
          progressPercent,
          isWatched: nextWatched,
          inWatchlist,
          lastWatchedAt: new Date().toISOString(),
          tvProgress: nextTvProgress,
        },
      };
      saveUserStates(updated);
      recordLibraryChange('update_state', mediaId, {
        state: { progressPercent, isWatched: nextWatched, inWatchlist, tvProgress: nextTvProgress },
        mediaItem,
      });

      if (mediaItem) {
        setMediaItems(prevItems => {
          if (!prevItems.some(m => m.id === mediaItem.id)) {
            const nextList = [mediaItem, ...prevItems];
            saveMediaCache(nextList);
            return nextList;
          }
          return prevItems;
        });
      }

      return updated;
    });
  }, [getOrCreateState, mediaItems]);

  // Toggle Episode for TV series - Calculates overall series progress directly from episode checks
  const toggleTVEpisode = useCallback(
    (mediaId: string, season: number, episode: number, optionalItem?: MediaItem) => {
      setUserStates(prev => {
        const current = getOrCreateState(mediaId, prev);
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

        const mediaItem = optionalItem || mediaItems.find(m => m.id === mediaId);
        const knownMeta = mediaItem?.id ? KNOWN_TV_SHOWS_METADATA[mediaItem.id] : undefined;
        const seasonsList = mediaItem?.seasons || knownMeta?.seasons;
        const totalSeasons = Math.max(mediaItem?.seasonsCount || 0, knownMeta?.seasonsCount || 0, seasonsList?.length || 0, 1);
        const totalEpisodes = seasonsList && seasonsList.length > 0
          ? seasonsList.reduce((acc: number, s: SeasonInfo) => acc + (s.episodeCount || 0), 0)
          : Math.max(mediaItem?.episodesCount || 0, knownMeta?.episodesCount || 0, totalSeasons * 8);

        const completedCount = Object.values(nextCompleted).filter(Boolean).length;
        const calculatedProgress = Math.min(100, Math.round((completedCount / Math.max(1, totalEpisodes)) * 100));

        // Series is completed ONLY if all episodes are checked
        const isAllDone = totalEpisodes > 1
          ? completedCount >= totalEpisodes
          : (completedCount > 0 && totalEpisodes === 1 && totalSeasons === 1);

        // Cap in-progress progress to 99% while incomplete, so it stays in Continue Watching!
        const nextProgress = isAllDone ? 100 : Math.min(99, Math.max(calculatedProgress, completedCount > 0 ? 5 : 0));
        const inWatchlist = completedCount > 0 ? true : current.inWatchlist;

        const updated = {
          ...prev,
          [mediaId]: {
            ...current,
            progressPercent: nextProgress,
            isWatched: isAllDone,
            inWatchlist,
            lastWatchedAt: new Date().toISOString(),
            tvProgress: {
              currentSeason: season,
              currentEpisode: episode,
              completedEpisodes: nextCompleted,
            },
          },
        };
        saveUserStates(updated);
        recordLibraryChange('update_state', mediaId, {
          state: {
            progressPercent: nextProgress,
            isWatched: isAllDone,
            inWatchlist,
            tvProgress: {
              currentSeason: season,
              currentEpisode: episode,
              completedEpisodes: nextCompleted,
            },
          },
          mediaItem,
        });

        if (mediaItem) {
          setMediaItems(prevItems => {
            if (!prevItems.some(m => m.id === mediaItem.id)) {
              const nextList = [mediaItem, ...prevItems];
              saveMediaCache(nextList);
              return nextList;
            }
            return prevItems;
          });
        }

        return updated;
      });
    },
    [getOrCreateState, mediaItems]
  );

  // Toggle All Season Episodes for TV Series
  const toggleSeasonEpisodes = useCallback(
    (mediaId: string, season: number, episodeNumbers: number[], forceMarkDone: boolean, optionalItem?: MediaItem) => {
      setUserStates(prev => {
        const current = getOrCreateState(mediaId, prev);
        const mediaItem = optionalItem || mediaItems.find(m => m.id === mediaId);
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

        // Series is completed ONLY if all episodes are checked
        const isAllDone = totalEpisodes > 1
          ? completedCount >= totalEpisodes
          : (completedCount > 0 && totalEpisodes === 1 && totalSeasons === 1);

        // Cap in-progress progress to 99% while incomplete, so it stays in Continue Watching!
        const nextProgress = isAllDone ? 100 : Math.min(99, Math.max(calculatedProgress, completedCount > 0 ? 5 : 0));
        const inWatchlist = completedCount > 0 ? true : current.inWatchlist;

        const updated = {
          ...prev,
          [mediaId]: {
            ...current,
            progressPercent: nextProgress,
            isWatched: isAllDone,
            inWatchlist,
            lastWatchedAt: new Date().toISOString(),
            tvProgress: {
              currentSeason: season,
              currentEpisode: episodeNumbers[episodeNumbers.length - 1] || 1,
              completedEpisodes: nextCompleted,
            },
          },
        };
        saveUserStates(updated);
        recordLibraryChange('update_state', mediaId, {
          state: {
            progressPercent: nextProgress,
            isWatched: isAllDone,
            inWatchlist,
            tvProgress: {
              currentSeason: season,
              currentEpisode: episodeNumbers[episodeNumbers.length - 1] || 1,
              completedEpisodes: nextCompleted,
            },
          },
          mediaItem,
        });

        if (mediaItem) {
          setMediaItems(prevItems => {
            if (!prevItems.some(m => m.id === mediaItem.id)) {
              const nextList = [mediaItem, ...prevItems];
              saveMediaCache(nextList);
              return nextList;
            }
            return prevItems;
          });
        }

        return updated;
      });
    },
    [getOrCreateState, mediaItems]
  );

  // Custom Lists Management
  const createCustomList = useCallback(
    (title: string, description?: string, colorTag?: string) => {
      const newList: CustomList = {
        id: `list-${Date.now()}`,
        title: title.trim(),
        description: description?.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        itemIds: [],
        colorTag: colorTag || '#4E562F',
      };
      setCustomLists(prev => {
        const next = [newList, ...prev];
        saveCustomLists(next);
        recordLibraryChange('list_create', newList.id, { list: newList });
        return next;
      });
      return newList;
    },
    []
  );

  const updateCustomList = useCallback(
    (id: string, title: string, description?: string, colorTag?: string) => {
      setCustomLists(prev => {
        const next = prev.map(list => {
          if (list.id !== id) return list;
          return {
            ...list,
            title: title.trim(),
            description: description?.trim(),
            colorTag: colorTag || list.colorTag,
            updatedAt: new Date().toISOString(),
          };
        });
        saveCustomLists(next);
        recordLibraryChange('list_update', id, {
          list: { title: title.trim(), description: description?.trim(), colorTag },
        });
        return next;
      });
    },
    []
  );

  const deleteCustomList = useCallback((id: string) => {
    setCustomLists(prev => {
      const next = prev.filter(l => l.id !== id);
      saveCustomLists(next);
      recordLibraryChange('list_delete', id);
      return next;
    });
  }, []);

  const addItemToList = useCallback((listId: string, mediaId: string) => {
    setCustomLists(prev => {
      const next = prev.map(list => {
        if (list.id !== listId) return list;
        if (list.itemIds.includes(mediaId)) return list;
        return {
          ...list,
          itemIds: [...list.itemIds, mediaId],
          updatedAt: new Date().toISOString(),
        };
      });
      saveCustomLists(next);
      const mediaItem = mediaItems.find(m => m.id === mediaId);
      recordLibraryChange('list_item_add', listId, { listItemId: mediaId, mediaItem });
      return next;
    });
  }, [mediaItems]);

  const removeItemFromList = useCallback((listId: string, mediaId: string) => {
    setCustomLists(prev => {
      const next = prev.map(list => {
        if (list.id !== listId) return list;
        return {
          ...list,
          itemIds: list.itemIds.filter(id => id !== mediaId),
          updatedAt: new Date().toISOString(),
        };
      });
      saveCustomLists(next);
      const mediaItem = mediaItems.find(m => m.id === mediaId);
      recordLibraryChange('list_item_remove', listId, { listItemId: mediaId, mediaItem });
      return next;
    });
  }, [mediaItems]);

  // Add new media to cache (e.g. from search or exploration)
  const addMediaToLibrary = useCallback((item: MediaItem) => {
    setMediaItems(prev => {
      if (prev.some(m => m.id === item.id)) return prev;
      const next = [item, ...prev];
      saveMediaCache(next);
      return next;
    });
  }, []);

  // Delete media entity from library
  const deleteMediaItem = useCallback((mediaId: string) => {
    const target = mediaItems.find(m => m.id === mediaId);
    const targetImdbId = target?.imdbId;
    const targetTmdbId = target?.tmdbId;
    const targetTitleKey = target ? `${target.type || 'movie'}-${(target.title || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '')}-${target.year}` : null;

    const isMatch = (m: MediaItem) => {
      if (m.id === mediaId) return true;
      if (targetImdbId && m.imdbId === targetImdbId) return true;
      if (targetTmdbId && m.tmdbId === targetTmdbId) return true;
      if (targetTitleKey && `${m.type || 'movie'}-${(m.title || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '')}-${m.year}` === targetTitleKey) return true;
      return false;
    };

    setMediaItems(prev => {
      const next = prev.filter(m => !isMatch(m));
      saveMediaCache(next);
      return next;
    });
    setUserStates(prev => {
      const next = { ...prev };
      for (const key of Object.keys(next)) {
        const item = mediaItems.find(m => m.id === key);
        if (key === mediaId || (item && isMatch(item))) {
          delete next[key];
        }
      }
      saveUserStates(next);
      return next;
    });
    setCustomLists(prev => {
      const next = prev.map(l => ({
        ...l,
        itemIds: l.itemIds.filter(id => id !== mediaId),
      }));
      saveCustomLists(next);
      return next;
    });
    recordLibraryChange('delete', mediaId);
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

  // Calculate Statistics cleanly
  const stats = useMemo(() => {
    let moviesCount = 0;
    let seriesCount = 0;
    let watchedCount = 0;
    let watchlistCount = 0;
    let favoritesCount = 0;
    let inProgressCount = 0;
    let totalMinutes = 0;

    for (const item of mediaItems) {
      if (item.type === 'movie') moviesCount++;
      if (item.type === 'tv') seriesCount++;

      const state = userStates[item.id];
      if (state) {
        if (state.isWatched) {
          watchedCount++;
          if (item.type === 'movie' && item.runtime) {
            totalMinutes += item.runtime;
          } else if (item.type === 'tv' && item.seasonsCount) {
            totalMinutes += (item.episodesCount || 8) * 45;
          }
        }
        if (state.inWatchlist) watchlistCount++;
        if (state.isFavorite) favoritesCount++;
        if (
          !state.isWatched &&
          state.progressPercent !== undefined &&
          state.progressPercent > 0 &&
          state.progressPercent < 100
        ) {
          inProgressCount++;
        }
      }
    }

    return {
      moviesCount,
      seriesCount,
      watchedCount,
      watchlistCount,
      favoritesCount,
      inProgressCount,
      totalHours: Math.round(totalMinutes / 60),
    };
  }, [mediaItems, userStates]);

  // Random item picker
  const getRandomItem = useCallback(
    (predicate?: (item: MediaItem) => boolean): MediaItem | null => {
      const pool = predicate ? mediaItems.filter(predicate) : mediaItems;
      if (pool.length === 0) return null;
      const index = Math.floor(Math.random() * pool.length);
      return pool[index];
    },
    [mediaItems]
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
      localStorage.removeItem('ehsaan_recent_changes_entries');
      localStorage.removeItem('ehsaan_recent_changes_counter');
      localStorage.removeItem('ehsaan_recent_changes_checkpoint');
    } catch {
      // ignore
    }
  }, []);

  // Safely clears image cache and all un-saved discovery titles from media cache
  const clearCachedTitlesAndImages = useCallback(async () => {
    await clearImageCache();
    // Keep only titles that the user actively has in their personal states / lists
    const currentStates = loadUserStates();
    const currentMedia = loadMediaCache();
    const userMediaIds = new Set(
      Object.keys(currentStates).filter(id => {
        const s = currentStates[id];
        return s.inWatchlist || s.isWatched || s.isFavorite || (s.progressPercent && s.progressPercent > 0) || s.personalRating || s.notes;
      })
    );
    const keptMedia = currentMedia.filter(m => userMediaIds.has(m.id));
    saveMediaCache(keptMedia);
    setMediaItems(keptMedia);
    return true;
  }, []);

  // Reset to seed demo state
  const resetAll = useCallback(async () => {
    resetLibraryToDefault();
    const [netflixMovies, netflixSeries] = await Promise.all([
      fetchNetflixTop10Movies(settings.omdbApiKey),
      fetchNetflixTop10Series(settings.omdbApiKey),
    ]);
    const liveMedia = [...netflixMovies, ...netflixSeries];
    setMediaItems(liveMedia);
    saveMediaCache(liveMedia);
    setUserStates({});
    setCustomLists([]);
    setSettings(loadUserSettings());
  }, [settings.omdbApiKey]);

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
