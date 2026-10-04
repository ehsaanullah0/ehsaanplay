import React, { useState, useMemo } from 'react';
import {
  MediaItem,
  PersonalMediaState,
  FilterState,
} from '../../types/movie';
import { MoviePoster } from '../common/MoviePoster';
import { FilterSheet } from './FilterSheet';
import { RandomModal } from './RandomModal';
import { SlidersHorizontal, Sparkles, Bookmark, Search, X } from 'lucide-react';

interface WatchlistViewProps {
  mediaItems: MediaItem[];
  userStates: Record<string, PersonalMediaState>;
  onSelectMedia: (item: MediaItem) => void;
  initialFilterStatus?: string;
  onRemoveFromWatchlist?: (id: string) => void;
  onMarkWatching?: (id: string) => void;
  onMarkWatched?: (id: string) => void;
}

const DEFAULT_FILTERS: FilterState = {
  type: 'all',
  status: 'watchlist',
  genre: 'all',
  year: 'all',
  minRating: 0,
  sortBy: 'recent',
  searchQuery: '',
};

export const WatchlistView: React.FC<WatchlistViewProps> = ({
  mediaItems,
  userStates,
  onSelectMedia,
  initialFilterStatus,
  onRemoveFromWatchlist,
  onMarkWatching,
  onMarkWatched,
}) => {
  const [filters, setFilters] = useState<FilterState>({
    ...DEFAULT_FILTERS,
    status: (initialFilterStatus as FilterState['status']) || 'watchlist',
  });
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [randomItem, setRandomItem] = useState<MediaItem | null>(null);
  const [isRandomModalOpen, setIsRandomModalOpen] = useState(false);

  // Extract all distinct genres across library
  const allGenres = useMemo(() => {
    const set = new Set<string>();
    mediaItems.forEach(item => {
      item.genres.forEach(g => set.add(g));
    });
    return Array.from(set).sort();
  }, [mediaItems]);

  // Filter & Sort Logic
  const filteredItems = useMemo(() => {
    return mediaItems.filter(item => {
      const state = userStates[item.id];

      // Format filter
      if (filters.type !== 'all' && item.type !== filters.type) return false;

      // Status filter
      if (filters.status === 'watchlist' && !state?.inWatchlist) return false;
      if (filters.status === 'watched' && !state?.isWatched) return false;
      if (filters.status === 'unwatched' && state?.isWatched) return false;
      if (filters.status === 'favorites' && !state?.isFavorite) return false;
      if (
        filters.status === 'in_progress' &&
        !(
          !state?.isWatched &&
          state?.progressPercent !== undefined &&
          state.progressPercent > 0 &&
          state.progressPercent < 100
        )
      ) {
        return false;
      }

      // Genre filter
      if (filters.genre !== 'all' && !item.genres.includes(filters.genre)) {
        return false;
      }

      // Search filter within watchlist
      if (filters.searchQuery.trim()) {
        const query = filters.searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(query);
        const matchesCast = item.cast.some(c => c.name.toLowerCase().includes(query));
        if (!matchesTitle && !matchesCast) return false;
      }

      return true;
    }).sort((a, b) => {
      const stateA = userStates[a.id];
      const stateB = userStates[b.id];

      if (filters.sortBy === 'recent') {
        const timeA = stateA?.addedAt || '1970-01-01';
        const timeB = stateB?.addedAt || '1970-01-01';
        return new Date(timeB).getTime() - new Date(timeA).getTime();
      }
      if (filters.sortBy === 'rating_desc') {
        const ratingA = stateA?.personalRating || a.tmdbRating;
        const ratingB = stateB?.personalRating || b.tmdbRating;
        return ratingB - ratingA;
      }
      if (filters.sortBy === 'rating_asc') {
        const ratingA = stateA?.personalRating || a.tmdbRating;
        const ratingB = stateB?.personalRating || b.tmdbRating;
        return ratingA - ratingB;
      }
      if (filters.sortBy === 'year_desc') return b.year - a.year;
      if (filters.sortBy === 'year_asc') return a.year - b.year;
      if (filters.sortBy === 'title_asc') return a.title.localeCompare(b.title);
      return 0;
    });
  }, [mediaItems, userStates, filters]);

  // Handle Random Pick
  const handleTriggerRandom = () => {
    if (filteredItems.length === 0) return;
    const randomIndex = Math.floor(Math.random() * filteredItems.length);
    setRandomItem(filteredItems[randomIndex]);
    setIsRandomModalOpen(true);
  };

  const hasActiveFilters =
    filters.type !== 'all' ||
    filters.status !== 'watchlist' ||
    filters.genre !== 'all' ||
    filters.sortBy !== 'recent' ||
    filters.searchQuery.length > 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 pb-28 md:pb-16">
      {/* Header & Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]">
            Collection
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight mt-0.5">
            Watchlist & Library
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
            {filteredItems.length} {filteredItems.length === 1 ? 'title' : 'titles'} matching your criteria
          </p>
        </div>

        {/* Quick Toolbar */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* In-view search box */}
          <div className="relative flex-1 sm:flex-initial">
            <Search className="w-4 h-4 text-[var(--text-secondary)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filters.searchQuery}
              onChange={e => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
              placeholder="Filter by title..."
              className="w-full sm:w-48 pl-9 pr-8 py-2 rounded-full bg-[var(--chip-bg)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] border border-[var(--border-subtle)]"
            />
            {filters.searchQuery && (
              <button
                onClick={() => setFilters(prev => ({ ...prev, searchQuery: '' }))}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Random Pick Button */}
          <button
            onClick={handleTriggerRandom}
            disabled={filteredItems.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[var(--chip-bg)] text-[var(--chip-text)] text-xs font-bold hover:opacity-90 disabled:opacity-50 transition active:scale-95 shadow-xs border border-[var(--border-subtle)]"
          >
            <Sparkles className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
            <span>Random Pick</span>
          </button>

          {/* Filter Modal Trigger */}
          <button
            onClick={() => setIsFilterSheetOpen(true)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-black transition shadow-xs ${
              hasActiveFilters
                ? 'bg-[#3A2C10] text-[#FED898]'
                : 'bg-[var(--bg-card-yellow)] text-[var(--text-card-yellow)] hover:opacity-90'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Filter & Sort</span>
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-current ml-0.5" />
            )}
          </button>
        </div>
      </div>

      {/* Active Filter Chips Row */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 mb-6 flex-wrap text-xs text-[var(--text-secondary)]">
          <span className="font-medium">Active filters:</span>
          {filters.status !== 'watchlist' && (
            <span className="px-2.5 py-1 rounded-full bg-[var(--chip-bg)] text-[var(--text-primary)] font-medium capitalize">
              {filters.status.replace('_', ' ')}
            </span>
          )}
          {filters.type !== 'all' && (
            <span className="px-2.5 py-1 rounded-full bg-[var(--chip-bg)] text-[var(--text-primary)] font-medium capitalize">
              {filters.type === 'tv' ? 'TV Series' : 'Movies'}
            </span>
          )}
          {filters.genre !== 'all' && (
            <span className="px-2.5 py-1 rounded-full bg-[var(--chip-bg)] text-[var(--text-primary)] font-medium">
              {filters.genre}
            </span>
          )}
          <button
            onClick={() => setFilters(DEFAULT_FILTERS)}
            className="text-xs text-[var(--accent-primary)] underline hover:opacity-80 ml-1 font-semibold"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Main Grid View */}
      {filteredItems.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
          {filteredItems.map(item => (
            <MoviePoster
              key={item.id}
              item={item}
              userState={userStates[item.id]}
              onClick={() => onSelectMedia(item)}
              onRemoveFromWatchlist={onRemoveFromWatchlist}
              onMarkWatching={onMarkWatching}
              onMarkWatched={onMarkWatched}
            />
          ))}
        </div>
      ) : (
        /* Calm Empty State */
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center max-w-sm mx-auto">
          <div className="w-16 h-16 rounded-full bg-[#EFECE1] flex items-center justify-center text-[#4E562F] mb-4">
            <Bookmark className="w-7 h-7 stroke-[1.5]" />
          </div>
          <h3 className="text-xl font-bold text-[#282C1B] tracking-tight">
            Your watchlist is waiting.
          </h3>
          <p className="mt-2 text-sm text-[#6A7056] leading-relaxed">
            Save something you want to watch later or adjust your active filters to discover more titles.
          </p>
          <button
            onClick={() => setFilters({ ...DEFAULT_FILTERS, status: 'all' })}
            className="mt-6 px-5 py-2.5 rounded-full bg-[#4E562F] text-[#FAF8F2] text-xs font-bold hover:bg-[#3E4524] transition shadow-xs"
          >
            View Entire Library
          </button>
        </div>
      )}

      {/* Filter Drawer / Sheet */}
      <FilterSheet
        isOpen={isFilterSheetOpen}
        onClose={() => setIsFilterSheetOpen(false)}
        filters={filters}
        onUpdateFilters={partial => setFilters(prev => ({ ...prev, ...partial }))}
        onResetFilters={() => setFilters(DEFAULT_FILTERS)}
        availableGenres={allGenres}
      />

      {/* Random Pick Modal */}
      <RandomModal
        item={randomItem}
        isOpen={isRandomModalOpen}
        onClose={() => setIsRandomModalOpen(false)}
        onSelectMedia={onSelectMedia}
        onPickAnother={handleTriggerRandom}
        userState={randomItem ? userStates[randomItem.id] : undefined}
      />
    </div>
  );
};
