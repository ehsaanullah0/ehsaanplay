import React, { useState, useRef, useEffect } from 'react';
import { MediaItem, PersonalMediaState } from '../../types/movie';
import { SafeImage } from './SafeImage';
import { Bookmark, Check, Star, Play, Trash2, Plus } from 'lucide-react';

interface MoviePosterProps {
  item: MediaItem;
  userState?: PersonalMediaState;
  onClick: () => void;
  showRanking?: number;
  compact?: boolean;
  onRemoveFromWatchlist?: (id: string) => void;
  onMarkWatching?: (id: string) => void;
  onMarkWatched?: (id: string) => void;
  onToggleWatchlist?: (id: string) => void;
  onAddMediaToLibrary?: (item: MediaItem) => void;
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
  onToggleWatchlist,
  onAddMediaToLibrary,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isWatched = userState?.isWatched;
  const inWatchlist = userState?.inWatchlist;
  const rating = userState?.personalRating || item.tmdbRating;
  const hasProgress =
    !isWatched &&
    userState?.progressPercent !== undefined &&
    userState.progressPercent > 0;

  // Close menu on click outside
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('click', handleDocumentClick);
    }
    return () => document.removeEventListener('click', handleDocumentClick);
  }, [isMenuOpen]);

  const handleBadgeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!inWatchlist && !isWatched) {
      if (onToggleWatchlist) {
        onToggleWatchlist(item.id);
      } else if (onAddMediaToLibrary) {
        onAddMediaToLibrary(item);
      } else {
        setIsMenuOpen(prev => !prev);
      }
    } else {
      setIsMenuOpen(prev => !prev);
    }
  };

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className="group relative flex flex-col cursor-pointer select-none text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4E562F] rounded-2xl transition-transform duration-200 active:scale-[0.98]"
    >
      {/* Poster Canvas (2:3 Aspect Ratio Container) */}
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-2xl bg-[#EAE7DC] shadow-xs group-hover:shadow-md transition-shadow">
        <SafeImage
          src={item.posterUrl}
          alt={item.title}
          fallbackTitle={item.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />

        {/* Status Bookmark / Badge Button */}
        <div ref={menuRef} className="absolute top-2.5 right-2.5 z-20">
          <button
            type="button"
            onClick={handleBadgeClick}
            aria-label={isWatched ? 'Watched options' : inWatchlist ? 'In Watchlist options' : 'Add to Watchlist'}
            title={isWatched ? 'Watched options' : inWatchlist ? 'In Watchlist options' : 'Add to Watchlist'}
            className={`w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-xs shadow-md transition-transform hover:scale-110 active:scale-90 ${
              isWatched
                ? 'bg-[#E4EAB8] text-[#3B421E]'
                : inWatchlist
                ? 'bg-[#4E562F] text-[#FAF8F2]'
                : 'bg-black/50 hover:bg-black/75 text-white'
            }`}
          >
            {isWatched ? (
              <Check className="w-4 h-4 stroke-[2.5]" />
            ) : inWatchlist ? (
              <Bookmark className="w-3.5 h-3.5 fill-current" />
            ) : (
              <Plus className="w-4 h-4 stroke-[2.5]" />
            )}
          </button>

          {/* Minimal 3-Option Quick Menu */}
          {isMenuOpen && (
            <div
              onClick={e => e.stopPropagation()}
              className="absolute right-0 top-8 w-44 p-1.5 bg-[#FAF8F2] rounded-2xl shadow-xl border border-[#4E562F]/20 text-[#282C1B] z-30 animate-fade-in space-y-1"
            >
              {/* Option 1: Remove from Watchlist */}
              {onRemoveFromWatchlist && (
                <button
                  type="button"
                  onClick={() => {
                    onRemoveFromWatchlist(item.id);
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-700 hover:bg-rose-50 transition text-left"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Remove</span>
                </button>
              )}

              {/* Option 2: Watching / In Progress */}
              {onMarkWatching && (
                <button
                  type="button"
                  onClick={() => {
                    onMarkWatching(item.id);
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#282C1B] hover:bg-[#EFECE1] transition text-left"
                >
                  <Play className="w-3.5 h-3.5 text-[#4E562F] fill-[#4E562F]" />
                  <span>Watching</span>
                </button>
              )}

              {/* Option 3: Mark Watched */}
              {onMarkWatched && (
                <button
                  type="button"
                  onClick={() => {
                    onMarkWatched(item.id);
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#3B421E] hover:bg-[#E4EAB8] transition text-left"
                >
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Watched</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Ranking number overlay (for Top 10 rails) */}
        {showRanking !== undefined && (
          <div className="absolute -bottom-2 -left-1 text-[4.5rem] sm:text-[5.5rem] font-black leading-none text-[#FAF8F2]/90 drop-shadow-[0_2px_10px_rgba(0,0,0,0.6)] pointer-events-none select-none tracking-tighter z-10">
            {showRanking}
          </div>
        )}

        {/* Progress bar at bottom of poster if in progress */}
        {hasProgress && (
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/40 backdrop-blur-xs z-10">
            <div
              className="h-full bg-[#E4EAB8] transition-all"
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
  );
};
