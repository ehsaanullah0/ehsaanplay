import React, { useRef } from 'react';
import { MediaItem, PersonalMediaState } from '../../types/movie';
import { MoviePoster } from '../common/MoviePoster';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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
  onToggleWatchlist?: (id: string) => void;
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
  onToggleWatchlist,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = scrollRef.current.clientWidth * 0.75;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
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

        {/* Desktop Rail Scroll Controls */}
        <div className="hidden sm:flex items-center gap-1.5">
          <button
            onClick={() => handleScroll('left')}
            aria-label="Scroll left"
            className="p-2 rounded-full bg-[#FEDB99] hover:opacity-90 text-[#624B15] transition focus:outline-none shadow-3xs"
          >
            <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
          </button>
          <button
            onClick={() => handleScroll('right')}
            aria-label="Scroll right"
            className="p-2 rounded-full bg-[#FEDB99] hover:opacity-90 text-[#624B15] transition focus:outline-none shadow-3xs"
          >
            <ChevronRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* Horizontal Rail Container */}
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
              onToggleWatchlist={onToggleWatchlist}
            />
          </div>
        ))}
      </div>
    </section>
  );
};
