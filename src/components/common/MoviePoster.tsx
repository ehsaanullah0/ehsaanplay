import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface MoviePosterProps {
  item: MediaItem;
  userState?: PersonalMediaState;
  onClick: () => void;
  showRanking?: number;
  compact?: boolean;
  onRemoveFromWatchlist?: (id: string) => void;
  onMarkWatching?: (id: string, item?: MediaItem) => void;
  onMarkWatched?: (id: string, item?: MediaItem) => void;
  onDismissFromWatching?: (id: string) => void;
  onToggleWatchlist?: (id: string, item?: MediaItem) => void;
  onToggleFavorite?: (id: string, item?: MediaItem) => void;
  onAddMediaToLibrary?: (item: MediaItem) => void;
  customLists?: CustomList[];
  onAddItemToList?: (listId: string, mediaId: string, item?: MediaItem) => void;
  onRemoveItemFromList?: (listId: string, mediaId: string) => void;
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
  onRemoveItemFromList,
  onLongPress,
  isSelected = false,
  isSelectionModeActive = false,
}) => {
  const [isCardMenuOpen, setIsCardMenuOpen] = useState(false);
  const [showListPicker, setShowListPicker] = useState(false);
  const [localLists, setLocalLists] = useState<CustomList[]>(() => customLists || loadCustomLists());
  const cardRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);
  const longPressTriggeredTimeRef = useRef(0);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);

  // Sync custom lists when opened
  useEffect(() => {
    if (isCardMenuOpen) {
      setLocalLists(customLists || loadCustomLists());
    }
  }, [isCardMenuOpen, customLists]);

  // Reset to normal when clicking anywhere outside or pressing Escape
  useEffect(() => {
    if (!isCardMenuOpen) return;

    const handleGlobalPointerDown = (e: PointerEvent) => {
      // Don't close if interacting inside the card
      if (cardRef.current && cardRef.current.contains(e.target as Node)) {
        return;
      }
      setIsCardMenuOpen(false);
      setShowListPicker(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCardMenuOpen(false);
        setShowListPicker(false);
      }
    };

    // Attach after a short delay so the opening gesture doesn't instantly dismiss
    const timer = setTimeout(() => {
      window.addEventListener('pointerdown', handleGlobalPointerDown);
    }, 120);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('pointerdown', handleGlobalPointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCardMenuOpen]);

  const isWatched = !!userState?.isWatched;
  const inWatchlist = !!userState?.inWatchlist;
  const rating = userState?.personalRating || (item.imdbRating || 0);
  const hasProgress =
    !isWatched &&
    userState?.progressPercent !== undefined &&
    userState.progressPercent > 0;

  const startPress = (x: number, y: number) => {
    if (isCardMenuOpen) return;
    isLongPressRef.current = false;
    startPosRef.current = { x, y };
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      longPressTriggeredTimeRef.current = Date.now();
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(40);
        } catch {
          // ignore vibration error
        }
      }
      if (onLongPress) {
        onLongPress();
      } else if (!isSelectionModeActive) {
        setIsCardMenuOpen(true);
      }
    }, 400);
  };

  const cancelPress = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isCardMenuOpen) return;
    if (e.touches.length === 1) {
      startPress(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isCardMenuOpen) return;
    if (startPosRef.current && e.touches.length === 1) {
      const dx = Math.abs(e.touches[0].clientX - startPosRef.current.x);
      const dy = Math.abs(e.touches[0].clientY - startPosRef.current.y);
      // 18px touch-slop tolerance accommodates human finger pad compression
      if (dx > 18 || dy > 18) {
        cancelPress();
      }
    }
  };

  const handleTouchEnd = () => {
    cancelPress();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isCardMenuOpen) return;
    if (e.button === 0) {
      startPress(e.clientX, e.clientY);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isCardMenuOpen) return;
    if (startPosRef.current) {
      const dx = Math.abs(e.clientX - startPosRef.current.x);
      const dy = Math.abs(e.clientY - startPosRef.current.y);
      if (dx > 15 || dy > 15) {
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

    if (isSelectionModeActive) {
      return;
    }

    // On mobile & tablet, native contextmenu is dispatched after the long-press gesture
    const isRecentLongPress =
      isLongPressRef.current || Date.now() - longPressTriggeredTimeRef.current < 800;
    if (isRecentLongPress) {
      if (!onLongPress) {
        setIsCardMenuOpen(true);
      }
      return;
    }

    // For desktop mouse right-clicks:
    if (isCardMenuOpen) {
      setIsCardMenuOpen(false);
      setShowListPicker(false);
      return;
    }
    setIsCardMenuOpen(true);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isSelectionModeActive) {
      e.preventDefault();
      e.stopPropagation();
      onClick();
      return;
    }
    const wasLongPress =
      isLongPressRef.current || Date.now() - longPressTriggeredTimeRef.current < 600;
    if (wasLongPress) {
      e.preventDefault();
      e.stopPropagation();
      isLongPressRef.current = false;
      return;
    }
    // If card menu is open, clicking anywhere on the card resets it to normal
    if (isCardMenuOpen) {
      e.preventDefault();
      e.stopPropagation();
      setIsCardMenuOpen(false);
      setShowListPicker(false);
      return;
    }
    onClick();
  };

  // Toggle watchlist & reset to normal
  const handleToggleWatchlistAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleWatchlist) {
      onAddMediaToLibrary?.(item);
      onToggleWatchlist(item.id, item);
    } else if (onRemoveFromWatchlist && inWatchlist) {
      onRemoveFromWatchlist(item.id);
    } else if (onAddMediaToLibrary) {
      onAddMediaToLibrary(item);
    }
    setIsCardMenuOpen(false);
    setShowListPicker(false);
  };

  // 3-State Cycling Handler for Mark as Watched / Watching / Reset Status & reset to normal
  const handleCycleWatchStatus = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isWatched) {
      // 1st State (Watched) -> 2nd Click switches to 'Watching'
      if (onMarkWatching) {
        onAddMediaToLibrary?.(item);
        onMarkWatching(item.id, item);
      }
    } else if (hasProgress) {
      // 2nd State (Watching) -> 3rd Click resets status
      if (onDismissFromWatching) {
        onDismissFromWatching(item.id);
      } else if (onRemoveFromWatchlist && !inWatchlist) {
        onRemoveFromWatchlist(item.id);
      }
    } else {
      // 3rd State (Reset / Neither) -> 1st Click switches to 'Watched'
      if (onMarkWatched) {
        onAddMediaToLibrary?.(item);
        onMarkWatched(item.id, item);
      }
    }
    setIsCardMenuOpen(false);
    setShowListPicker(false);
  };

  const isItemInList = (list: CustomList): boolean => {
    if (list.itemIds.includes(item.id)) return true;
    if (item.imdbId && list.itemIds.includes(item.imdbId)) return true;
    if (item.tmdbId && list.itemIds.includes(`tmdb-${item.type || 'movie'}-${item.tmdbId}`)) return true;
    return false;
  };

  // Toggle item in custom collection list
  const handleToggleListItem = (listId: string) => {
    const activeLists = customLists || localLists;
    const targetList = activeLists.find(l => l.id === listId);
    const alreadyIn = targetList ? isItemInList(targetList) : false;

    if (alreadyIn) {
      if (onRemoveItemFromList) {
        onRemoveItemFromList(listId, item.id);
        return;
      }
    } else {
      if (onAddItemToList) {
        onAddMediaToLibrary?.(item);
        onAddItemToList(listId, item.id, item);
        return;
      }
    }

    const lists = loadCustomLists();
    const updated = lists.map(l => {
      if (l.id === listId) {
        const already = isItemInList(l);
        const itemIds = already
          ? l.itemIds.filter(
              id =>
                id !== item.id &&
                id !== item.imdbId &&
                id !== (item.tmdbId ? `tmdb-${item.type || 'movie'}-${item.tmdbId}` : '')
            )
          : [...l.itemIds, item.id];
        return { ...l, itemIds, updatedAt: new Date().toISOString() };
      }
      return l;
    });
    saveCustomLists(updated);
    setLocalLists(updated);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ehsaan:library-change'));
    }
  };

  // Quick remove action & reset to normal
  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRemoveFromWatchlist) {
      onRemoveFromWatchlist(item.id);
    }
    if (onDismissFromWatching) {
      onDismissFromWatching(item.id);
    }
    setIsCardMenuOpen(false);
    setShowListPicker(false);
  };

  const handleCloseMenu = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) e.stopPropagation();
    setIsCardMenuOpen(false);
    setShowListPicker(false);
  };

  return (
    <>
      {/* Portaled full-screen invisible backdrop to reset card when clicking or tapping anywhere outside */}
      {isCardMenuOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-40 bg-black/15 cursor-default touch-manipulation animate-fade-in"
            onClick={handleCloseMenu}
            onTouchStart={e => {
              e.stopPropagation();
              handleCloseMenu();
            }}
            onContextMenu={e => {
              e.preventDefault();
              handleCloseMenu();
            }}
          />,
          document.body
        )}

      {/* Movie Poster Card */}
      <div
        ref={cardRef}
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
        style={{
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none',
        }}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (isCardMenuOpen) {
              handleCloseMenu();
            } else {
              onClick();
            }
          }
        }}
        className={`group relative flex flex-col cursor-pointer select-none text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] rounded-2xl transition-all duration-200 touch-manipulation ${
          isCardMenuOpen ? 'z-50' : ''
        } ${isSelected ? 'scale-[0.97]' : 'active:scale-[0.98]'}`}
      >
        {/* Poster Canvas (2:3 Aspect Ratio Container) */}
        <div
          className={`relative aspect-[2/3] w-full overflow-hidden rounded-2xl bg-[var(--chip-bg)] shadow-xs group-hover:shadow-md transition-all duration-200 border ${
            isCardMenuOpen
              ? 'border-[var(--accent-primary)] ring-2 ring-[var(--accent-primary)]/60 shadow-xl'
              : isSelected
              ? 'border-[var(--accent-primary)] ring-2 ring-[var(--accent-primary)]'
              : 'border-[var(--border-subtle)]'
          }`}
        >
          {/* Normal Poster Artwork vs In-Card Menu Replacement */}
          {!isCardMenuOpen ? (
            <>
              <SafeImage
                src={item.posterUrl}
                fallbackSrc={item.fallbackPosterUrl}
                alt={item.title}
                fallbackTitle={item.title}
                draggable={false}
                className="w-full h-full object-cover pointer-events-none select-none transition-transform duration-300 group-hover:scale-[1.03]"
              />

              {/* Quiet empty checkbox outline if in selection mode but not selected */}
              {isSelectionModeActive && !isSelected && (
                <div className="absolute top-2.5 right-2.5 w-6.5 h-6.5 rounded-full bg-black/60 backdrop-blur-sm border-2 border-white/90 flex items-center justify-center z-20 transition hover:bg-black/80 pointer-events-none shadow-md">
                  <div className="w-2 h-2 rounded-full bg-white/40" />
                </div>
              )}

              {/* Active checked circle with scale-up animation */}
              {isSelected && (
                <div className="absolute top-2.5 right-2.5 w-6.5 h-6.5 rounded-full bg-[var(--accent-primary)] text-[var(--bg-primary)] flex items-center justify-center z-30 border-2 border-white shadow-xl animate-scale-up pointer-events-none font-black">
                  <Check className="w-4 h-4 stroke-[3.5]" />
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
                <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/40 backdrop-blur-xs z-10 pointer-events-none">
                  <div
                    className="h-full bg-[var(--accent-primary)] transition-all"
                    style={{ width: `${userState?.progressPercent || 0}%` }}
                  />
                </div>
              )}
            </>
          ) : (
            /* In-Card Menu Replacing the Movie Image */
            <div
              onClick={e => {
                // Clicking anywhere on the open container resets to normal
                handleCloseMenu(e);
              }}
              style={{
                WebkitTouchCallout: 'none',
                WebkitUserSelect: 'none',
              }}
              className="absolute inset-0 z-20 flex flex-col justify-between p-1.5 xs:p-2 sm:p-2.5 bg-[var(--modal-bg,#16161a)]/95 backdrop-blur-md text-[var(--text-primary)] animate-fade-in select-none touch-manipulation overflow-hidden"
            >
              {/* Subtle blurred poster backdrop for aesthetic depth */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-25">
                <SafeImage
                  src={item.posterUrl}
                  alt=""
                  fallbackTitle={item.title}
                  draggable={false}
                  className="w-full h-full object-cover scale-110 blur-md pointer-events-none"
                />
                <div className="absolute inset-0 bg-black/60 pointer-events-none" />
              </div>

              {/* Main Menu Controls or List Picker */}
              <div className="relative z-10 flex flex-col h-full justify-between">
                {!showListPicker ? (
                  <>
                    {/* Header: Movie title & Minimal Close X */}
                    <div className="flex items-center justify-between pb-1 border-b border-[var(--border-subtle)]/70 shrink-0">
                      <span className="text-[10px] sm:text-[11px] font-bold text-[var(--text-secondary)] truncate pr-1">
                        {item.title}
                      </span>
                      <button
                        type="button"
                        onClick={handleCloseMenu}
                        aria-label="Close menu"
                        className="p-1 -mr-0.5 -my-1 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--chip-bg)] transition shrink-0 cursor-pointer touch-manipulation active:scale-95"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* 4 Minimal In-Card Action Buttons */}
                    <div className="flex-1 flex flex-col justify-evenly py-0.5 gap-1">
                      {/* 1. Watchlist Button */}
                      <button
                        type="button"
                        onClick={handleToggleWatchlistAction}
                        className={`w-full flex items-center justify-between px-2 sm:px-2.5 py-1.5 sm:py-2 rounded-xl text-[10px] xs:text-[11px] sm:text-xs font-bold transition-all border cursor-pointer touch-manipulation active:scale-[0.97] ${
                          inWatchlist
                            ? 'bg-[#F5C518] text-[#121212] font-black border border-[#DFB00F] shadow-xs'
                            : 'bg-[var(--chip-bg,rgba(255,255,255,0.08))] text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)] border-[var(--border-subtle)]'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 sm:gap-2 truncate">
                          <Bookmark className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${inWatchlist ? 'fill-current' : ''}`} />
                          <span className="truncate">{inWatchlist ? 'In Watchlist' : 'Watchlist'}</span>
                        </div>
                        {inWatchlist && <Check className="w-3 h-3 stroke-[3] shrink-0" />}
                      </button>

                      {/* 2. Mark Watch (3-Tap Ability: Watched -> Watching -> Reset) */}
                      <button
                        type="button"
                        onClick={handleCycleWatchStatus}
                        className={`w-full flex items-center justify-between px-2 sm:px-2.5 py-1.5 sm:py-2 rounded-xl text-[10px] xs:text-[11px] sm:text-xs font-bold transition-all border cursor-pointer touch-manipulation active:scale-[0.97] ${
                          isWatched
                            ? 'bg-[var(--bg-card-olive,#ecfccb)] text-[var(--text-card-olive,#365314)] border-lime-300/40 shadow-xs'
                            : hasProgress
                            ? 'bg-[var(--accent-primary)] text-[var(--bg-primary,#000)] border-transparent shadow-xs'
                            : 'bg-[var(--chip-bg,rgba(255,255,255,0.08))] text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)] border-[var(--border-subtle)]'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 sm:gap-2 truncate">
                          {isWatched ? (
                            <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 stroke-[2.5]" />
                          ) : hasProgress ? (
                            <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                          ) : (
                            <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 opacity-60" />
                          )}
                          <span className="truncate">
                            {isWatched ? 'Watched' : hasProgress ? 'Watching' : 'Mark Watch'}
                          </span>
                        </div>
                        {isWatched && <Check className="w-3 h-3 stroke-[3] shrink-0" />}
                      </button>

                      {/* 3. Add to List Button */}
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          setShowListPicker(true);
                        }}
                        className="w-full flex items-center justify-between px-2 sm:px-2.5 py-1.5 sm:py-2 rounded-xl text-[10px] xs:text-[11px] sm:text-xs font-bold transition-all border bg-[var(--chip-bg,rgba(255,255,255,0.08))] text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)] border-[var(--border-subtle)] cursor-pointer touch-manipulation active:scale-[0.97]"
                      >
                        <div className="flex items-center gap-1.5 sm:gap-2 truncate">
                          <FolderPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                          <span className="truncate">Add to List</span>
                        </div>
                        <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 opacity-60" />
                      </button>

                      {/* 4. Remove Button (Minimal Dark Crimson Red) */}
                      <button
                        type="button"
                        onClick={handleRemove}
                        className="w-full flex items-center justify-between px-2 sm:px-2.5 py-1.5 sm:py-2 rounded-xl text-[10px] xs:text-[11px] sm:text-xs font-bold transition-all bg-[#7F1D1D] hover:bg-[#991B1B] text-white shadow-2xs active:scale-[0.97] border border-red-900/60 cursor-pointer touch-manipulation"
                      >
                        <div className="flex items-center gap-1.5 sm:gap-2 truncate">
                          <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                          <span className="truncate">Remove</span>
                        </div>
                      </button>
                    </div>
                  </>
                ) : (
                  /* In-Card Custom Lists Picker */
                  <div className="flex flex-col h-full justify-between">
                    <div className="flex items-center justify-between pb-1 border-b border-[var(--border-subtle)]/70 shrink-0">
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          setShowListPicker(false);
                        }}
                        className="flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-[var(--accent-primary)] hover:underline cursor-pointer touch-manipulation"
                      >
                        <ChevronLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        <span>Back</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleCloseMenu}
                        aria-label="Close menu"
                        className="p-1 -mr-0.5 -my-1 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition shrink-0 cursor-pointer touch-manipulation active:scale-95"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto no-scrollbar py-1 space-y-1">
                      {localLists.length > 0 ? (
                        localLists.map(list => {
                          const isInList = isItemInList(list);
                          return (
                            <button
                              key={list.id}
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                handleToggleListItem(list.id);
                              }}
                              className={`w-full text-left px-2 sm:px-2.5 py-1.5 rounded-xl text-[10px] sm:text-[11px] font-semibold transition flex items-center justify-between border cursor-pointer touch-manipulation active:scale-[0.97] ${
                                isInList
                                  ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] border-transparent shadow-2xs font-bold'
                                  : 'bg-[var(--chip-bg,rgba(255,255,255,0.08))] hover:bg-[var(--bg-surface-elevated)] text-[var(--text-primary)] border-[var(--border-subtle)]'
                              }`}
                            >
                              <span className="truncate">{list.title}</span>
                              {isInList && <Check className="w-3 h-3 stroke-[2.5] shrink-0" />}
                            </button>
                          );
                        })
                      ) : (
                        <div className="text-[10px] text-[var(--text-secondary)] py-4 text-center">
                          No collections yet.
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleCloseMenu}
                      className="w-full pt-1 border-t border-[var(--border-subtle)]/70 text-center text-[10px] sm:text-[11px] font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer touch-manipulation"
                    >
                      Done
                    </button>
                  </div>
                )}
              </div>
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
    </>
  );
};

