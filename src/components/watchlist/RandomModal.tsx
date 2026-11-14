import React, { useEffect, useState, useCallback, useRef } from 'react';
import { MediaItem, PersonalMediaState, CustomList } from '../../types/movie';
import { SafeImage } from '../common/SafeImage';
import {
  Sparkles,
  X,
  Star,
  ArrowRight,
  RotateCw,
  Play,
  Film,
  Tv,
  Copy,
  Check,
  Heart,
  FolderPlus,
  Plus,
} from 'lucide-react';
import { CURATED_OMDB_RECOMMENDATIONS } from '../../data/curatedCatalog';
import { resolveStateForMediaItem, areMediaItemsSame } from '../../utils/mediaDedup';
import {
  loadCustomLists,
  saveCustomLists,
  loadUserStates,
  saveUserStates,
} from '../../services/storage';

interface RandomModalProps {
  item: MediaItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectMedia: (item: MediaItem) => void;
  onPickAnother?: () => void;
  userState?: PersonalMediaState;
  userStates?: Record<string, PersonalMediaState>;
  candidatePool?: MediaItem[];
  customLists?: CustomList[];
  onAddItemToList?: (listId: string, mediaId: string, item?: MediaItem) => void;
  onRemoveItemFromList?: (listId: string, mediaId: string) => void;
  onCreateList?: (title: string, description?: string, colorTag?: string) => CustomList | void;
  onToggleFavorite?: (id: string, item?: MediaItem) => void;
}

/**
 * Resolves artwork synchronously from the item or preloaded in-memory curated catalog
 */
function resolveArtwork(item: MediaItem): MediaItem {
  if (item.posterUrl && item.posterUrl !== 'N/A' && item.posterUrl.trim() !== '') {
    return item;
  }
  if (item.fallbackPosterUrl && item.fallbackPosterUrl !== 'N/A' && item.fallbackPosterUrl.trim() !== '') {
    return { ...item, posterUrl: item.fallbackPosterUrl };
  }
  if (item.backdropUrl && item.backdropUrl !== 'N/A' && item.backdropUrl.trim() !== '') {
    return { ...item, posterUrl: item.backdropUrl };
  }

  // Fast in-memory match from curated catalog
  const cleanTitle = item.title.toLowerCase().trim();
  const match = CURATED_OMDB_RECOMMENDATIONS.find(
    c => (c.imdbId && c.imdbId === item.imdbId) ||
         c.title.toLowerCase().trim() === cleanTitle ||
         cleanTitle.includes(c.title.toLowerCase().trim()) ||
         c.title.toLowerCase().trim().includes(cleanTitle)
  );

  if (match?.posterUrl) {
    return {
      ...item,
      posterUrl: match.posterUrl,
      fallbackPosterUrl: match.fallbackPosterUrl || item.fallbackPosterUrl,
      backdropUrl: match.backdropUrl || item.backdropUrl,
    };
  }

  // Deterministic in-memory fallback
  const sum = item.title.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const fallback = CURATED_OMDB_RECOMMENDATIONS[Math.abs(sum) % CURATED_OMDB_RECOMMENDATIONS.length];
  return {
    ...item,
    posterUrl: fallback.posterUrl,
    fallbackPosterUrl: fallback.fallbackPosterUrl,
  };
}

