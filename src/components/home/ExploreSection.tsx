import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { MediaItem, PersonalMediaState, MediaType, AppTweaksConfig, UserSettings, CustomList } from '../../types/movie';
import { resolveStateForMediaItem } from '../../utils/mediaDedup';
import { MoviePoster } from '../common/MoviePoster';
import { fetchExploreRecommendations } from '../../data/curatedCatalog';
import { Compass, Sparkles, RefreshCw, Film, Tv, Loader2, Star, LayoutGrid, ChevronDown } from 'lucide-react';

interface ExploreSectionProps {
  mediaItems: MediaItem[];
  userStates: Record<string, PersonalMediaState>;
  onSelectMedia: (item: MediaItem) => void;
  onRemoveFromWatchlist?: (id: string) => void;
  onMarkWatching?: (id: string, item?: MediaItem) => void;
  onMarkWatched?: (id: string, item?: MediaItem) => void;
  onDismissFromWatching?: (id: string) => void;
  onToggleWatchlist?: (id: string, item?: MediaItem) => void;
  onToggleFavorite?: (id: string, item?: MediaItem) => void;
  omdbApiKey?: string;
  tmdbApiKey?: string;
  onAddMediaToLibrary?: (item: MediaItem) => void;
  customLists?: CustomList[];
  onAddItemToList?: (listId: string, mediaId: string, item?: MediaItem) => void;
  onRemoveItemFromList?: (listId: string, mediaId: string) => void;
  tweaks?: AppTweaksConfig;
  recommendationProvider?: 'tmdb' | 'omdb';
  onUpdateSettings?: (partial: Partial<UserSettings>) => void;
}

