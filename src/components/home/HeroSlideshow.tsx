import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MediaItem, PersonalMediaState } from '../../types/movie';
import { SafeImage } from '../common/SafeImage';
import {
  Play,
  Info,
  Bookmark,
  Check,
  Star,
  ChevronLeft,
  ChevronRight,
  Flame,
  Tv,
  Film,
  Pencil,
  X,
  Maximize2,
  Minimize2,
  RotateCcw,
  Sliders,
} from 'lucide-react';

const HERO_SLIDESHOW_STORAGE_KEY = 'ehsaan_hero_slideshow_config_v1';

export interface HeroSlideshowConfig {
  opacity: number; // 0.0 to 1.0 (default 0.70)
  layoutMode: 'card' | 'fullscreen'; // 'card' = rounded card, 'fullscreen' = edge-to-edge
}

const DEFAULT_CONFIG: HeroSlideshowConfig = {
  opacity: 0.70,
  layoutMode: 'card',
};

interface HeroSlideshowProps {
  items: MediaItem[];
  userStates: Record<string, PersonalMediaState>;
  onSelectMedia: (item: MediaItem) => void;
  onToggleWatchlist?: (id: string) => void;
}

export const HeroSlideshow: React.FC<HeroSlideshowProps> = ({
  items,
  userStates,
  onSelectMedia,
  onToggleWatchlist,
}) => {
  // Take up to 5 recently added or top items
  const featuredItems = useMemo(() => {
    if (!items || items.length === 0) return [];
    return items.slice(0, 5);
  }, [items]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const touchStartXRef = useRef<number | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load customizer settings
  const [config, setConfig] = useState<HeroSlideshowConfig>(() => {
    try {
      const saved = localStorage.getItem(HERO_SLIDESHOW_STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
      }
    } catch {
      // ignore
    }
    return DEFAULT_CONFIG;
  });

  const updateConfig = (partial: Partial<HeroSlideshowConfig>) => {
    setConfig(prev => {
      const updated = { ...prev, ...partial };
      try {
        localStorage.setItem(HERO_SLIDESHOW_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  // Auto-slide every 6.5 seconds
  useEffect(() => {
    if (featuredItems.length <= 1 || isPaused || isCustomizerOpen) return;

    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % featuredItems.length);
    }, 6500);

    return () => clearInterval(timer);
  }, [featuredItems.length, isPaused, isCustomizerOpen]);

  if (featuredItems.length === 0) return null;

  const currentItem = featuredItems[currentIndex];
  const currentState = userStates[currentItem.id];
  const inWatchlist = !!currentState?.inWatchlist;
  const rating = currentState?.personalRating || currentItem.tmdbRating || 8.4;

  const goToPrev = () => {
    setCurrentIndex(prev => (prev === 0 ? featuredItems.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex(prev => (prev + 1) % featuredItems.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(35);
        } catch {
          // ignore
        }
      }
      setIsCustomizerOpen(true);
    }, 550);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartXRef.current !== null) {
      const currentX = e.touches[0].clientX;
      if (Math.abs(currentX - touchStartXRef.current) > 10) {
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
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

  const isFullscreen = config.layoutMode === 'fullscreen';

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className={`group relative select-none transition-all duration-300 bg-black ${
        isFullscreen
          ? 'w-screen relative left-1/2 -translate-x-1/2 mt-0 h-[440px] xs:h-[480px] sm:h-[560px] md:h-[620px] rounded-none border-x-0 border-t-0 border-b border-[var(--border-subtle)] mb-8 overflow-hidden'
          : 'w-full mt-4 sm:mt-6 h-[380px] xs:h-[420px] sm:h-[480px] md:h-[540px] rounded-3xl overflow-hidden mb-8 border border-[var(--border-subtle)] shadow-xl'
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
              className="w-full h-full object-cover transform scale-105 transition-transform duration-[7000ms] ease-out"
            />
          </div>
        );
      })}

      {/* Localized Soft Dark Fog Overlays with Configurable Opacity */}
      <div
        className="absolute inset-0 z-10 pointer-events-none transition-opacity duration-200"
        style={{ opacity: config.opacity }}
      >
        {/* Soft horizontal left gradient for text contrast */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.70)_0%,rgba(0,0,0,0.35)_35%,rgba(0,0,0,0.05)_55%,transparent_80%)]" />

        {/* Soft bottom edge gradient for buttons & pagination */}
        <div className="absolute inset-x-0 bottom-0 h-36 sm:h-44 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />
      </div>

      {/* Top-Right Minimal Pencil Customizer Button (Appears on Hover or Long-Press) */}
      <div className="absolute top-3.5 right-3.5 sm:top-5 sm:right-5 z-30">
        <button
          type="button"
          onClick={() => setIsCustomizerOpen(!isCustomizerOpen)}
          aria-label="Customize Hero Slideshow"
          title="Customize Hero Slideshow (Opacity & Fullscreen / Card View)"
          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition active:scale-95 shadow-lg border border-white/20 backdrop-blur-md ${
            isCustomizerOpen
              ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] border-transparent opacity-100'
              : 'bg-black/50 hover:bg-black/80 text-white opacity-80 sm:opacity-0 sm:group-hover:opacity-100'
          }`}
        >
          <Pencil className="w-4 h-4" />
        </button>

        {/* Hero Customizer Popover Window */}
        {isCustomizerOpen && (
          <div
            onClick={e => e.stopPropagation()}
            className="absolute top-12 right-0 w-72 sm:w-80 p-4 sm:p-5 rounded-3xl bg-[var(--modal-bg)] text-[var(--text-primary)] shadow-2xl border border-[var(--border-subtle)] z-40 animate-scale-up space-y-4 text-left"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-[var(--accent-primary)] text-[var(--bg-primary)] flex items-center justify-center shadow-xs">
                  <Sliders className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-[var(--text-primary)]">
                    Hero Customizer
                  </h4>
                  <p className="text-[10px] text-[var(--text-secondary)]">
                    Display mode & dark fog controls
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCustomizerOpen(false)}
                aria-label="Close Customizer"
                className="p-1 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--chip-bg)] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 1. Layout Mode: Card View vs Full Screen View */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-[var(--text-primary)]">
                <span>Layout Mode</span>
                <span className="text-[11px] text-[var(--text-secondary)] capitalize font-semibold">
                  {config.layoutMode === 'fullscreen' ? 'Edge-to-Edge' : 'Card Boxed'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-[var(--chip-bg)] border border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => updateConfig({ layoutMode: 'card' })}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 active:scale-95 ${
                    config.layoutMode === 'card'
                      ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>Card View</span>
                </button>

                <button
                  type="button"
                  onClick={() => updateConfig({ layoutMode: 'fullscreen' })}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 active:scale-95 ${
                    config.layoutMode === 'fullscreen'
                      ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Full Screen</span>
                </button>
              </div>
            </div>

            {/* 2. Vignette Dark Fog Opacity Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-[var(--text-primary)]">
                <span>Dark Fog Opacity</span>
                <span className="font-mono text-[11px] px-2 py-0.5 rounded-full bg-[var(--chip-bg)] border border-[var(--border-subtle)]">
                  {Math.round(config.opacity * 100)}%
                </span>
              </div>

              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={config.opacity}
                onChange={e => updateConfig({ opacity: parseFloat(e.target.value) })}
                aria-label="Vignette opacity slider"
                className="w-full accent-[var(--accent-primary)] cursor-pointer h-2 bg-[var(--chip-bg)] rounded-lg"
              />

              <div className="flex items-center justify-between text-[10px] text-[var(--text-secondary)] font-medium">
                <span>Clear Artwork (0%)</span>
                <span>Max Fog (100%)</span>
              </div>
            </div>

            {/* Reset to Default Button */}
            <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between">
              <button
                type="button"
                onClick={() => updateConfig(DEFAULT_CONFIG)}
                className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1 transition"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Defaults</span>
              </button>

              <button
                type="button"
                onClick={() => setIsCustomizerOpen(false)}
                className="py-1.5 px-3 rounded-xl bg-[var(--chip-bg)] hover:bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-primary)] transition active:scale-95"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Hero Content Information Container */}
      <div
        className={`relative z-20 w-full h-full flex flex-col justify-end text-left ${
          isFullscreen
            ? 'max-w-7xl mx-auto px-5 sm:px-8 md:px-12 lg:px-14 pb-8 sm:pb-12 md:pb-14'
            : 'p-5 sm:p-8 md:p-12 lg:p-14'
        }`}
      >
        <div className="max-w-2xl space-y-2 sm:space-y-3 animate-fade-in key={currentItem.id}">
          {/* Top Badge: Trending / Featured */}
          <div className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-black tracking-widest text-[#FF6B4A] uppercase drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
            <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#FF6B4A] fill-[#FF6B4A] animate-pulse" />
            <span>TRENDING NOW</span>
          </div>

          {/* Primary Title */}
          <h2 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white leading-[1.08] tracking-tight drop-shadow-[0_2px_14px_rgba(0,0,0,0.95)] line-clamp-2">
            {currentItem.title}
          </h2>

          {/* Metadata Badges Row */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 text-xs text-white/95 font-bold drop-shadow-[0_1px_6px_rgba(0,0,0,0.85)]">
            {/* Star Rating */}
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white shadow-xs">
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
              <span className="tabular-nums font-extrabold">{rating.toFixed(1)}</span>
            </div>

            <span aria-hidden="true" className="text-white/60">·</span>

            {/* Type */}
            <span className="flex items-center gap-1 uppercase tracking-wider font-extrabold text-[11px] sm:text-xs text-white">
              {currentItem.type === 'tv' ? (
                <>
                  <Tv className="w-3.5 h-3.5 text-white/90" />
                  <span>TV SERIES</span>
                </>
              ) : (
                <>
                  <Film className="w-3.5 h-3.5 text-white/90" />
                  <span>MOVIE</span>
                </>
              )}
            </span>

            {/* HD / 4K Badge */}
            <span className="px-1.5 py-0.5 rounded bg-white/25 text-white font-black text-[10px] tracking-wider uppercase backdrop-blur-xs shadow-2xs">
              HD
            </span>

            {/* Year */}
            {currentItem.year && (
              <>
                <span aria-hidden="true" className="text-white/60">·</span>
                <span className="font-semibold text-white/90">{currentItem.year}</span>
              </>
            )}

            {/* Genres */}
            {currentItem.genres && currentItem.genres.length > 0 && (
              <span className="hidden xs:inline-flex items-center gap-1 text-white/85 font-medium text-[11px]">
                <span>·</span>
                <span>{currentItem.genres.slice(0, 2).join(', ')}</span>
              </span>
            )}
          </div>

          {/* Synopsis Description */}
          {currentItem.overview && (
            <p className="text-xs sm:text-sm md:text-base text-gray-100/95 line-clamp-2 sm:line-clamp-3 leading-relaxed drop-shadow-[0_1px_8px_rgba(0,0,0,0.95)] max-w-xl font-normal pt-0.5">
              {currentItem.overview}
            </p>
          )}

          {/* Action Buttons Row */}
          <div className="pt-2 sm:pt-3 flex flex-wrap items-center gap-2.5 sm:gap-3">
            {/* Watch / Preview Action */}
            <button
              type="button"
              onClick={() => onSelectMedia(currentItem)}
              className="px-5 sm:px-6 py-2.5 sm:py-3 rounded-full bg-white text-black hover:bg-white/90 active:scale-95 font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg transition"
            >
              <Play className="w-4 h-4 fill-black" />
              <span>Watch Now</span>
            </button>

            {/* More Info Action */}
            <button
              type="button"
              onClick={() => onSelectMedia(currentItem)}
              className="px-5 sm:px-6 py-2.5 sm:py-3 rounded-full bg-black/45 hover:bg-black/65 text-white border border-white/25 backdrop-blur-md active:scale-95 font-bold text-xs sm:text-sm flex items-center gap-2 shadow-sm transition"
            >
              <Info className="w-4 h-4" />
              <span>More Info</span>
            </button>

            {/* Quick Watchlist Toggle Button */}
            {onToggleWatchlist && (
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  onToggleWatchlist(currentItem.id);
                }}
                title={inWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
                aria-label={inWatchlist ? 'In Watchlist' : 'Add to Watchlist'}
                className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full border border-white/25 backdrop-blur-md flex items-center justify-center transition active:scale-95 ${
                  inWatchlist
                    ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] border-transparent'
                    : 'bg-black/45 hover:bg-black/65 text-white'
                }`}
              >
                {inWatchlist ? (
                  <Check className="w-4 h-4 stroke-[3]" />
                ) : (
                  <Bookmark className="w-4 h-4" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Left Navigation Arrow */}
      {featuredItems.length > 1 && (
        <button
          type="button"
          onClick={goToPrev}
          aria-label="Previous featured title"
          className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-black/45 hover:bg-black/75 text-white border border-white/20 backdrop-blur-md flex items-center justify-center transition active:scale-90 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 shadow-md"
        >
          <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      )}

      {/* Right Navigation Arrow */}
      {featuredItems.length > 1 && (
        <button
          type="button"
          onClick={goToNext}
          aria-label="Next featured title"
          className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-black/45 hover:bg-black/75 text-white border border-white/20 backdrop-blur-md flex items-center justify-center transition active:scale-90 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 shadow-md"
        >
          <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      )}

      {/* Pagination Indicators at Bottom Center */}
      {featuredItems.length > 1 && (
        <div className="absolute bottom-3.5 sm:bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">
          {featuredItems.map((_, index) => {
            const isActive = index === currentIndex;
            return (
              <button
                key={index}
                type="button"
                onClick={() => setCurrentIndex(index)}
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
