import React, { useEffect, useState, useCallback } from 'react';
import { MediaItem, PersonalMediaState } from '../../types/movie';
import { SafeImage } from '../common/SafeImage';
import { Sparkles, X, Star, ArrowRight, RotateCw, Play, Film, Tv, Copy, Check } from 'lucide-react';
import { CURATED_OMDB_RECOMMENDATIONS } from '../../data/curatedCatalog';

interface RandomModalProps {
  item: MediaItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectMedia: (item: MediaItem) => void;
  onPickAnother?: () => void;
  userState?: PersonalMediaState;
  userStates?: Record<string, PersonalMediaState>;
  candidatePool?: MediaItem[];
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
}) => {
  const [currentItem, setCurrentItem] = useState<MediaItem | null>(null);
  const [isShuffling, setIsShuffling] = useState<boolean>(false);
  const [flipStage, setFlipStage] = useState<'idle' | 'flipping-out' | 'flipping-in'>('idle');
  const [flipAngle, setFlipAngle] = useState<number>(0);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  // Session tracking to ensure we never repeat a title when rolling back
  const [seenKeys, setSeenKeys] = useState<string[]>([]);

  const handleCopyTitle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentItem?.title) return;
    navigator.clipboard.writeText(currentItem.title).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }).catch(err => {
      console.error('Failed to copy title:', err);
    });
  };

  // Check if an item has been marked as watched
  const isItemWatched = useCallback(
    (cand: MediaItem): boolean => {
      if (userStates && userStates[cand.id]?.isWatched) return true;
      if (cand.status && cand.status.toLowerCase() === 'watched') return true;
      if (initialItem && cand.id === initialItem.id && userState?.isWatched) return true;
      return false;
    },
    [userStates, initialItem, userState]
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
      setIsShuffling(false);
      setFlipStage('idle');
      setFlipAngle(0);
      setIsCopied(false);
      setSeenKeys([]);
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
      const key = resolved.id || resolved.title.toLowerCase().trim();
      setSeenKeys([key]);
    }
  }, [isOpen, initialItem, isItemWatched, getUnwatchedPool]);

  // Handle Shuffle Again with 3D Card Flip Animation (Never repeat titles & exclude watched)
  const handleShuffle = useCallback(() => {
    if (isShuffling) return;
    setIsShuffling(true);
    setIsCopied(false);

    // Phase 1: Flip out (card rotates around Y-axis to 90 degrees)
    setFlipStage('flipping-out');
    setFlipAngle(90);

    setTimeout(() => {
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

          setTimeout(() => {
            setFlipStage('idle');
            setIsShuffling(false);
          }, 260);
        });
      });
    }, 200);
  }, [isShuffling, getUnwatchedPool, currentItem, seenKeys]);

  // Keyboard navigation: Escape closes, Space/R shuffles, Enter opens preview
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'r' || e.key === 'R' || e.key === ' ') {
        e.preventDefault();
        handleShuffle();
      } else if (e.key === 'Enter' && currentItem) {
        e.preventDefault();
        onClose();
        onSelectMedia(currentItem);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentItem, onClose, onSelectMedia, handleShuffle]);

  if (!isOpen || !currentItem) return null;

  const item = currentItem;
  const activeUserState = (item && userStates ? userStates[item.id] : undefined) || userState;
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
        className="relative w-full max-w-md sm:max-w-lg bg-[var(--modal-bg)] text-[var(--text-primary)] rounded-3xl p-6 sm:p-7 shadow-2xl border border-[var(--border-subtle)] flex flex-col items-center overflow-hidden animate-scale-up"
      >
        {/* Top Header Bar */}
        <div className="w-full flex items-center justify-between pb-4 border-b border-[var(--border-subtle)] mb-5">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--accent-primary)] font-sans">
            <Sparkles className="w-4 h-4 text-[var(--accent-primary)] fill-current" />
            <span>Random Pick</span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-[var(--chip-bg)] hover:bg-[var(--border-subtle)]/40 active:scale-95 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition focus:outline-none border border-[var(--border-subtle)] shadow-2xs cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
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
