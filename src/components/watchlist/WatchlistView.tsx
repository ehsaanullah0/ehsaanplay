import React, { useState, useMemo } from 'react';
import {
  MediaItem,
  PersonalMediaState,
  FilterState,
  UserSettings,
} from '../../types/movie';
import { SafeImage } from '../common/SafeImage';
import { MoviePoster } from '../common/MoviePoster';
import { FilterSheet } from './FilterSheet';
import { RandomModal } from './RandomModal';
import {
  SlidersHorizontal,
  Sparkles,
  Bookmark,
  Search,
  X,
  Star,
  Check,
  Share2,
  Trash2,
  Download,
} from 'lucide-react';
import { getNextChangeId, LibraryChangeEntry, RecentChangesPackage } from '../../services/recentChanges';

interface WatchlistViewProps {
  mediaItems: MediaItem[];
  userStates: Record<string, PersonalMediaState>;
  onSelectMedia: (item: MediaItem) => void;
  initialFilterStatus?: string;
  onRemoveFromWatchlist?: (id: string) => void;
  onMarkWatching?: (id: string) => void;
  onMarkWatched?: (id: string) => void;
  onDismissFromWatching?: (id: string) => void;
  onToggleWatchlist?: (id: string) => void;
  onToggleFavorite?: (id: string) => void;
  onNavigateToDiscover?: () => void;
  viewMode?: 'grid' | 'list' | 'cards';
  settings?: UserSettings;
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
  onDismissFromWatching,
  onToggleWatchlist,
  onToggleFavorite,
  onNavigateToDiscover,
  viewMode = 'grid',
  settings,
}) => {
  const [filters, setFilters] = useState<FilterState>({
    ...DEFAULT_FILTERS,
    status: (initialFilterStatus as FilterState['status']) || 'watchlist',
  });
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [randomItem, setRandomItem] = useState<MediaItem | null>(null);
  const [isRandomModalOpen, setIsRandomModalOpen] = useState(false);

  // Batch Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const isSelectionModeActive = selectedIds.size > 0;

  const handleToggleItemSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleLongPressItem = (id: string) => {
    if (settings?.tweaks?.longPressBatchSelection) {
      handleToggleItemSelection(id);
    }
  };

  // Helper to create a change package for only selected items
  const createSelectedItemsChangePackage = (
    itemIds: string[],
    mediaItemsList: MediaItem[],
    statesMap: Record<string, PersonalMediaState>
  ): RecentChangesPackage => {
    const changes: LibraryChangeEntry[] = [];
    let currentChangeId = getNextChangeId();

    itemIds.forEach((id) => {
      const item = mediaItemsList.find(m => m.id === id);
      if (item) {
        const state = statesMap[id];
        currentChangeId += 1;
        changes.push({
          changeId: currentChangeId,
          timestamp: Date.now(),
          entityId: id,
          operation: 'add',
          data: {
            mediaItem: item,
            state: state || {
              mediaId: id,
              inWatchlist: true,
              isWatched: false,
              isFavorite: false,
              addedAt: new Date().toISOString(),
            },
          },
        });
      }
    });

    return {
      format: 'ehsaan-play-recent-changes',
      version: 1,
      exportedAt: Date.now(),
      fromChangeId: changes[0]?.changeId || currentChangeId,
      toChangeId: changes[changes.length - 1]?.changeId || currentChangeId,
      changeCount: changes.length,
      changes,
    };
  };

  // Download Selected Items as a Change-JSON
  const handleBatchDownloadJSON = () => {
    try {
      const selectedList = Array.from(selectedIds);
      const pkg = createSelectedItemsChangePackage(selectedList, mediaItems, userStates);
      
      const jsonString = JSON.stringify(pkg, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ehsaan-play-watchlist-selection-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setIsShareModalOpen(false);
      setSelectedIds(new Set()); // Clear selection after export
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to export selection.');
    }
  };

  // Share Selected Items via Web Share API
  const handleBatchNativeShare = async () => {
    try {
      const selectedList = Array.from(selectedIds);
      const pkg = createSelectedItemsChangePackage(selectedList, mediaItems, userStates);
      const jsonString = JSON.stringify(pkg, null, 2);

      if (typeof navigator !== 'undefined' && navigator.share) {
        const file = new File([jsonString], `ehsaan-play-shared-changes-${Date.now()}.json`, { type: 'application/json' });
        
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'EHSAAN PLAY Watchlist Selection',
            text: `Here are my shared watchlist items from EHSAAN PLAY! (${selectedList.length} titles)`,
          });
        } else {
          await navigator.share({
            title: 'EHSAAN PLAY Watchlist Selection',
            text: jsonString,
          });
        }
        setIsShareModalOpen(false);
        setSelectedIds(new Set()); // Clear selection after share
      } else {
        // Clipboard fallback for browsers without navigator.share
        await navigator.clipboard.writeText(jsonString);
        alert('✓ Copied Change-JSON payload to clipboard! Share it with your friends to let them import it.');
        setIsShareModalOpen(false);
        setSelectedIds(new Set());
      }
    } catch (err) {
      console.error('Sharing failed', err);
    }
  };

  const handleBatchDelete = () => {
    const count = selectedIds.size;
    if (window.confirm(`Are you sure you want to remove these ${count} selected items from your watchlist?`)) {
      if (onRemoveFromWatchlist) {
        selectedIds.forEach((id) => {
          onRemoveFromWatchlist(id);
        });
      }
      setSelectedIds(new Set()); // Clear selection after deletion
    }
  };

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
      if (filters.status === 'watchlist') {
        // Default: items in user's watchlist that are NOT watched
        if (!state?.inWatchlist || state?.isWatched) return false;
      } else if (filters.status === 'watched') {
        if (!state?.isWatched) return false;
      } else if (filters.status === 'unwatched') {
        // Unwatched in user's personal collection: must be saved to watchlist/library and not watched
        if (!state?.inWatchlist || state?.isWatched) return false;
      } else if (filters.status === 'favorites') {
        if (!state?.isFavorite) return false;
      } else if (filters.status === 'in_progress') {
        if (
          !(
            !state?.isWatched &&
            state?.progressPercent !== undefined &&
            state.progressPercent > 0 &&
            state.progressPercent < 100
          )
        ) {
          return false;
        }
      } else if (filters.status === 'all') {
        // All items in user's personal collection/library
        const hasInteraction =
          state &&
          (state.inWatchlist ||
            state.isWatched ||
            state.isFavorite ||
            (state.progressPercent !== undefined && state.progressPercent > 0) ||
            state.personalRating ||
            state.notes);
        if (!hasInteraction) return false;
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

          {/* Batch Selection Action Buttons beside (before) random pick button */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 animate-scale-up">
              {/* Delete Button */}
              <button
                onClick={handleBatchDelete}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[var(--chip-bg)] text-[var(--text-primary)] hover:bg-[var(--border-subtle)] border border-[var(--border-subtle)] text-xs font-bold transition active:scale-95 shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5 stroke-[2.2]" />
                <span>Delete ({selectedIds.size})</span>
              </button>

              {/* Share Button */}
              <button
                onClick={() => setIsShareModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[var(--accent-primary)] text-[var(--bg-primary)] hover:opacity-95 text-xs font-bold transition active:scale-95 shadow-xs"
              >
                <Share2 className="w-3.5 h-3.5 stroke-[2.2]" />
                <span>Share ({selectedIds.size})</span>
              </button>

              {/* Clear Selection Button */}
              <button
                onClick={() => setSelectedIds(new Set())}
                className="p-2 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--chip-bg)] transition active:scale-95"
                title="Clear selection"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Subtle divider */}
              <div className="w-[1px] h-5 bg-[var(--border-subtle)] mx-1" />
            </div>
          )}

          {/* Random Pick Button (In Secondary Theme Color) */}
          <button
            onClick={handleTriggerRandom}
            disabled={filteredItems.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[var(--accent-secondary)] text-[var(--accent-secondary-text)] text-xs font-bold hover:opacity-90 disabled:opacity-50 transition active:scale-95 shadow-xs border border-[var(--border-subtle)]"
          >
            <Sparkles className="w-3.5 h-3.5 text-[var(--accent-secondary-text)]" />
            <span>Random Pick</span>
          </button>

          {/* Filter Modal Trigger */}
          <button
            onClick={() => setIsFilterSheetOpen(true)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-black transition shadow-xs ${
              hasActiveFilters
                ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)]'
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

      {/* Main Grid / List View */}
      {filteredItems.length > 0 ? (
        viewMode === 'list' ? (
          <div className="space-y-3">
            {filteredItems.map(item => {
              const state = userStates[item.id];
              const rating = state?.personalRating || item.tmdbRating;
              const progress = state?.progressPercent || 0;
              const year = item.releaseDate ? item.releaseDate.split('-')[0] : '';

              return (
                <div
                  key={item.id}
                  onClick={(e) => {
                    if (selectedIds.size > 0) {
                      e.stopPropagation();
                      handleToggleItemSelection(item.id);
                    } else {
                      onSelectMedia(item);
                    }
                  }}
                  className={`group p-3.5 sm:p-4 rounded-2xl bg-[var(--bg-surface-card)] hover:shadow-md transition flex items-center gap-4 cursor-pointer text-left select-none border ${
                    selectedIds.has(item.id)
                      ? 'border-[var(--accent-primary)] ring-1 ring-[var(--accent-primary)] bg-[var(--accent-primary)]/5'
                      : 'border-[var(--border-subtle)]'
                  }`}
                >
                  {/* Selection Circle in List View */}
                  {selectedIds.size > 0 && (
                    <div className="mr-1 shrink-0">
                      {selectedIds.has(item.id) ? (
                        <div className="w-5 h-5 rounded-full bg-[var(--accent-primary)] text-[var(--bg-primary)] flex items-center justify-center border border-[var(--bg-primary)] shadow-xs animate-scale-up">
                          <Check className="w-3 h-3 stroke-[3.5]" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full border border-[var(--text-secondary)]/40" />
                      )}
                    </div>
                  )}

                  {/* Poster Thumbnail */}
                  <div className="w-16 h-24 sm:w-20 sm:h-28 rounded-xl overflow-hidden bg-[var(--chip-bg)] shrink-0 shadow-2xs">
                    <SafeImage
                      src={item.posterUrl}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-extrabold text-[var(--text-primary)] truncate group-hover:text-[var(--accent-primary)] transition-colors">
                        {item.title}
                      </h3>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[var(--chip-bg)] text-[var(--text-secondary)] shrink-0 uppercase tracking-wider">
                        {item.type === 'tv' ? 'Series' : 'Movie'}
                      </span>
                    </div>

                    <div className="mt-1 flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)] flex-wrap">
                      {year && <span>{year}</span>}
                      {year && rating > 0 && <span aria-hidden="true">·</span>}
                      {rating > 0 && (
                        <span className="flex items-center gap-1 font-bold text-[var(--text-primary)]">
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                          <span>{rating.toFixed(1)}</span>
                        </span>
                      )}
                      {item.genres && item.genres.length > 0 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="truncate max-w-[200px] sm:max-w-none">
                            {item.genres.slice(0, 2).join(', ')}
                          </span>
                        </>
                      )}
                    </div>

                    {item.overview && (
                      <p className="mt-1.5 text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed hidden sm:block">
                        {item.overview}
                      </p>
                    )}

                    {/* Status Badge & Progress */}
                    <div className="mt-2.5 flex items-center gap-2">
                      {state?.isWatched && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[var(--bg-card-olive)] text-[var(--text-card-olive)]">
                          <Check className="w-3 h-3 stroke-[2.5]" /> Watched
                        </span>
                      )}
                      {state?.inWatchlist && !state?.isWatched && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[var(--chip-bg)] text-[var(--text-primary)]">
                          <Bookmark className="w-3 h-3 fill-current" /> Watchlist
                        </span>
                      )}
                      {progress > 0 && !state?.isWatched && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-[var(--accent-primary)]">
                          {progress}% completed
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
            {filteredItems.map(item => (
              <MoviePoster
                key={item.id}
                item={item}
                userState={userStates[item.id]}
                onClick={() => {
                  if (selectedIds.size > 0) {
                    handleToggleItemSelection(item.id);
                  } else {
                    onSelectMedia(item);
                  }
                }}
                onRemoveFromWatchlist={onRemoveFromWatchlist}
                onMarkWatching={onMarkWatching}
                onMarkWatched={onMarkWatched}
                onDismissFromWatching={onDismissFromWatching}
                onToggleWatchlist={onToggleWatchlist}
                onToggleFavorite={onToggleFavorite}
                isSelected={selectedIds.has(item.id)}
                isSelectionModeActive={selectedIds.size > 0}
                onLongPress={settings?.tweaks?.longPressBatchSelection ? () => handleLongPressItem(item.id) : undefined}
              />
            ))}
          </div>
        )
      ) : (
        /* Calm Empty State */
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center max-w-sm mx-auto select-none">
          <div className="w-16 h-16 rounded-3xl bg-[var(--accent-secondary)] text-[var(--accent-secondary-text)] flex items-center justify-center mb-4 border border-[var(--border-subtle)] shadow-xs">
            <Bookmark className="w-7 h-7 stroke-[2]" />
          </div>
          <h3 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
            Your watchlist is empty.
          </h3>
          <p className="mt-2 text-sm text-[var(--text-secondary)] leading-relaxed">
            Save movies and TV series you want to watch by tapping the bookmark icon or + on any title.
          </p>
          {onNavigateToDiscover && (
            <button
              onClick={onNavigateToDiscover}
              className="mt-6 px-6 py-2.5 rounded-full bg-[var(--accent-primary)] text-[var(--bg-primary)] text-xs font-bold hover:opacity-90 transition shadow-xs active:scale-95"
            >
              Discover Movies & Shows
            </button>
          )}
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

      {/* Custom Themed Share & Export Modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsShareModalOpen(false)}
          />

          {/* Modal Container */}
          <div className="relative w-full max-w-md bg-[var(--bg-surface-card)] rounded-3xl border border-[var(--border-subtle)] p-6 sm:p-8 shadow-2xl animate-scale-up text-left space-y-6">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-[var(--accent-primary)]">
                Batch Transfer
              </span>
              <h3 className="text-xl font-black text-[var(--text-primary)] tracking-tight mt-0.5">
                Share Watchlist Items
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                You have selected <strong className="text-[var(--text-primary)] font-extrabold">{selectedIds.size}</strong> item{selectedIds.size !== 1 ? 's' : ''}. How would you like to transfer them?
              </p>
            </div>

            {/* Selection Grid */}
            <div className="grid grid-cols-1 gap-3.5">
              {/* Option 1: Download Change JSON File */}
              <button
                onClick={handleBatchDownloadJSON}
                className="flex items-center gap-4 p-4 rounded-2xl bg-[var(--chip-bg)] hover:bg-[var(--border-subtle)] border border-[var(--border-subtle)] text-left transition duration-200 active:scale-[0.98] group"
              >
                <div className="w-10 h-10 rounded-xl bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] flex items-center justify-center shrink-0">
                  <Download className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-[var(--text-primary)]">
                    Download Change JSON File ⭐
                  </div>
                  <div className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                    Download a lightweight file containing only these selected items. Perfect for manual importing.
                  </div>
                </div>
              </button>

              {/* Option 2: Share with Apps */}
              <button
                onClick={handleBatchNativeShare}
                className="flex items-center gap-4 p-4 rounded-2xl bg-[var(--chip-bg)] hover:bg-[var(--border-subtle)] border border-[var(--border-subtle)] text-left transition duration-200 active:scale-[0.98] group"
              >
                <div className="w-10 h-10 rounded-xl bg-[var(--accent-secondary)]/10 text-[var(--accent-secondary)] flex items-center justify-center shrink-0">
                  <Share2 className="w-5 h-5 text-[var(--accent-secondary)]" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-[var(--text-primary)]">
                    Share with Other Apps
                  </div>
                  <div className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                    Open your device's native sharing menu to send the changes directly via email, chat, or other apps.
                  </div>
                </div>
              </button>
            </div>

            {/* Footer buttons */}
            <div className="flex items-center justify-end pt-2">
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="px-5 py-2.5 rounded-full bg-[var(--chip-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-bold text-xs border border-[var(--border-subtle)] active:scale-95 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