export const ExploreSection: React.FC<ExploreSectionProps> = ({
  mediaItems,
  userStates,
  onSelectMedia,
  onRemoveFromWatchlist,
  onMarkWatching,
  onMarkWatched,
  onDismissFromWatching,
  onToggleWatchlist,
  onToggleFavorite,
  omdbApiKey,
  tmdbApiKey,
  onAddMediaToLibrary,
  customLists,
  onAddItemToList,
  onRemoveItemFromList,
  tweaks,
  recommendationProvider: initialProvider = 'tmdb',
  onUpdateSettings,
}) => {
  const [provider, setProvider] = useState<'tmdb' | 'omdb'>(initialProvider);
  const providerCacheRef = useRef<Record<string, MediaItem[]>>({});
  const [extraExploreItems, setExtraExploreItems] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState<'all' | MediaType | 'top_rated' | 'new_releases'>('all');
  const [genreFilter, setGenreFilter] = useState<string>('all');
  const [visibleCount, setVisibleCount] = useState<number>(24);

  // Sync provider if prop changes
  useEffect(() => {
    if (initialProvider && initialProvider !== provider) {
      setProvider(initialProvider);
    }
  }, [initialProvider]);

  // Load recommendations according to active provider (TMDB or OMDb) with instant cache hit
  const loadExploreData = useCallback(async (prov: 'tmdb' | 'omdb' = provider, forceRefresh = false) => {
    const cacheKey = `${prov}_${tmdbApiKey || ''}_${omdbApiKey || ''}`;
    if (!forceRefresh && providerCacheRef.current[cacheKey] && providerCacheRef.current[cacheKey].length >= 50) {
      setExtraExploreItems(providerCacheRef.current[cacheKey]);
      return;
    }

    setIsLoading(true);
    try {
      const items = await fetchExploreRecommendations(prov, tmdbApiKey, omdbApiKey, forceRefresh);
      if (items && items.length > 0) {
        providerCacheRef.current[cacheKey] = items;
        setExtraExploreItems(items);
      }
    } catch (err) {
      console.error(`Failed to load ${prov.toUpperCase()} recommendations:`, err);
    } finally {
      setIsLoading(false);
    }
  }, [provider, tmdbApiKey, omdbApiKey]);

  useEffect(() => {
    loadExploreData(provider);
  }, [provider, loadExploreData]);

  // Switch between TMDB and OMDb recommendation engines
  const handleSwitchProvider = (newProvider: 'tmdb' | 'omdb') => {
    if (newProvider === provider) return;
    setProvider(newProvider);
    setGenreFilter('all');
    setVisibleCount(24);
    if (onUpdateSettings) {
      onUpdateSettings({ recommendationProvider: newProvider });
    }
  };

  // STRICT EXCLUSION: Filter out ONLY titles that have an active user state (Watchlist, Watched, Favorites, In-Progress, Rated, Noted)
  // Do NOT exclude un-saved discovery/cache entries stored in mediaItems!
  const isExcluded = useMemo(() => {
    const activeIds = new Set<string>();
    const activeImdbIds = new Set<string>();
    const activeTmdbIds = new Set<string>();
    const activeTitleKeys = new Set<string>();

    const normalizeTitle = (t?: string) => (t || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

    const mediaById = new Map<string, MediaItem>();
    for (const m of mediaItems) {
      if (m.id) mediaById.set(m.id.toLowerCase(), m);
      if (m.imdbId) mediaById.set(m.imdbId.toLowerCase(), m);
      if (m.tmdbId) mediaById.set(`tmdb-${m.type || 'movie'}-${m.tmdbId}`, m);
    }

    for (const [id, state] of Object.entries(userStates)) {
      if (!state) continue;
      const isInteracted =
        Boolean(state.inWatchlist) ||
        Boolean(state.isWatched) ||
        Boolean(state.isFavorite) ||
        (state.progressPercent !== undefined && state.progressPercent > 0) ||
        Boolean(state.personalRating) ||
        Boolean(state.notes && state.notes.trim().length > 0);

      if (!isInteracted) continue;

      activeIds.add(id.toLowerCase());
      const matched = mediaById.get(id.toLowerCase());
      if (matched) {
        if (matched.id) activeIds.add(matched.id.toLowerCase());
        if (matched.imdbId) activeImdbIds.add(matched.imdbId.toLowerCase());
        if (matched.tmdbId) activeTmdbIds.add(`${matched.type || 'movie'}-${matched.tmdbId}`);
        const nt = normalizeTitle(matched.title);
        if (nt) activeTitleKeys.add(`${matched.type || 'movie'}-${nt}-${matched.year || ''}`);
      }
    }

    return (item: MediaItem) => {
      if (item.id && activeIds.has(item.id.toLowerCase())) return true;
      if (item.imdbId && (activeImdbIds.has(item.imdbId.toLowerCase()) || activeIds.has(item.imdbId.toLowerCase()))) return true;
      if (item.tmdbId) {
        const tKey = `${item.type || 'movie'}-${item.tmdbId}`;
        if (activeTmdbIds.has(tKey) || activeIds.has(`tmdb-${tKey}`)) return true;
      }

      const nt = normalizeTitle(item.title);
      if (nt) {
        if (activeTitleKeys.has(`${item.type || 'movie'}-${nt}-${item.year || ''}`)) return true;
        if (item.year) {
          if (
            activeTitleKeys.has(`${item.type || 'movie'}-${nt}-${item.year - 1}`) ||
            activeTitleKeys.has(`${item.type || 'movie'}-${nt}-${item.year + 1}`)
          ) {
            return true;
          }
        }
      }

      return false;
    };
  }, [mediaItems, userStates]);

  const currentYear = new Date().getFullYear();

  // Apply exclusions and type/genre filters to the external recommendation pool
  const exploreRecommendations = useMemo(() => {
    const indexed = extraExploreItems
      .map((item, idx) => ({ item, idx }))
      .filter(({ item }) => {
        if (isExcluded(item)) return false;

        if (typeFilter === 'movie' && item.type !== 'movie') return false;
        if (typeFilter === 'tv' && item.type !== 'tv') return false;
        if (typeFilter === 'top_rated' && (item.imdbRating || 0) < 7.2 && (item.tmdbRating || 0) < 7.2) return false;
        if (typeFilter === 'new_releases' && (item.year || 0) < currentYear - 1) return false;

        if (genreFilter !== 'all' && !(item.genres || []).some(g => g.toLowerCase() === genreFilter.toLowerCase())) {
          return false;
        }

        return true;
      });

    if (typeFilter === 'top_rated') {
      indexed.sort((a, b) => {
        const rA = a.item.imdbRating || a.item.tmdbRating || 0;
        const rB = b.item.imdbRating || b.item.tmdbRating || 0;
        if (rB !== rA) return rB - rA;
        return (b.item.voteCount || 0) - (a.item.voteCount || 0);
      });
    } else if (typeFilter === 'new_releases') {
      indexed.sort((a, b) => {
        const yA = a.item.year || 0;
        const yB = b.item.year || 0;
        if (yB !== yA) return yB - yA;
        return a.idx - b.idx;
      });
    }

    return indexed.map(entry => entry.item);
  }, [extraExploreItems, isExcluded, typeFilter, genreFilter, currentYear]);

  // Extract distinct genres from unadded explore items
  const availableGenres = useMemo(() => {
    const counts = new Map<string, number>();
    extraExploreItems.forEach(item => {
      if (!isExcluded(item) && item.genres) {
        item.genres.forEach(g => {
          if (g && g !== 'Movie' && g !== 'TV Series') {
            counts.set(g, (counts.get(g) || 0) + 1);
          }
        });
      }
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([genre]) => genre)
      .slice(0, 12);
  }, [extraExploreItems, isExcluded]);

  const displayedItems = exploreRecommendations.slice(0, visibleCount);
  const hasMore = visibleCount < exploreRecommendations.length;

  // Toggle state for whether text labels are shown in the yellow selection bar (default: false, icon-only)
  const showLabels = Boolean(tweaks?.showExploreFilterLabels);

  return (
    <section className="mb-14 sm:mb-20 pt-8 border-t border-[var(--border-subtle)]">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--chip-bg)] text-[var(--chip-text)] text-xs font-bold uppercase tracking-wider shadow-2xs">
              <Compass className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
              <span>Discover & Explore</span>
            </div>

            {/* Provider Switcher Pill: TMDB vs OMDb */}
            <div className="inline-flex items-center p-0.5 rounded-full bg-[var(--bg-card-olive)]/60 border border-[var(--border-subtle)] text-[11px] font-bold shadow-2xs">
              <button
                onClick={() => handleSwitchProvider('tmdb')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full transition active:scale-95 ${
                  provider === 'tmdb'
                    ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-xs font-extrabold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] opacity-75'
                }`}
                title="Switch to TMDB latest trending recommendations"
              >
                <span className="w-2 h-2 rounded-full bg-[#EF4444] shrink-0" />
                <span>TMDB</span>
              </button>
              <button
                onClick={() => handleSwitchProvider('omdb')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full transition active:scale-95 ${
                  provider === 'omdb'
                    ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-xs font-extrabold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] opacity-75'
                }`}
                title="Switch to OMDb latest trending recommendations"
              >
                <span className="w-2 h-2 rounded-full bg-[#3B82F6] shrink-0" />
                <span>OMDb</span>
              </button>
            </div>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] tracking-tight">
            Explore Recommendations
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1 font-medium">
            {exploreRecommendations.length} latest trending {provider.toUpperCase()} recommendations not in your watchlist or watched section
          </p>
        </div>

        {/* Filter Selection Bar (Yellow Bar) & Refresh Button */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Format Type Filter in Yellow Bar (Icon-only by default, toggleable via Tweaks) */}
          <div className="inline-flex p-1 rounded-full bg-[var(--bg-card-yellow)] text-[var(--text-card-yellow)] shadow-2xs border border-[var(--border-subtle)] items-center">
            <button
              onClick={() => setTypeFilter('all')}
              title="All Titles"
              aria-label="All Titles"
              className={`inline-flex items-center gap-1.5 rounded-full text-xs font-bold transition active:scale-95 ${
                showLabels ? 'px-3 py-1.5' : 'p-2'
              } ${
                typeFilter === 'all'
                  ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-xs'
                  : 'opacity-80 hover:opacity-100'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              {showLabels && <span>All</span>}
            </button>
            <button
              onClick={() => setTypeFilter('new_releases')}
              title={`New Releases (${currentYear - 1}-${currentYear})`}
              aria-label="New Releases"
              className={`inline-flex items-center gap-1.5 rounded-full text-xs font-bold transition active:scale-95 ${
                showLabels ? 'px-3 py-1.5' : 'p-2'
              } ${
                typeFilter === 'new_releases'
                  ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-xs'
                  : 'opacity-80 hover:opacity-100'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
              {showLabels && <span>New Releases</span>}
            </button>
            <button
              onClick={() => setTypeFilter('movie')}
              title="Movies"
              aria-label="Movies"
              className={`inline-flex items-center gap-1.5 rounded-full text-xs font-bold transition active:scale-95 ${
                showLabels ? 'px-3 py-1.5' : 'p-2'
              } ${
                typeFilter === 'movie'
                  ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-xs'
                  : 'opacity-80 hover:opacity-100'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              {showLabels && <span>Movies</span>}
            </button>
            <button
              onClick={() => setTypeFilter('tv')}
              title="TV Series"
              aria-label="TV Series"
              className={`inline-flex items-center gap-1.5 rounded-full text-xs font-bold transition active:scale-95 ${
                showLabels ? 'px-3 py-1.5' : 'p-2'
              } ${
                typeFilter === 'tv'
                  ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-xs'
                  : 'opacity-80 hover:opacity-100'
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              {showLabels && <span>Series</span>}
            </button>
            <button
              onClick={() => setTypeFilter('top_rated')}
              title="Top Rated"
              aria-label="Top Rated"
              className={`inline-flex items-center gap-1.5 rounded-full text-xs font-bold transition active:scale-95 ${
                showLabels ? 'px-3 py-1.5' : 'p-2'
              } ${
                typeFilter === 'top_rated'
                  ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-xs'
                  : 'opacity-80 hover:opacity-100'
              }`}
            >
              <Star className="w-3.5 h-3.5 fill-current" />
              {showLabels && <span>Top Rated</span>}
            </button>
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => loadExploreData(provider, true)}
            disabled={isLoading}
            title={`Refresh ${provider.toUpperCase()} recommendations`}
            aria-label={`Refresh ${provider.toUpperCase()} recommendations`}
            className="p-2 rounded-full bg-[var(--bg-card-yellow)] hover:opacity-90 text-[var(--text-card-yellow)] transition active:scale-95 disabled:opacity-50 border border-[var(--border-subtle)]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Genre Pills */}
      {availableGenres.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-3 mb-6">
          <button
            onClick={() => setGenreFilter('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap ${
              genreFilter === 'all'
                ? 'bg-[var(--text-primary)] text-[var(--bg-primary)] shadow-xs'
                : 'bg-[var(--chip-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            All Genres
          </button>
          {availableGenres.map(genre => (
            <button
              key={genre}
              onClick={() => setGenreFilter(genre === genreFilter ? 'all' : genre)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap ${
                genreFilter === genre
                  ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] shadow-xs'
                  : 'bg-[var(--chip-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {genre}
            </button>
          ))}
        </div>
      )}

      {/* Loading state skeleton */}
      {isLoading && displayedItems.length === 0 && (
        <div className="py-16 text-center text-[var(--text-secondary)] flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-primary)]" />
          <p className="text-xs font-bold tracking-wider uppercase">
            Fetching latest trending titles from {provider.toUpperCase()}...
          </p>
        </div>
      )}

      {/* Grid of Recommended Titles */}
      {displayedItems.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 sm:gap-5">
          {displayedItems.map(item => (
            <MoviePoster
              key={item.id}
              item={item}
              userState={resolveStateForMediaItem(item, userStates)}
              onClick={() => onSelectMedia(item)}
              onRemoveFromWatchlist={onRemoveFromWatchlist}
              onMarkWatching={(id, clickedItem) => {
                onAddMediaToLibrary?.(clickedItem || item);
                onMarkWatching?.(id, clickedItem || item);
              }}
              onMarkWatched={(id, clickedItem) => {
                onAddMediaToLibrary?.(clickedItem || item);
                onMarkWatched?.(id, clickedItem || item);
              }}
              onDismissFromWatching={onDismissFromWatching}
              onToggleWatchlist={(id, clickedItem) => {
                onAddMediaToLibrary?.(clickedItem || item);
                onToggleWatchlist?.(id, clickedItem || item);
              }}
              onToggleFavorite={(id, clickedItem) => {
                onAddMediaToLibrary?.(clickedItem || item);
                onToggleFavorite?.(id, clickedItem || item);
              }}
              onAddMediaToLibrary={onAddMediaToLibrary}
              customLists={customLists}
              onAddItemToList={onAddItemToList}
              onRemoveItemFromList={onRemoveItemFromList}
            />
          ))}
        </div>
      )}

      {/* Empty State if all unadded filtered out */}
      {!isLoading && displayedItems.length === 0 && (
        <div className="p-10 rounded-3xl bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] text-center text-[var(--text-secondary)] shadow-2xs">
          <p className="text-sm font-bold text-[var(--text-primary)]">
            All {provider.toUpperCase()} titles in this category are already in your watchlist or watched section!
          </p>
          <p className="text-xs mt-1">
            Try switching filter tabs above, switching to {provider === 'tmdb' ? 'OMDb' : 'TMDB'}, or click Refresh to discover more.
          </p>
          <div className="flex items-center justify-center gap-3 mt-4">
            <button
              onClick={() => {
                setTypeFilter('all');
                setGenreFilter('all');
              }}
              className="px-4 py-2 rounded-full bg-[var(--chip-bg)] text-[var(--text-primary)] text-xs font-bold hover:opacity-90 active:scale-95 transition"
            >
              Reset Filters
            </button>
            <button
              onClick={() => handleSwitchProvider(provider === 'tmdb' ? 'omdb' : 'tmdb')}
              className="px-4 py-2 rounded-full bg-[var(--accent-primary)] text-[var(--bg-primary)] text-xs font-bold hover:opacity-90 active:scale-95 transition"
            >
              Switch to {provider === 'tmdb' ? 'OMDb' : 'TMDB'}
            </button>
          </div>
        </div>
      )}

      {/* Show More Button */}
      {hasMore && (
        <div className="mt-8 text-center">
          <button
            onClick={() => setVisibleCount(prev => prev + 24)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[var(--chip-bg)] hover:opacity-90 text-[var(--text-primary)] text-xs font-bold transition border border-[var(--border-subtle)] shadow-xs active:scale-95"
          >
            <ChevronDown className="w-4 h-4 text-[var(--accent-primary)]" />
            <span>Load More Recommendations ({exploreRecommendations.length - displayedItems.length} remaining)</span>
          </button>
        </div>
      )}
    </section>
  );
};
