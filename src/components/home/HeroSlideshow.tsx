import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MediaItem, PersonalMediaState, AppTweaksConfig } from '../../types/movie';
import { SafeImage } from '../common/SafeImage';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';

interface HeroSlideshowProps {
  items: MediaItem[];
  userStates: Record<string, PersonalMediaState>;
  onSelectMedia: (item: MediaItem) => void;
  onToggleWatchlist?: (id: string) => void;
  tweaks?: AppTweaksConfig;
}

export const HeroSlideshow: React.FC<HeroSlideshowProps> = ({
  items,
  userStates,
  onSelectMedia,
  tweaks,
}) => {
  // Take up to 5 recently added or top items
  const featuredItems = useMemo(() => {
    if (!items || items.length === 0) return [];
    return items.slice(0, 5);
  }, [items]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartXRef = useRef<number | null>(null);

  // Auto-slide every 6.5 seconds
  useEffect(() => {
    if (featuredItems.length <= 1 || isPaused) return;

    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % featuredItems.length);
    }, 6500);

    return () => clearInterval(timer);
  }, [featuredItems.length, isPaused]);

  if (featuredItems.length === 0) return null;

  const currentItem = featuredItems[currentIndex];
  const currentState = userStates ? userStates[currentItem.id] : undefined;
  const rating = currentState?.personalRating || currentItem.imdbRating || currentItem.tmdbRating || 0;
  const genres = currentItem.genres && currentItem.genres.length > 0 ? currentItem.genres.slice(0, 3) : [];

  // Tweaks-driven dynamic layout & style configurations
  const layoutMode = tweaks?.heroSlideshowLayout || 'card';
  const isFullWidth = layoutMode === 'full-width';
  const darkFogOpacity = typeof tweaks?.heroSlideshowOpacity === 'number' ? tweaks.heroSlideshowOpacity : 0.75;
  const isGenresPilled = Boolean(tweaks?.heroSlideshowGenresPill);
  const titleColorMode = tweaks?.heroSlideshowTitleColor || 'white';

  const goToPrev = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCurrentIndex(prev => (prev === 0 ? featuredItems.length - 1 : prev - 1));
  };

  const goToNext = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCurrentIndex(prev => (prev + 1) % featuredItems.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartXRef.current - touchEndX;

    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        goToNext();
      } else {
        goToPrev();
      }
    }
    touchStartXRef.current = null;
  };

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={() => onSelectMedia(currentItem)}
      title={`Open ${currentItem.title}`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelectMedia(currentItem);
        }
      }}
      className={`group relative select-none transition-all duration-300 bg-black overflow-hidden mb-8 shadow-xl cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] ${
        isFullWidth
          ? '-mx-4 sm:-mx-6 lg:-mx-8 w-[calc(100%+2rem)] sm:w-[calc(100%+3rem)] lg:w-[calc(100%+4rem)] -mt-4 sm:-mt-6 rounded-none rounded-b-3xl border-t-0 border-x-0 border-b border-[var(--border-subtle)] h-[360px] xs:h-[400px] sm:h-[480px] md:h-[540px]'
          : 'w-full mt-4 sm:mt-6 rounded-3xl border border-[var(--border-subtle)] h-[340px] xs:h-[380px] sm:h-[460px] md:h-[520px]'
      }`}
    >
      {/* Background Cinematic Artwork Layers with Crossfade */}
      {featuredItems.map((item, index) => {
        const isActive = index === currentIndex;
        return (
          <div
            key={item.id}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
              isActive ? 'opacity-100 z-0' : 'opacity-0 -z-10 pointer-events-none'
            }`}
          >
            <SafeImage
              src={item.backdropUrl || item.posterUrl}
              alt={item.title}
              size="original"
              containerClassName="!bg-transparent"
              className="w-full h-full object-cover transform scale-105 group-hover:scale-110 transition-transform duration-[7000ms] ease-out"
            />
          </div>
        );
      })}

      {/* Atmospheric Soft Dark Fog Gradient with Adjustable Opacity */}
      <div
        className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-t from-black via-black/40 to-black/10 transition-opacity duration-300"
        style={{ opacity: darkFogOpacity }}
      />

      {/* Hero Content: Movie / Series Title & Sub-Title Rating and Genres */}
      <div
        className={`relative z-20 w-full h-full flex flex-col justify-end text-left pb-8 sm:pb-12 ${
          isFullWidth
            ? 'px-6 sm:px-10 md:px-14 lg:px-16'
            : 'p-6 sm:p-10 md:p-14'
        }`}
      >
        <div className="max-w-4xl animate-fade-in" key={currentItem.id}>
          {/* Title with Configurable Color (Standard White vs Adaptive Theme Color) */}
          <h2
            className={`text-3xl xs:text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-[1.08] tracking-tight line-clamp-2 transition-colors ${
              titleColorMode === 'artwork-adaptive'
                ? 'text-[var(--accent-primary)] drop-shadow-[0_2px_18px_rgba(0,0,0,0.95)]'
                : 'text-white drop-shadow-[0_2px_16px_rgba(0,0,0,0.95)]'
            }`}
          >
            {currentItem.title}
          </h2>

          {/* Meaningful Rating and Genres Row Directly Below Title */}
          {(rating > 0 || genres.length > 0) && (
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 mt-2.5 sm:mt-3 text-xs sm:text-sm font-bold text-white/95 drop-shadow-[0_1px_8px_rgba(0,0,0,0.9)]">
              {/* Star Rating Badge */}
              {rating > 0 && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white shadow-xs">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span className="tabular-nums font-black text-xs sm:text-sm">{rating.toFixed(1)}</span>
                </div>
              )}

              {/* Genres: Either Theme-Colored Pills or Dot-Separated Text */}
              {genres.length > 0 && (
                <>
                  {isGenresPilled ? (
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      {genres.map((g) => (
                        <span
                          key={g}
                          className="px-2.5 py-0.5 rounded-full bg-[var(--accent-primary)] text-[var(--bg-primary)] text-[10px] sm:text-xs font-black uppercase tracking-wider shadow-xs border border-black/10"
                        >
                          {g}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-white/90">
                      {rating > 0 && <span aria-hidden="true" className="text-white/40">·</span>}
                      <span>{genres.join(' · ')}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Minimal Ghost Left Navigation Arrow */}
      {featuredItems.length > 1 && (
        <button
          type="button"
          onClick={goToPrev}
          aria-label="Previous featured title"
          className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-30 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/40 hover:bg-black/70 text-white border border-white/20 backdrop-blur-md flex items-center justify-center transition-all active:scale-90 opacity-0 group-hover:opacity-100 shadow-md"
        >
          <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      )}

      {/* Minimal Ghost Right Navigation Arrow */}
      {featuredItems.length > 1 && (
        <button
          type="button"
          onClick={goToNext}
          aria-label="Next featured title"
          className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-30 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/40 hover:bg-black/70 text-white border border-white/20 backdrop-blur-md flex items-center justify-center transition-all active:scale-90 opacity-0 group-hover:opacity-100 shadow-md"
        >
          <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      )}

      {/* Pagination Indicators at Bottom Center */}
      {featuredItems.length > 1 && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-3.5 sm:bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5"
        >
          {featuredItems.map((_, index) => {
            const isActive = index === currentIndex;
            return (
              <button
                key={index}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(index);
                }}
                aria-label={`Go to slide ${index + 1}`}
                className={`transition-all duration-300 rounded-full ${
                  isActive
                    ? 'w-7 sm:w-8 h-1.5 bg-white shadow-xs'
                    : 'w-1.5 h-1.5 bg-white/40 hover:bg-white/75'
                }`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
