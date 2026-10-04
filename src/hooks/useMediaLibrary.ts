import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  MediaItem,
  PersonalMediaState,
  CustomList,
  UserSettings,
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
} from '../services/tmdb';

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

    setUserStates(loadedStates);
    setCustomLists(loadedLists);
    setSettings(loadedSettings);
    document.documentElement.setAttribute('data-theme', loadedSettings.theme);

    const initCatalog = async () => {
      let currentMedia = loadedMedia;
      const hasLegacyMockItems = currentMedia.some(m => m.id === 'm-dune-2' || m.id === 'm-oppenheimer' || m.id === 'm-interstellar');

      // Fetch top Netflix titles and 50+ Explore titles if catalog has fewer than 40 items or legacy mocks
      if (!currentMedia || currentMedia.length < 40 || hasLegacyMockItems) {
        try {
          const [netflixMovies, netflixSeries, exploreItems] = await Promise.all([
            fetchNetflixTop10Movies(loadedSettings.tmdbApiKey),
            fetchNetflixTop10Series(loadedSettings.tmdbApiKey),
            fetchExploreRecommendations(loadedSettings.tmdbApiKey),
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

      setMediaItems(currentMedia || []);
      setIsInitialized(true);
    };

    initCatalog();
  }, []);

  // Update theme on settings change
  const updateSettings = useCallback((partial: Partial<UserSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...partial };
      saveUserSettings(updated);
      if (partial.theme) {
        document.documentElement.setAttribute('data-theme', partial.theme);
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

  // Hydrate item with full TMDB details (cast, crew, providers, trailer, seasons/episodes)
  const hydrateMediaDetails = useCallback(async (item: MediaItem) => {
    if (!item.tmdbId) return item;

    try {
      const details = await fetchMediaDetails(item.tmdbId, item.type, settings.tmdbApiKey);
      const enriched: MediaItem = {
        ...item,
        ...details,
        genres: details.genres || item.genres || [],
        cast: details.cast && details.cast.length > 0 ? details.cast : item.cast,
        crew: details.crew && details.crew.length > 0 ? details.crew : item.crew,
        providers: details.providers && details.providers.length > 0 ? details.providers : item.providers,
        seasonsCount: item.type === 'tv' ? (details.seasonsCount || item.seasonsCount || 1) : undefined,
        episodesCount: item.type === 'tv' ? (details.episodesCount || item.episodesCount || 8) : undefined,
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
      return item;
    }
  }, [settings.tmdbApiKey]);

  // Toggle Watchlist
  const toggleWatchlist = useCallback((mediaId: string) => {
    setUserStates(prev => {
      const current = getOrCreateState(mediaId, prev);
      const updated = {
        ...prev,
        [mediaId]: {
          ...current,
          inWatchlist: !current.inWatchlist,
        },
      };
      saveUserStates(updated);
      return updated;
    });
  }, [getOrCreateState]);

  // Quick action: Remove from Watchlist
  const removeFromWatchlist = useCallback((mediaId: string) => {
    setUserStates(prev => {
      const current = getOrCreateState(mediaId, prev);
      const updated = {
        ...prev,
        [mediaId]: {
          ...current,
          inWatchlist: false,
        },
      };
      saveUserStates(updated);
      return updated;
    });
  }, [getOrCreateState]);

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
      return updated;
    });
  }, [getOrCreateState]);

  // Quick action: Mark Watching / In Progress
  const markWatching = useCallback((mediaId: string) => {
    setUserStates(prev => {
      const current = getOrCreateState(mediaId, prev);
      const updated = {
        ...prev,
        [mediaId]: {
          ...current,
          inWatchlist: true,
          isWatched: false,
          progressPercent: (current.progressPercent && current.progressPercent > 0 && current.progressPercent < 100)
            ? current.progressPercent
            : 50,
          lastWatchedAt: new Date().toISOString(),
        },
      };
      saveUserStates(updated);
      return updated;
    });
  }, [getOrCreateState]);

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
      return updated;
    });
  }, [getOrCreateState, mediaItems]);

  // Toggle Watched - Clicking again on watched toggles back to watching
  const toggleWatched = useCallback((mediaId: string) => {
    setUserStates(prev => {
      const current = getOrCreateState(mediaId, prev);
      const wasWatched = current.isWatched;
      const willBeWatched = !wasWatched;
      const mediaItem = mediaItems.find(m => m.id === mediaId);
      let nextTvProgress = current.tvProgress;

      if (mediaItem && mediaItem.type === 'tv') {
        const seasons = mediaItem.seasonsCount || 1;
        const totalEp = mediaItem.episodesCount || seasons * 8;
        const epPerSeason = Math.ceil(totalEp / seasons);
        const newCompleted: Record<string, boolean> = {};

        if (willBeWatched) {
          for (let s = 1; s <= seasons; s++) {
            for (let e = 1; e <= epPerSeason; e++) {
              newCompleted[`s${s}e${e}`] = true;
            }
          }
        }
        nextTvProgress = {
          currentSeason: willBeWatched ? seasons : 1,
          currentEpisode: willBeWatched ? epPerSeason : 1,
          completedEpisodes: newCompleted,
        };
      }

      const updated = {
        ...prev,
        [mediaId]: {
          ...current,
          isWatched: willBeWatched,
          progressPercent: willBeWatched
            ? 100
            : (current.progressPercent && current.progressPercent < 100 && current.progressPercent > 0 ? current.progressPercent : 50),
          lastWatchedAt: new Date().toISOString(),
          tvProgress: nextTvProgress,
        },
      };
      saveUserStates(updated);
      return updated;
    });
  }, [getOrCreateState, mediaItems]);

  // Toggle Favorite
  const toggleFavorite = useCallback((mediaId: string) => {
    setUserStates(prev => {
      const current = getOrCreateState(mediaId, prev);
      const updated = {
        ...prev,
        [mediaId]: {
          ...current,
          isFavorite: !current.isFavorite,
        },
      };
      saveUserStates(updated);
      return updated;
    });
  }, [getOrCreateState]);

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
      return updated;
    });
  }, [getOrCreateState]);

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
      return updated;
    });
  }, [getOrCreateState]);

  // Set Progress (0 - 100%)
  const setProgress = useCallback((mediaId: string, progressPercent: number) => {
    setUserStates(prev => {
      const current = getOrCreateState(mediaId, prev);
      const isComplete = progressPercent >= 95;
      const mediaItem = mediaItems.find(m => m.id === mediaId);
      let nextTvProgress = current.tvProgress;

      if (mediaItem && mediaItem.type === 'tv') {
        const seasons = mediaItem.seasonsCount || 1;
        const totalEp = mediaItem.episodesCount || seasons * 8;
        const epPerSeason = Math.ceil(totalEp / seasons);
        const targetCompletedCount = Math.round((progressPercent / 100) * totalEp);
        const newCompleted: Record<string, boolean> = {};

        let count = 0;
        let lastSeason = 1;
        let lastEp = 1;
        for (let s = 1; s <= seasons; s++) {
          for (let e = 1; e <= epPerSeason; e++) {
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

      const updated = {
        ...prev,
        [mediaId]: {
          ...current,
          progressPercent,
          isWatched: isComplete ? true : (progressPercent === 0 ? false : current.isWatched),
          lastWatchedAt: new Date().toISOString(),
          tvProgress: nextTvProgress,
        },
      };
      saveUserStates(updated);
      return updated;
    });
  }, [getOrCreateState, mediaItems]);

  // Toggle Episode for TV series - Calculates overall series progress directly from episode checks
  const toggleTVEpisode = useCallback(
    (mediaId: string, season: number, episode: number) => {
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

        const mediaItem = mediaItems.find(m => m.id === mediaId);
        const totalEpisodes = mediaItem?.episodesCount || (mediaItem?.seasonsCount ? mediaItem.seasonsCount * 8 : 8);
        const completedCount = Object.values(nextCompleted).filter(Boolean).length;
        const calculatedProgress = Math.min(100, Math.round((completedCount / Math.max(1, totalEpisodes)) * 100));
        const isAllDone = completedCount >= totalEpisodes && totalEpisodes > 0;

        const updated = {
          ...prev,
          [mediaId]: {
            ...current,
            progressPercent: isAllDone ? 100 : Math.max(calculatedProgress, completedCount > 0 ? 5 : 0),
            isWatched: isAllDone,
            lastWatchedAt: new Date().toISOString(),
            tvProgress: {
              currentSeason: season,
              currentEpisode: episode,
              completedEpisodes: nextCompleted,
            },
          },
        };
        saveUserStates(updated);
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
        return next;
      });
    },
    []
  );

  const deleteCustomList = useCallback((id: string) => {
    setCustomLists(prev => {
      const next = prev.filter(l => l.id !== id);
      saveCustomLists(next);
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
      return next;
    });
  }, []);

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
      return next;
    });
  }, []);

  // Add new media to cache (e.g. from search)
  const addMediaToLibrary = useCallback((item: MediaItem) => {
    setMediaItems(prev => {
      if (prev.some(m => m.id === item.id)) return prev;
      const next = [item, ...prev];
      saveMediaCache(next);
      return next;
    });
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

  // Delete All Data action
  const deleteAllData = useCallback(() => {
    deleteAllLibraryData();
    setUserStates({});
    setCustomLists([]);
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
    createCustomList,
    updateCustomList,
    deleteCustomList,
    addItemToList,
    removeItemFromList,
    addMediaToLibrary,
    getRandomItem,
    deleteAllData,
    resetAll,
    restoreBackup,
  };
}
