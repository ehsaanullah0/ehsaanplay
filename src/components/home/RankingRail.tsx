import React, { useRef, useState, useEffect, useCallback } from 'react';
import { MediaItem, PersonalMediaState } from '../../types/movie';
import { MoviePoster } from '../common/MoviePoster';
import { ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';

interface RankingRailProps {
  title: string;
  subtitle?: string;
  items: MediaItem[];
  userStates: Record<string, PersonalMediaState>;
  onSelectMedia: (item: MediaItem) => void;
  showRankingNumbers?: boolean;
  onRemoveFromWatchlist?: (id: string) => void;
  onMarkWatching?: (id: string) => void;
  onMarkWatched?: (id: string) => void;
  onDismissFromWatching?: (id: string) => void;
  onToggleWatchlist?: (id: string) => void;
  onToggleFavorite?: (id: string) => void;
  onExpand?: () => void;
  expandTooltip?: string;
  layout?: 'horizontal' | 'vertical';
}

export const RankingRail: React.FC<RankingRailProps> = ({
  title,
  subtitle,
  items,
  userStates,
  onSelectMedia,
  showRankingNumbers = true,
  onRemoveFromWatchlist,
  onMarkWatching,
  onMarkWatched,
  onDismissFromWatching,
  onToggleWatchlist,
  onToggleFavorite,
  onExpand,
  expandTooltip,
  layout = 'horizontal',
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isAtEnd, setIsAtEnd] = useState(false);
  const [isAtStart, setIsAtStart] = useState(true);

  const checkScrollPosition = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    // We consider it at the end if all content fits without overflow or user scrolled within 16px of the end
    const atEnd = scrollWidth <= clientWidth + 10 || scrollLeft + clientWidth >= scrollWidth - 16;
    const atStart = scrollLeft <= 16;
    setIsAtEnd(atEnd);
    setIsAtStart(atStart);
  }, []);

  useEffect(() => {
    checkScrollPosition();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkScrollPosition, { passive: true });
    window.addEventListener('resize', checkScrollPosition);
    return () => {
      el.removeEventListener('scroll', checkScrollPosition);
      window.removeEventListener('resize', checkScrollPosition);
    };
  }, [checkScrollPosition, items]);

  const handleScroll = (direction: 'left' | 'right') => {
    if (direction === 'right' && isAtEnd && onExpand) {
      onExpand();
      return;
    }
    if (scrollRef.current) {
      const scrollAmount = scrollRef.current.clientWidth * 0.75;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
      setTimeout(checkScrollPosition, 350);
    }
  };

  if (items.length === 0) return null;

  return (
    <section className="mb-12 sm:mb-16">
      {/* Section Header */}
      <div className="flex items-end justify-between mb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] tracking-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5">{subtitle}</p>
          )}
        </div>

        {/* Rail Scroll / Expand Controls */}
        {layout === 'vertical' ? (
          onExpand && (
            <button
              onClick={onExpand}
              aria-label={expandTooltip || "Expand: Open favorites in Watchlist"}
              title={expandTooltip || "Expand: Open favorites in Watchlist"}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#7F1D1D] hover:bg-[#991B1B] text-white transition-all duration-200 focus:outline-none shadow-xs border border-[#991B1B] active:scale-95 cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="text-xs font-black">Expand</span>
            </button>
          )
        ) : (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleScroll('left')}
              disabled={isAtStart}
              aria-label="Scroll left"
              className={`p-2 rounded-full transition focus:outline-none shadow-3xs border border-[var(--border-subtle)] active:scale-95 ${
                isAtStart
                  ? 'opacity-35 cursor-not-allowed bg-[var(--chip-bg)] text-[var(--text-secondary)]'
                  : 'bg-[var(--bg-card-yellow)] hover:opacity-90 text-[var(--text-card-yellow)] cursor-pointer'
              }`}
            >
              <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
            </button>

            {isAtEnd && onExpand ? (
              /* Expand Button in Deep Blood Red (Matching Delete Colour #7F1D1D) */
              <button
                onClick={onExpand}
                aria-label={expandTooltip || "Expand: Open favorites in Watchlist"}
                title={expandTooltip || "Expand: Open favorites in Watchlist"}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#7F1D1D] hover:bg-[#991B1B] text-white transition-all duration-200 focus:outline-none shadow-xs border border-[#991B1B] active:scale-95 cursor-pointer animate-scale-up"
              >
                <Maximize2 className="w-3.5 h-3.5 stroke-[2.5]" />
                <span className="text-xs font-black">Expand</span>
              </button>
            ) : (
              /* Standard Right Arrow Button */
              <button
                onClick={() => handleScroll('right')}
                aria-label="Scroll right"
                className="p-2 rounded-full bg-[var(--bg-card-yellow)] hover:opacity-90 text-[var(--text-card-yellow)] transition focus:outline-none shadow-3xs border border-[var(--border-subtle)] active:scale-95 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4 stroke-[2.5]" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Items Container: Vertical Grid OR Horizontal Rail */}
      {layout === 'vertical' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6 pt-1">
          {items.map((item, index) => (
            <div key={item.id} className="w-full">
              <MoviePoster
                item={item}
                userState={userStates[item.id]}
                onClick={() => onSelectMedia(item)}
                showRanking={showRankingNumbers ? index + 1 : undefined}
                onRemoveFromWatchlist={onRemoveFromWatchlist}
                onMarkWatching={onMarkWatching}
                onMarkWatched={onMarkWatched}
                onDismissFromWatching={onDismissFromWatching}
                onToggleWatchlist={onToggleWatchlist}
                onToggleFavorite={onToggleFavorite}
              />
            </div>
          ))}
        </div>
      ) : (
        <div
          ref={scrollRef}
          className="flex gap-4 sm:gap-6 overflow-x-auto no-scrollbar pb-4 pt-1 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 snap-x snap-mandatory"
        >
          {items.map((item, index) => (
            <div
              key={item.id}
              className="flex-none w-[140px] sm:w-[170px] md:w-[190px] snap-start"
            >
              <MoviePoster
                item={item}
                userState={userStates[item.id]}
                onClick={() => onSelectMedia(item)}
                showRanking={showRankingNumbers ? index + 1 : undefined}
                onRemoveFromWatchlist={onRemoveFromWatchlist}
                onMarkWatching={onMarkWatching}
                onMarkWatched={onMarkWatched}
                onDismissFromWatching={onDismissFromWatching}
                onToggleWatchlist={onToggleWatchlist}
                onToggleFavorite={onToggleFavorite}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
