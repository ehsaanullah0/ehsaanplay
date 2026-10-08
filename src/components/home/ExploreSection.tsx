import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { MediaItem, PersonalMediaState, MediaType } from '../../types/movie';
import { MoviePoster } from '../common/MoviePoster';
import { fetchExploreRecommendations } from '../../services/tmdb';
import { Compass, Sparkles, Filter, ChevronDown, RefreshCw, Film, Tv, Loader2, Star } from 'lucide-react';

interface ExploreSectionProps {
  mediaItems: MediaItem[];
  userStates: Record<string, PersonalMediaState>;
  onSelectMedia: (item: MediaItem) => void;
  onRemoveFromWatchlist?: (id: string) => void;
  onMarkWatching?: (id: string) => void;
  onMarkWatched?: (id: string) => void;
  onDismissFromWatching?: (id: string) => void;
  onToggleWatchlist?: (id: string) => void;
  onToggleFavorite?: (id: string) => void;
  tmdbApiKey?: string;
  onAddMediaToLibrary?: (item: MediaItem) => void;
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
  tmdbApiKey,
  onAddMediaToLibrary,
}) => {
  const [extraExploreItems, setExtraExploreItems] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState<'all' | MediaType | 'top_rated' | 'new_releases'>('all');
  const [genreFilter, setGenreFilter] = useState<string>('all');
  const [visibleCount, setVisibleCount] = useState<number>(18);

  // Fetch live 50+ TMDB Explore Recommendations on mount
  const loadExploreData = useCallback(async () => {
    setIsLoading(true);
    try {
      const items = await fetchExploreRecommendations(tmdbApiKey);
      if (items.length > 0) {
        setExtraExploreItems(items);
      }
    } catch (err) {
      console.error('Failed to load explore recommendations:', err);
    } finally {
      setIsLoading(false);
    }
  }, [tmdbApiKey]);

  useEffect(() => {
    loadExploreData();
  }, [loadExploreData]);

  // Combine mediaItems + extraExploreItems without duplicates
  const allPool = useMemo(() => {
    const map = new Map<string, MediaItem>();
    for (const item of mediaItems) {
      map.set(item.id, item);
    }
    for (const item of extraExploreItems) {
      if (!map.has(item.id)) {
        map.set(item.id, item);
      }
    }
    return Array.from(map.values());
  }, [mediaItems, extraExploreItems]);

  // STRICT REQUIREMENT: MUST BE THOSE MOVIES AND SERIES WHICH ARE NOT ADDED TO THE WATCHLIST
  const exploreRecommendations = useMemo(() => {
    return allPool.filter(item => {
      const state = userStates[item.id];
      // Exclude if already in watchlist
      if (state?.inWatchlist) return false;

      // Filter by type or top rated or new releases
      if (typeFilter === 'movie' && item.type !== 'movie') return false;
      if (typeFilter === 'tv' && item.type !== 'tv') return false;
      if (typeFilter === 'top_rated' && (item.tmdbRating || 0) < 7.5) return false;
      if (typeFilter === 'new_releases' && (item.year || 0) < 2025) return false;

      // Filter by genre
      if (genreFilter !== 'all' && !(item.genres || []).some(g => g.toLowerCase() === genreFilter.toLowerCase())) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      // Sort by newest release date first to ensure live updates of new releases are prioritized
      if (typeFilter === 'top_rated') {
        return (b.tmdbRating || 0) - (a.tmdbRating || 0);
      }
      
      const dateA = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
      const dateB = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
      
      if (dateB !== dateA) {
        return dateB - dateA;
      }
      return (b.tmdbRating || 0) - (a.tmdbRating || 0);
    });
  }, [allPool, userStates, typeFilter, genreFilter]);

  // Extract distinct genres from unadded explore items
  const availableGenres = useMemo(() => {
    const set = new Set<string>();
    allPool.forEach(item => {
      const state = userStates[item.id];
      if (!state?.inWatchlist && item.genres) {
        item.genres.forEach(g => set.add(g));
      }
    });
    return Array.from(set).slice(0, 10);
  }, [allPool, userStates]);

  const displayedItems = exploreRecommendations.slice(0, visibleCount);
  const hasMore = visibleCount < exploreRecommendations.length;

  return (
    <section className="mb-14 sm:mb-20 pt-8 border-t border-[var(--border-subtle)]">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--chip-bg)] text-[var(--chip-text)] text-xs font-bold uppercase tracking-wider mb-2 shadow-2xs">
            <Compass className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
            <span>Discover & Explore</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] tracking-tight">
            Explore Recommendations
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1 font-medium">
            {exploreRecommendations.length} trending and acclaimed titles from TMDB not yet in your watchlist
          </p>
        </div>

        {/* Filter Pills & Refresh Button */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Format Type Filter */}
          <div className="inline-flex p-1 rounded-full bg-[var(--bg-card-yellow)] text-[var(--text-card-yellow)] shadow-2xs border border-[var(--border-subtle)]">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                typeFilter === 'all'
                  ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-xs'
                  : 'opacity-80 hover:opacity-100'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setTypeFilter('new_releases')}
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition ${
                typeFilter === 'new_releases'
                  ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-xs'
                  : 'opacity-80 hover:opacity-100'
              }`}
            >
              <Sparkles className="w-3 h-3 text-[var(--accent-primary)]" />
              <span>New Releases</span>
            </button>
            <button
              onClick={() => setTypeFilter('movie')}
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition ${
                typeFilter === 'movie'
                  ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-xs'
                  : 'opacity-80 hover:opacity-100'
              }`}
            >
              <Film className="w-3 h-3" />
              <span>Movies</span>
            </button>
            <button
              onClick={() => setTypeFilter('tv')}
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition ${
                typeFilter === 'tv'
                  ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-xs'
                  : 'opacity-80 hover:opacity-100'
              }`}
            >
              <Tv className="w-3 h-3" />
              <span>Series</span>
            </button>
            <button
              onClick={() => setTypeFilter('top_rated')}
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition ${
                typeFilter === 'top_rated'
                  ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-xs'
                  : 'opacity-80 hover:opacity-100'
              }`}
            >
              <Star className="w-3 h-3 fill-current" />
              <span>Top Rated</span>
            </button>
          </div>

          {/* Refresh Button */}
          <button
            onClick={loadExploreData}
            disabled={isLoading}
            title="Refresh TMDB recommendations"
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
        <div className="py-16 text-center text-[#4E562F] flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-xs font-bold tracking-wider uppercase">
            Fetching 50+ recommendations from TMDB...
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
              userState={userStates[item.id]}
              onClick={() => onSelectMedia(item)}
              onRemoveFromWatchlist={onRemoveFromWatchlist}
              onMarkWatching={onMarkWatching}
              onMarkWatched={onMarkWatched}
              onDismissFromWatching={onDismissFromWatching}
              onToggleWatchlist={onToggleWatchlist}
              onToggleFavorite={onToggleFavorite}
              onAddMediaToLibrary={onAddMediaToLibrary}
            />
          ))}
        </div>
      )}

      {/* Empty State if all unadded filtered out */}
      {!isLoading && displayedItems.length === 0 && (
        <div className="p-10 rounded-3xl bg-[#F3EFE4] border border-[#4E562F]/10 text-center text-[#6A7056]">
          <p className="text-sm font-bold text-[#282C1B]">
            All titles matching this filter are already in your watchlist!
          </p>
          <p className="text-xs mt-1">
            Try switching filter tabs above or click Refresh to discover more.
          </p>
          <button
            onClick={() => {
              setTypeFilter('all');
              setGenreFilter('all');
            }}
            className="mt-4 px-4 py-2 rounded-full bg-[#4E562F] text-[#FAF8F2] text-xs font-bold"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* Show More Button */}
      {hasMore && (
        <div className="mt-8 text-center">
          <button
            onClick={() => setVisibleCount(prev => prev + 18)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#FAF8F2] hover:bg-[#EFECE1] text-[#282C1B] text-xs font-bold transition border border-[#4E562F]/15 shadow-xs active:scale-95"
          >
            <ChevronDown className="w-4 h-4 text-[#4E562F]" />
            <span>Load More Recommendations ({exploreRecommendations.length - displayedItems.length} remaining)</span>
          </button>
        </div>
      )}
    </section>
  );
};
