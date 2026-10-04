import React from 'react';
import { MediaItem, PersonalMediaState } from '../../types/movie';
import { SafeImage } from '../common/SafeImage';
import { Play, X } from 'lucide-react';

interface ContinueWatchingRailProps {
  items: { item: MediaItem; state: PersonalMediaState }[];
  onSelectMedia: (item: MediaItem) => void;
  onDismissFromWatching?: (id: string) => void;
}

export const ContinueWatchingRail: React.FC<ContinueWatchingRailProps> = ({
  items,
  onSelectMedia,
  onDismissFromWatching,
}) => {
  if (items.length === 0) return null;

  return (
    <section className="mb-12 sm:mb-16">
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] tracking-tight">
            Continue Watching
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5">
            Pick up right where you left off
          </p>
        </div>
      </div>

      <div className="flex gap-4 sm:gap-6 overflow-x-auto no-scrollbar pb-3 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        {items.map(({ item, state }) => {
          const progress = state.progressPercent || 0;
          const isTV = item.type === 'tv';
          const epInfo = isTV && state.tvProgress
            ? `S${state.tvProgress.currentSeason} : E${state.tvProgress.currentEpisode}`
            : undefined;

          return (
            <div
              key={item.id}
              onClick={() => onSelectMedia(item)}
              role="button"
              tabIndex={0}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectMedia(item);
                }
              }}
              className="group relative flex-none w-[280px] sm:w-[320px] text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4E562F] rounded-2xl select-none bg-[#FEDB99] text-[#624B15] p-3.5 sm:p-4 shadow-xs hover:shadow-md transition-all active:scale-[0.99] border-none flex items-center gap-3.5 sm:gap-4"
            >
              {/* Album / Poster Image on Left */}
              <div className="relative w-16 h-24 sm:w-20 sm:h-28 rounded-xl overflow-hidden bg-[#FEF3D6] shadow-2xs flex-none">
                <SafeImage
                  src={item.posterUrl || item.backdropUrl}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/15 group-hover:bg-black/25 transition flex items-center justify-center">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#FAF8F2]/90 text-[#624B15] flex items-center justify-center shadow-xs transform group-hover:scale-110 transition">
                    <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                  </div>
                </div>
              </div>

              {/* Right Side Info & Dark Yellow Progress Bar */}
              <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm sm:text-base font-black text-[#624B15] leading-snug truncate pr-4">
                      {item.title}
                    </h3>
                  </div>

                  <div className="mt-1 flex items-center gap-1.5 text-xs font-bold text-[#8C6B1B]">
                    {epInfo ? (
                      <span className="text-[#624B15]">{epInfo}</span>
                    ) : (
                      <span>{progress}% completed</span>
                    )}
                    <span aria-hidden="true">·</span>
                    <span className="opacity-80">{item.type === 'tv' ? 'Series' : 'Movie'}</span>
                  </div>
                </div>

                {/* Dark Yellow Progress Bar */}
                <div className="mt-3">
                  <div className="w-full h-2 rounded-full bg-[#E6C378] overflow-hidden">
                    <div
                      className="h-full bg-[#855D00] rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Cross Button to Dismiss from Watching */}
              {onDismissFromWatching && (
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    onDismissFromWatching(item.id);
                  }}
                  aria-label="Remove from Continue Watching"
                  title="Remove from Continue Watching"
                  className="absolute top-2.5 right-2.5 z-20 w-6 h-6 rounded-full hover:bg-[#624B15]/15 text-[#624B15] flex items-center justify-center transition active:scale-90"
                >
                  <X className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
