import React, { useState, useRef, useEffect } from 'react';
import { MediaItem, PersonalMediaState, CustomList } from '../../types/movie';
import { loadCustomLists, saveCustomLists } from '../../services/storage';
import { SafeImage } from './SafeImage';
import {
  Bookmark,
  Check,
  CheckCircle2,
  Star,
  X,
  Eye,
  FolderPlus,
  Trash2,
} from 'lucide-react';

interface MoviePosterProps {
  item: MediaItem;
  userState?: PersonalMediaState;
  onClick: () => void;
  showRanking?: number;
  compact?: boolean;
  onRemoveFromWatchlist?: (id: string) => void;
  onMarkWatching?: (id: string) => void;
  onMarkWatched?: (id: string) => void;
  onDismissFromWatching?: (id: string) => void;
  onToggleWatchlist?: (id: string) => void;
  onToggleFavorite?: (id: string) => void;
  onAddMediaToLibrary?: (item: MediaItem) => void;
  customLists?: CustomList[];
  onAddItemToList?: (listId: string, mediaId: string) => void;
  onLongPress?: () => void;
  isSelected?: boolean;
  isSelectionModeActive?: boolean;
}

export const MoviePoster: React.FC<MoviePosterProps> = ({
  item,
  userState,
  onClick,
  showRanking,
  compact = false,
  onRemoveFromWatchlist,
  onMarkWatching,
  onMarkWatched,
  onDismissFromWatching,
  onToggleWatchlist,
  onToggleFavorite,
  onAddMediaToLibrary,
  customLists,
  onAddItemToList,
  onLongPress,
  isSelected = false,
  isSelectionModeActive = false,
}) => {
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [showListPicker, setShowListPicker] = useState(false);
  const [localLists, setLocalLists] = useState<CustomList[]>(() => customLists || loadCustomLists());
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);

  // Sync custom lists when opened
  useEffect(() => {
    if (isPopupOpen) {
      setLocalLists(customLists || loadCustomLists());
    }
  }, [isPopupOpen, customLists]);

  const isWatched = !!userState?.isWatched;
  const inWatchlist = !!userState?.inWatchlist;
  const isFavorite = !!userState?.isFavorite;
  const rating = userState?.personalRating || item.tmdbRating;
  const hasProgress =
    !isWatched &&
    userState?.progressPercent !== undefined &&
    userState.progressPercent > 0;

  const startPress = (x: number, y: number) => {
    isLongPressRef.current = false;
    startPosRef.current = { x, y };
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(40);
        } catch {
          // ignore vibration error
        }
      }
      if (onLongPress) {
        onLongPress();
      } else {
        setIsPopupOpen(true);
      }
    }, 450);
  };

  const cancelPress = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      startPress(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startPosRef.current && e.touches.length === 1) {
      const dx = Math.abs(e.touches[0].clientX - startPosRef.current.x);
      const dy = Math.abs(e.touches[0].clientY - startPosRef.current.y);
      if (dx > 10 || dy > 10) {
        cancelPress();
      }
    }
  };

  const handleTouchEnd = () => {
    cancelPress();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      startPress(e.clientX, e.clientY);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (startPosRef.current) {
      const dx = Math.abs(e.clientX - startPosRef.current.x);
      const dy = Math.abs(e.clientY - startPosRef.current.y);
      if (dx > 10 || dy > 10) {
        cancelPress();
      }
    }
  };

  const handleMouseUp = () => {
    cancelPress();
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    cancelPress();
    if (onLongPress) {
      onLongPress();
    } else {
      setIsPopupOpen(true);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isLongPressRef.current) {
      e.preventDefault();
      e.stopPropagation();
      isLongPressRef.current = false;
      return;
    }
    onClick();
  };

  // 3-State Cycling Handler for Mark as Watched / Watching / Reset Status
  const handleCycleWatchStatus = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isWatched) {
      // 1st State (Watched) -> 2nd Click switches to 'Watching'
      if (onMarkWatching) {
        onMarkWatching(item.id);
      }
    } else if (hasProgress) {
      // 2nd State (Watching) -> 3rd Click resets status (neither watched nor watching)
      if (onDismissFromWatching) {
        onDismissFromWatching(item.id);
      } else if (onRemoveFromWatchlist && !inWatchlist) {
        onRemoveFromWatchlist(item.id);
      }
    } else {
      // 3rd State (Reset / Neither) -> 1st Click switches to 'Watched'
      if (onMarkWatched) {
        onMarkWatched(item.id);
      }
    }
  };

  // Toggle item in custom collection list
  const handleToggleListItem = (listId: string) => {
    if (onAddItemToList) {
      onAddItemToList(listId, item.id);
    } else {
      const lists = loadCustomLists();
      const updated = lists.map(l => {
        if (l.id === listId) {
          const already = l.itemIds.includes(item.id);
          const itemIds = already ? l.itemIds.filter(id => id !== item.id) : [...l.itemIds, item.id];
          return { ...l, itemIds, updatedAt: new Date().toISOString() };
        }
        return l;
      });
      saveCustomLists(updated);
      setLocalLists(updated);
    }
  };

  // Quick remove action
  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRemoveFromWatchlist) {
      onRemoveFromWatchlist(item.id);
    }
    if (onDismissFromWatching) {
      onDismissFromWatching(item.id);
    }
    setIsPopupOpen(false);
    setShowListPicker(false);
  };

  return (
    <>
      {/* Movie Poster Card (Clean artwork with zero overlaid buttons) */}
      <div
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onContextMenu={handleContextMenu}
        role="button"
        tabIndex={0}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        }}
        className={`group relative flex flex-col cursor-pointer select-none text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] rounded-2xl transition-all duration-200 ${
          isSelected ? 'scale-[0.97]' : 'active:scale-[0.98]'
        }`}
      >
        {/* Poster Canvas (2:3 Aspect Ratio Container) */}
        <div className={`relative aspect-[2/3] w-full overflow-hidden rounded-2xl bg-[var(--chip-bg)] shadow-xs group-hover:shadow-md transition-all duration-200 border ${
          isSelected
            ? 'border-[var(--accent-primary)] ring-2 ring-[var(--accent-primary)]'
            : 'border-[var(--border-subtle)]'
        }`}>
          <SafeImage
            src={item.posterUrl}
            alt={item.title}
            fallbackTitle={item.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />

          {/* Quiet empty checkbox outline if in selection mode but not selected */}
          {isSelectionModeActive && !isSelected && (
            <div className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-black/40 backdrop-blur-xs border border-white/60 flex items-center justify-center z-20 transition hover:bg-black/60">
              {/* Quiet empty circle */}
            </div>
          )}

          {/* Active checked circle with scale-up animation */}
          {isSelected && (
            <div className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-[var(--accent-primary)] text-[var(--bg-primary)] flex items-center justify-center z-30 border border-[var(--bg-primary)] shadow-md animate-scale-up">
              <Check className="w-3.5 h-3.5 stroke-[3.5]" />
            </div>
          )}

          {/* Selection dim overlay */}
          {isSelected && (
            <div className="absolute inset-0 bg-[var(--accent-primary)]/10 z-10 transition-colors pointer-events-none" />
          )}

          {/* Ranking number overlay (for Top 10 rails) */}
          {showRanking !== undefined && (
            <div className="absolute -bottom-2 -left-1 text-[4.5rem] sm:text-[5.5rem] font-black leading-none text-white/90 drop-shadow-[0_2px_10px_rgba(0,0,0,0.6)] pointer-events-none select-none tracking-tighter z-10">
              {showRanking}
            </div>
          )}

          {/* Progress bar at bottom of poster if watching in progress */}
          {hasProgress && (
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/40 backdrop-blur-xs z-10">
              <div
                className="h-full bg-[var(--accent-primary)] transition-all"
                style={{ width: `${userState?.progressPercent || 0}%` }}
              />
            </div>
          )}
        </div>

        {/* Typography metadata below poster */}
        {!compact && (
          <div className="mt-2.5 px-0.5">
            <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)] leading-tight truncate group-hover:text-[var(--accent-primary)] transition-colors">
              {item.title}
            </h3>

            <div className="mt-1 flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
              <span>{item.year}</span>
              <span aria-hidden="true">·</span>
              <span className="capitalize">{item.type === 'tv' ? 'Series' : 'Movie'}</span>
              {rating > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-0.5 text-[var(--accent-primary)] font-semibold tabular-nums">
                    <Star className="w-3 h-3 fill-current text-[var(--accent-secondary)]" />
                    {rating.toFixed(1)}
                  </span>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Clean Immersive Minimalist Controls Modal Window (List window with 4 buttons: Watchlist, Mark Watch (3-tap), Add to List, Remove) */}
      {isPopupOpen && (
        <div
          onClick={e => {
            e.stopPropagation();
            setIsPopupOpen(false);
            setShowListPicker(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in select-none"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="w-full max-w-[270px] sm:max-w-[290px] bg-[var(--modal-bg)] text-[var(--text-primary)] rounded-3xl shadow-2xl border border-[var(--border-subtle)] p-3.5 space-y-2.5 animate-scale-up text-left"
          >
            {/* Minimal Header: Thumbnail, Title, Year/Type & Close */}
            <div className="flex items-center gap-2.5 pb-2 border-b border-[var(--border-subtle)]">
              <div className="w-8 h-11 rounded-lg overflow-hidden bg-[var(--chip-bg)] shrink-0 border border-[var(--border-subtle)]">
                <SafeImage
                  src={item.posterUrl}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1 min-w-0 pr-1">
                <h3 className="text-xs sm:text-sm font-black text-[var(--text-primary)] truncate leading-snug">
                  {item.title}
                </h3>
                <div className="mt-0.5 flex items-center gap-1 text-[11px] text-[var(--text-secondary)] font-medium">
                  <span>{item.year || '2025'}</span>
                  <span>·</span>
                  <span className="capitalize">{item.type === 'tv' ? 'Series' : 'Movie'}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsPopupOpen(false);
                  setShowListPicker(false);
                }}
                aria-label="Close modal"
                className="p-1 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--chip-bg)] transition shrink-0 self-start"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Four Minimal Buttons List */}
            <div className="space-y-1.5 text-xs">
              {/* 1. Watchlist Button */}
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  if (onToggleWatchlist) {
                    onToggleWatchlist(item.id);
                  } else if (onRemoveFromWatchlist && inWatchlist) {
                    onRemoveFromWatchlist(item.id);
                  } else if (onAddMediaToLibrary) {
                    onAddMediaToLibrary(item);
                  }
                }}
                className={`w-full flex items-center justify-between p-2.5 rounded-2xl transition-all border font-bold ${
                  inWatchlist
                    ? 'bg-[var(--bg-card-yellow)] text-[var(--text-card-yellow)] border-[var(--border-subtle)]'
                    : 'bg-[var(--chip-bg)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)] border-[var(--border-subtle)]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Bookmark className={`w-4 h-4 ${inWatchlist ? 'fill-current' : ''}`} />
                  <span>{inWatchlist ? 'In Watchlist' : 'Add to Watchlist'}</span>
                </div>
                {inWatchlist && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
              </button>

              {/* 2. Mark Watch (3-Tap Ability: Watched -> Watching -> Reset) - Clean without stage text */}
              <button
                type="button"
                onClick={handleCycleWatchStatus}
                className={`w-full flex items-center justify-between p-2.5 rounded-2xl transition-all border font-bold ${
                  isWatched
                    ? 'bg-[var(--bg-card-olive)] text-[var(--text-card-olive)] border-[var(--border-subtle)]'
                    : hasProgress
                    ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] border-transparent'
                    : 'bg-[var(--chip-bg)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)] border-[var(--border-subtle)]'
                }`}
              >
                <div className="flex items-center gap-2">
                  {isWatched ? (
                    <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                  ) : hasProgress ? (
                    <Eye className="w-4 h-4" />
                  ) : (
                    <Check className="w-4 h-4 opacity-60" />
                  )}
                  <span>
                    {isWatched ? 'Watched' : hasProgress ? 'Watching' : 'Mark as Watched'}
                  </span>
                </div>
                {isWatched && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
              </button>

              {/* 3. Add to List Button */}
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  setShowListPicker(!showListPicker);
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-2xl transition-all border font-bold bg-[var(--chip-bg)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)] border-[var(--border-subtle)]"
              >
                <div className="flex items-center gap-2">
                  <FolderPlus className="w-4 h-4" />
                  <span>Add to List</span>
                </div>
                <span className="text-[10px] font-bold opacity-60">
                  {showListPicker ? 'Close' : 'Select'}
                </span>
              </button>

              {/* Inline Collections Selector */}
              {showListPicker && (
                <div className="p-2 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-1 max-h-36 overflow-y-auto no-scrollbar animate-fade-in">
                  {localLists.length > 0 ? (
                    localLists.map(list => {
                      const isInList = list.itemIds.includes(item.id);
                      return (
                        <button
                          key={list.id}
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            handleToggleListItem(list.id);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold transition flex items-center justify-between ${
                            isInList
                              ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] shadow-2xs'
                              : 'hover:bg-[var(--chip-bg)] text-[var(--text-primary)]'
                          }`}
                        >
                          <span className="truncate">{list.title}</span>
                          {isInList && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                        </button>
                      );
                    })
                  ) : (
                    <div className="text-[11px] text-[var(--text-secondary)] py-1.5 px-2 text-center">
                      No collections created yet.
                    </div>
                  )}
                </div>
              )}

              {/* 4. Remove Button (Filled Dark Blood Red in minimal way) */}
              <button
                type="button"
                onClick={handleRemove}
                className="w-full flex items-center justify-between p-2.5 rounded-2xl transition-all font-bold bg-[#7F1D1D] hover:bg-[#991B1B] text-white shadow-xs active:scale-95"
              >
                <div className="flex items-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  <span>Remove</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