export const RandomModal: React.FC<RandomModalProps> = ({
  item: initialItem,
  isOpen,
  onClose,
  onSelectMedia,
  onPickAnother,
  userState,
  userStates,
  candidatePool = [],
  customLists,
  onAddItemToList,
  onRemoveItemFromList,
  onCreateList,
  onToggleFavorite,
}) => {
  const [currentItem, setCurrentItem] = useState<MediaItem | null>(null);
  const [isShuffling, setIsShuffling] = useState<boolean>(false);
  const [flipStage, setFlipStage] = useState<'idle' | 'flipping-out' | 'flipping-in'>('idle');
  const [flipAngle, setFlipAngle] = useState<number>(0);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  // Session tracking to ensure we never repeat a title when rolling back
  const [seenKeys, setSeenKeys] = useState<string[]>([]);

  // Favorite & List Picker states
  const [localFavoriteOverride, setLocalFavoriteOverride] = useState<boolean | null>(null);
  const [isListPickerOpen, setIsListPickerOpen] = useState<boolean>(false);
  const [localLists, setLocalLists] = useState<CustomList[]>(() => customLists || loadCustomLists());
  const [newListName, setNewListName] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const listPickerRef = useRef<HTMLDivElement | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shuffleOutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shuffleInTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAllTimers = useCallback(() => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    if (shuffleOutTimerRef.current) clearTimeout(shuffleOutTimerRef.current);
    if (shuffleInTimerRef.current) clearTimeout(shuffleInTimerRef.current);
  }, []);

  useEffect(() => {
    return () => clearAllTimers();
  }, [clearAllTimers]);

  // Sync custom lists when opened or prop updates
  useEffect(() => {
    if (customLists && customLists.length > 0) {
      setLocalLists(customLists);
    } else {
      setLocalLists(loadCustomLists());
    }
  }, [customLists, isOpen]);

  // Close list picker when clicking outside
  useEffect(() => {
    if (!isListPickerOpen) return;
    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (listPickerRef.current && !listPickerRef.current.contains(target)) {
        setIsListPickerOpen(false);
      }
    };
    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [isListPickerOpen]);

  const handleCopyTitle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentItem?.title) return;
    navigator.clipboard.writeText(currentItem.title).then(() => {
      setIsCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setIsCopied(false), 2000);
    }).catch(err => {
      console.error('Failed to copy title:', err);
    });
  };

  // Check if an item has been marked as watched (alias-aware)
  const isItemWatched = useCallback(
    (cand: MediaItem): boolean => {
      const resolvedState = resolveStateForMediaItem(cand, userStates || {}, candidatePool);
      if (resolvedState?.isWatched) return true;
      if (cand.status && cand.status.toLowerCase() === 'watched') return true;
      if (initialItem && cand.id === initialItem.id && userState?.isWatched) return true;
      return false;
    },
    [userStates, candidatePool, initialItem, userState]
  );

  // Retrieve eligible pool strictly excluding watched titles
  const getUnwatchedPool = useCallback((): MediaItem[] => {
    const sourcePool = candidatePool && candidatePool.length > 0 ? candidatePool : CURATED_OMDB_RECOMMENDATIONS;
    let unwatched = sourcePool.filter(c => !isItemWatched(c));

    // If active library pool has only watched titles, fall back to unwatched curated recommendations
    if (unwatched.length === 0) {
      unwatched = CURATED_OMDB_RECOMMENDATIONS.filter(c => !isItemWatched(c));
    }

    // Safety fallback: only if every catalog recommendation is somehow watched
    return unwatched.length > 0 ? unwatched : sourcePool;
  }, [candidatePool, isItemWatched]);

  // Sync current item whenever modal opens or initialItem changes
  useEffect(() => {
    if (!isOpen) {
      clearAllTimers();
      setIsShuffling(false);
      setFlipStage('idle');
      setFlipAngle(0);
      setIsCopied(false);
      setSeenKeys([]);
      setIsListPickerOpen(false);
      setLocalFavoriteOverride(null);
      setToastMessage(null);
      return;
    }

    // Ensure initial title is not watched
    let candidate = initialItem;
    if (candidate && isItemWatched(candidate)) {
      const unwatched = getUnwatchedPool();
      candidate = unwatched[Math.floor(Math.random() * unwatched.length)] || null;
    } else if (!candidate) {
      const unwatched = getUnwatchedPool();
      candidate = unwatched[Math.floor(Math.random() * unwatched.length)] || null;
    }

    if (candidate) {
      const resolved = resolveArtwork(candidate);
      setCurrentItem(resolved);
      setIsShuffling(false);
      setFlipStage('idle');
      setFlipAngle(0);
      setIsCopied(false);
      setIsListPickerOpen(false);
      setLocalFavoriteOverride(null);
      const key = resolved.id || resolved.title.toLowerCase().trim();
      setSeenKeys([key]);
    }
  }, [isOpen, initialItem, isItemWatched, getUnwatchedPool]);

  // Handle Shuffle Again with 3D Card Flip Animation (Never repeat titles & exclude watched)
  const handleShuffle = useCallback(() => {
    if (isShuffling) return;
    setIsShuffling(true);
    setIsCopied(false);
    setIsListPickerOpen(false);
    setLocalFavoriteOverride(null);
    setToastMessage(null);

    // Phase 1: Flip out (card rotates around Y-axis to 90 degrees)
    setFlipStage('flipping-out');
    setFlipAngle(90);

    shuffleOutTimerRef.current = setTimeout(() => {
      // Phase 2: At 90 degrees (edge-on/invisible), pick next UNWATCHED, UNREPEATED title
      const pool = getUnwatchedPool();
      const currentKey = currentItem ? (currentItem.id || currentItem.title.toLowerCase().trim()) : '';

      // Strictly exclude:
      // 1. Watched titles (guaranteed by getUnwatchedPool)
      // 2. The currently displayed title
      // 3. Any title already seen/rolled in this session (never repeat!)
      let eligibleCandidates = pool.filter(c => {
        const key = c.id || c.title.toLowerCase().trim();
        return key !== currentKey && !seenKeys.includes(key);
      });

      let updatedSeen = [...seenKeys];

      // If all unwatched titles have now been rolled through, refresh cycle without repeating current title
      if (eligibleCandidates.length === 0) {
        eligibleCandidates = pool.filter(c => {
          const key = c.id || c.title.toLowerCase().trim();
          return key !== currentKey;
        });
        updatedSeen = currentKey ? [currentKey] : [];
      }

      if (eligibleCandidates.length > 0) {
        const next = eligibleCandidates[Math.floor(Math.random() * eligibleCandidates.length)];
        const nextKey = next.id || next.title.toLowerCase().trim();
        const nextResolved = resolveArtwork(next);
        setCurrentItem(nextResolved);
        setSeenKeys([...updatedSeen, nextKey]);
      }

      // Position card on opposite side (-90 degrees) without transition
      setFlipStage('flipping-in');
      setFlipAngle(-90);

      // Phase 3: Smoothly rotate from -90 degrees back to 0 degrees with spring finish
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setFlipAngle(0);

          shuffleInTimerRef.current = setTimeout(() => {
            setFlipStage('idle');
            setIsShuffling(false);
          }, 260);
        });
      });
    }, 200);
  }, [isShuffling, getUnwatchedPool, currentItem, seenKeys]);

  // Favorite status resolution (alias-aware)
  const resolvedCurrentState = currentItem
    ? resolveStateForMediaItem(currentItem, userStates || {}, candidatePool)
    : undefined;
  const isFavorite = localFavoriteOverride !== null
    ? localFavoriteOverride
    : Boolean(
        resolvedCurrentState?.isFavorite ||
        (currentItem && initialItem?.id === currentItem.id && userState?.isFavorite)
      );

  const displayedLists = customLists || localLists;
  const isItemInList = useCallback((list: CustomList, target: MediaItem): boolean => {
    return list.itemIds.some(id => {
      if (id === target.id || (target.imdbId && id === target.imdbId)) return true;
      if (target.tmdbId && id === `tmdb-${target.type || 'movie'}-${target.tmdbId}`) return true;
      const existing = candidatePool.find(m => m.id === id);
      return Boolean(existing && areMediaItemsSame(existing, target));
    });
  }, [candidatePool]);
  const isInAnyList = Boolean(currentItem && displayedLists.some(l => isItemInList(l, currentItem)));

  // Handle Favorite Toggle
  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentItem) return;
    const nextFav = !isFavorite;
    setLocalFavoriteOverride(nextFav);

    if (onToggleFavorite) {
      onToggleFavorite(currentItem.id, currentItem);
    } else {
      const states = loadUserStates();
      const cur = states[currentItem.id] || {
        mediaId: currentItem.id,
        inWatchlist: false,
        isWatched: false,
        isFavorite: false,
        addedAt: new Date().toISOString(),
      };
      states[currentItem.id] = {
        ...cur,
        isFavorite: nextFav,
        favoritedAt: nextFav ? new Date().toISOString() : undefined,
      };
      saveUserStates(states);
    }

    setToastMessage(nextFav ? 'Added to Favorites' : 'Removed from Favorites');
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 2500);
  };

  // Handle List Item Toggle
  const handleToggleListItem = (list: CustomList) => {
    if (!currentItem) return;
    const inList = isItemInList(list, currentItem);

    if (inList) {
      if (onRemoveItemFromList) {
        onRemoveItemFromList(list.id, currentItem.id);
      } else {
        const updatedLists = (localLists.length > 0 ? localLists : loadCustomLists()).map(l =>
          l.id === list.id ? { ...l, itemIds: l.itemIds.filter(id => id !== currentItem.id) } : l
        );
        saveCustomLists(updatedLists);
        setLocalLists(updatedLists);
      }
      setToastMessage(`Removed from "${list.title}"`);
    } else {
      if (onAddItemToList) {
        onAddItemToList(list.id, currentItem.id, currentItem);
      } else {
        const updatedLists = (localLists.length > 0 ? localLists : loadCustomLists()).map(l =>
          l.id === list.id ? { ...l, itemIds: Array.from(new Set([...l.itemIds, currentItem.id])) } : l
        );
        saveCustomLists(updatedLists);
        setLocalLists(updatedLists);
      }
      setToastMessage(`Added to "${list.title}"`);
    }

    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 2500);
  };

  // Handle Create New List inline
  const handleCreateNewList = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim() || !currentItem) return;
    const title = newListName.trim();

    if (onCreateList) {
      const existing = displayedLists.find(l => l.title.toLowerCase() === title.toLowerCase());
      if (existing) {
        onAddItemToList?.(existing.id, currentItem.id, currentItem);
      } else {
        const created = onCreateList(title);
        if (created && created.id) {
          onAddItemToList?.(created.id, currentItem.id, currentItem);
        }
      }
    } else {
      const currentStorageLists = loadCustomLists();
      const existing = currentStorageLists.find(l => l.title.toLowerCase() === title.toLowerCase());
      let nextLists: CustomList[];

      if (existing) {
        nextLists = currentStorageLists.map(l =>
          l.id === existing.id
            ? { ...l, itemIds: Array.from(new Set([...l.itemIds, currentItem.id])) }
            : l
        );
      } else {
        const newList: CustomList = {
          id: `list-${Date.now()}`,
          title,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          itemIds: [currentItem.id],
          colorTag: '#4E562F',
        };
        nextLists = [newList, ...currentStorageLists];
      }

      saveCustomLists(nextLists);
      setLocalLists(nextLists);
    }

    setNewListName('');
    setToastMessage(`Created & added to "${title}"`);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 2500);
  };

  // Keyboard navigation: Escape closes, Space/R shuffles, Enter opens preview
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isListPickerOpen) {
          setIsListPickerOpen(false);
          return;
        }
        onClose();
      } else if (e.key === 'r' || e.key === 'R' || e.key === ' ') {
        // Don't trigger shuffle if typing in input
        const target = e.target as HTMLElement;
        if (target && target.tagName === 'INPUT') return;
        e.preventDefault();
        handleShuffle();
      } else if (e.key === 'Enter' && currentItem) {
        const target = e.target as HTMLElement;
        if (target && target.tagName === 'INPUT') return;
        e.preventDefault();
        onClose();
        onSelectMedia(currentItem);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentItem, onClose, onSelectMedia, handleShuffle, isListPickerOpen]);

  if (!isOpen || !currentItem) return null;

  const item = currentItem;
  const activeUserState =
    (item && userStates ? resolveStateForMediaItem(item, userStates, candidatePool) : undefined) ||
    (item && initialItem?.id === item.id ? userState : undefined);
  const rating = activeUserState?.personalRating || item.imdbRating || item.tmdbRating || 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-fade-in select-none"
      role="dialog"
      aria-modal="true"
      aria-label="Random Pick"
      onClick={onClose}
    >
      {/* Modal Card Window */}
      <div
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-md sm:max-w-lg bg-[var(--modal-bg)] text-[var(--text-primary)] rounded-3xl p-6 sm:p-7 shadow-2xl border border-[var(--border-subtle)] flex flex-col items-center overflow-visible animate-scale-up"
      >
        {/* Floating Feedback Toast Notification */}
        {toastMessage && (
          <div
            className={`absolute top-16 left-1/2 -translate-x-1/2 z-50 px-3.5 py-1.5 rounded-full text-xs font-black shadow-xl animate-scale-up pointer-events-none flex items-center gap-1.5 border whitespace-nowrap ${
              toastMessage.includes('Favorite')
                ? 'bg-[#F5C518] text-[#121212] border-[#DFB00F]'
                : 'bg-[var(--accent-primary)] text-[var(--bg-primary)] border-white/20'
            }`}
          >
            <Check className="w-3.5 h-3.5 stroke-[3]" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Top Header Bar */}
        <div className="w-full flex items-center justify-between pb-4 border-b border-[var(--border-subtle)] mb-5">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--accent-primary)] font-sans">
            <Sparkles className="w-4 h-4 text-[var(--accent-primary)] fill-current" />
            <span>Random Pick</span>
          </div>

          {/* Action options beside the cross button */}
          <div className="flex items-center gap-2 relative">
            {/* 1. Add to List Option */}
            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsListPickerOpen(prev => !prev);
                }}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition focus:outline-none border shadow-2xs cursor-pointer active:scale-95 ${
                  isInAnyList
                    ? 'bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] border-[var(--accent-primary)]/40'
                    : 'bg-[var(--chip-bg)] hover:bg-[var(--border-subtle)]/50 text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-[var(--border-subtle)]'
                }`}
                title="Add to Collection List"
                aria-label="Add to Collection List"
                aria-expanded={isListPickerOpen}
              >
                <FolderPlus className="w-4 h-4 stroke-[2]" />
              </button>

              {/* List Picker Dropdown / Mobile Sheet */}
              {isListPickerOpen && (
                <>
                  {/* Backdrop for smaller mobile screens */}
                  <div
                    className="fixed inset-0 bg-black/55 backdrop-blur-2xs sm:hidden z-40 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsListPickerOpen(false);
                    }}
                    aria-hidden="true"
                  />

                  {/* Popover / Sheet Container */}
                  <div
                    ref={listPickerRef}
                    onClick={(e) => e.stopPropagation()}
                    className="fixed inset-x-3 bottom-3 sm:bottom-auto sm:inset-auto sm:right-0 sm:top-full sm:mt-2 w-auto sm:w-80 max-w-sm sm:max-w-none mx-auto sm:mx-0 bg-[var(--modal-bg)] text-[var(--text-primary)] rounded-3xl shadow-2xl border border-[var(--border-subtle)] p-4 sm:p-3.5 z-50 animate-slide-up sm:animate-scale-up text-left pb-safe"
                  >
                    {/* Mobile drag handle affordance */}
                    <div className="w-10 h-1 bg-[var(--border-subtle)]/70 rounded-full mx-auto mb-2.5 sm:hidden" />

                    {/* Popover Header */}
                    <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-[var(--border-subtle)]">
                      <div className="flex items-center gap-1.5 min-w-0 pr-2">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)] shrink-0">
                          Save to Shelf
                        </span>
                        {currentItem && (
                          <span className="text-[10px] text-[var(--text-secondary)]/70 truncate hidden xs:inline sm:hidden">
                            · {currentItem.title}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsListPickerOpen(false)}
                        className="p-1.5 sm:p-1 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--chip-bg)] transition cursor-pointer shrink-0"
                        aria-label="Close shelf picker"
                      >
                        <X className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                      </button>
                    </div>

                    {/* List of existing collections */}
                    <div className="space-y-1.5 sm:space-y-1 max-h-56 sm:max-h-48 overflow-y-auto no-scrollbar py-0.5 overscroll-contain">
                      {displayedLists.length > 0 ? (
                        displayedLists.map((list) => {
                          const inList = Boolean(currentItem && isItemInList(list, currentItem));
                          return (
                            <button
                              key={list.id}
                              type="button"
                              onClick={() => handleToggleListItem(list)}
                              className={`w-full text-left px-3.5 sm:px-3 py-2.5 sm:py-2 rounded-xl text-xs sm:text-xs font-semibold transition flex items-center justify-between border cursor-pointer active:scale-[0.98] ${
                                inList
                                  ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] border-transparent font-bold shadow-xs'
                                  : 'bg-[var(--chip-bg)] hover:bg-[var(--bg-surface-elevated)] text-[var(--text-primary)] border-[var(--border-subtle)]'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 sm:gap-2 truncate pr-2 min-w-0">
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: list.colorTag || '#4E562F' }}
                                />
                                <span className="truncate">{list.title}</span>
                                <span
                                  className={`text-[10px] shrink-0 ${
                                    inList ? 'opacity-80' : 'text-[var(--text-secondary)]'
                                  }`}
                                >
                                  ({list.itemIds.length})
                                </span>
                              </div>
                              {inList && <Check className="w-4 h-4 sm:w-3.5 sm:h-3.5 stroke-[3] shrink-0" />}
                            </button>
                          );
                        })
                      ) : (
                        <div className="py-4 text-center text-xs text-[var(--text-secondary)]">
                          No custom collections yet.
                        </div>
                      )}
                    </div>

                    {/* Create New Shelf Inline Form */}
                    <form
                      onSubmit={handleCreateNewList}
                      className="mt-3 sm:mt-2.5 pt-3 sm:pt-2.5 border-t border-[var(--border-subtle)] flex items-center gap-2 sm:gap-1.5"
                    >
                      <input
                        type="text"
                        value={newListName}
                        onChange={(e) => setNewListName(e.target.value)}
                        placeholder="New shelf name..."
                        autoCapitalize="words"
                        className="flex-1 px-3.5 sm:px-3 py-2 sm:py-1.5 rounded-xl bg-[var(--chip-bg)] border border-[var(--border-subtle)] text-sm sm:text-xs text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/60 focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
                      />
                      <button
                        type="submit"
                        disabled={!newListName.trim()}
                        className="px-3.5 sm:px-3 py-2 sm:py-1.5 rounded-xl bg-[var(--accent-primary)] text-[var(--bg-primary)] text-xs font-bold hover:opacity-90 active:scale-95 transition disabled:opacity-40 cursor-pointer flex items-center gap-1.5 sm:gap-1 shrink-0"
                      >
                        <Plus className="w-4 h-4 sm:w-3.5 sm:h-3.5 stroke-[2.5]" />
                        <span>Create</span>
                      </button>
                    </form>
                  </div>
                </>
              )}
            </div>

            {/* 2. Add to Favourite / Like Option */}
            <button
              type="button"
              onClick={handleToggleFavorite}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition focus:outline-none border shadow-2xs cursor-pointer active:scale-95 ${
                isFavorite
                  ? 'bg-[#F5C518] hover:bg-[#E2B616] text-[#121212] border-[#DFB00F] shadow-xs'
                  : 'bg-[var(--chip-bg)] hover:bg-[#F5C518]/15 text-[var(--text-secondary)] hover:text-[#d4a017] dark:hover:text-[#F5C518] border-[var(--border-subtle)] hover:border-[#DFB00F]/50'
              }`}
              title={isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
              aria-label={isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
            >
              <Heart className={`w-4 h-4 ${isFavorite ? 'fill-[#121212] text-[#121212]' : ''}`} />
            </button>

            {/* 3. Close (Cross) Button */}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[var(--chip-bg)] hover:bg-[var(--border-subtle)]/50 active:scale-95 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition focus:outline-none border border-[var(--border-subtle)] shadow-2xs cursor-pointer flex items-center justify-center"
              aria-label="Close"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 3D Flip Container for Title Poster Image */}
        <div
          className="my-1 flex items-center justify-center"
          style={{ perspective: '1000px' }}
        >
          <div
            onClick={() => {
              onClose();
              onSelectMedia(item);
            }}
            style={{
              transform: `rotateY(${flipAngle}deg) scale(${flipStage !== 'idle' ? 0.94 : 1})`,
              transformStyle: 'preserve-3d',
              transition:
                flipStage === 'flipping-out'
                  ? 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1)'
                  : flipStage === 'flipping-in' && flipAngle === 0
                  ? 'transform 260ms cubic-bezier(0.16, 1, 0.3, 1)'
                  : 'none',
              backfaceVisibility: 'hidden',
            }}
            className="relative w-40 sm:w-48 aspect-[2/3] rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] cursor-pointer select-none transition-shadow duration-300 hover:shadow-2xl group shrink-0"
            title="Click to view details"
          >
            <SafeImage
              src={item.posterUrl || item.backdropUrl}
              fallbackSrc={item.fallbackPosterUrl}
              alt={item.title}
              fallbackTitle={item.title}
              className="w-full h-full object-cover pointer-events-none"
            />

            {/* Subtle Hover Play Overlay */}
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
              <div className="w-11 h-11 rounded-full bg-[var(--accent-primary)] text-[var(--bg-primary)] flex items-center justify-center shadow-lg">
                <Play className="w-5 h-5 fill-current ml-0.5" />
              </div>
            </div>
          </div>
        </div>

        {/* Title & Metadata (with subtle fade transition in sync with flip) */}
        <div
          className={`w-full flex flex-col items-center transition-opacity duration-200 ${
            flipStage === 'flipping-out' ? 'opacity-30' : 'opacity-100'
          }`}
        >
          {/* Title of the Movie/Series with Copy Button */}
          <div className="mt-4 flex items-center justify-center gap-2 max-w-full px-2">
            <h2 className="text-xl sm:text-2xl font-black text-[var(--text-primary)] text-center tracking-tight line-clamp-2">
              {item.title}
            </h2>
            <button
              onClick={handleCopyTitle}
              title={isCopied ? "Title copied to clipboard!" : "Copy movie title"}
              aria-label={isCopied ? "Title copied" : "Copy title"}
              className="p-1.5 rounded-xl bg-[var(--chip-bg)] hover:bg-[var(--border-subtle)]/50 active:scale-95 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition focus:outline-none border border-[var(--border-subtle)] shadow-2xs shrink-0 cursor-pointer flex items-center gap-1"
            >
              {isCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500 stroke-[3]" />
                  <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider pr-0.5">Copied</span>
                </>
              ) : (
                <Copy className="w-3.5 h-3.5 stroke-[2.5]" />
              )}
            </button>
          </div>

          {/* Rating and Genres Details */}
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-xs text-[var(--text-secondary)]">
            <span className="flex items-center gap-1 font-bold text-[var(--text-primary)] uppercase">
              {item.type === 'tv' ? <Tv className="w-3.5 h-3.5" /> : <Film className="w-3.5 h-3.5" />}
              {item.type === 'tv' ? 'Series' : 'Movie'}
            </span>
            <span aria-hidden="true">·</span>
            <span>{item.year || '2024'}</span>
            {rating > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 font-bold text-[var(--accent-primary)]">
                  <Star className="w-3.5 h-3.5 fill-current text-[var(--accent-primary)]" />
                  {rating.toFixed(1)}
                </span>
              </>
            )}
            {item.genres && item.genres.length > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-[var(--text-secondary)]">{item.genres.slice(0, 3).join(', ')}</span>
              </>
            )}
          </div>

          {/* Summary of Overview */}
          {item.overview && (
            <p className="mt-3.5 text-xs sm:text-sm text-[var(--text-secondary)] line-clamp-3 leading-relaxed bg-[var(--modal-subtle)] px-4 py-3 rounded-2xl border border-[var(--border-subtle)] text-center shadow-2xs w-full">
              {item.overview}
            </p>
          )}
        </div>

        {/* Action Buttons: Shuffle Again in Secondary Color & Open Preview in Primary Color */}
        <div className="mt-6 flex items-center justify-center gap-3 w-full">
          {/* Shuffle Again in Secondary Color */}
          <button
            onClick={handleShuffle}
            disabled={isShuffling}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-[var(--accent-secondary)] text-[var(--accent-secondary-text)] hover:opacity-90 active:scale-95 text-xs sm:text-sm font-bold border border-[var(--border-subtle)] transition shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <RotateCw className={`w-4 h-4 ${isShuffling ? 'animate-spin' : ''}`} />
            <span>Shuffle Again</span>
          </button>

          {/* Open Preview in Primary Color */}
          <button
            onClick={() => {
              onClose();
              onSelectMedia(item);
            }}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-2xl bg-[var(--accent-primary)] text-[var(--bg-primary)] hover:opacity-90 active:scale-95 text-xs sm:text-sm font-black transition shadow-md cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Open Preview</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
