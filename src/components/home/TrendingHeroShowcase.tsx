import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MediaItem, PersonalMediaState, UserSettings, AppTweaksConfig } from '../../types/movie';
import { fetchTMDBTrending } from '../../services/tmdb';
import { fetchTMDBRecommendations, CURATED_OMDB_RECOMMENDATIONS } from '../../data/curatedCatalog';
import { ChevronLeft, ChevronRight, Film, Tv } from 'lucide-react';

interface TrendingHeroShowcaseProps {
  onSelectMedia: (item: MediaItem) => void;
  userStates?: Record<string, PersonalMediaState>;
  settings?: UserSettings;
  tweaks?: AppTweaksConfig;
  onToggleWatchlist?: (id: string) => void;
  onScrollToCinema?: () => void;
}

export const TrendingHeroShowcase: React.FC<TrendingHeroShowcaseProps> = ({
  onSelectMedia,
  settings,
}) => {
  const [category, setCategory] = useState<'all' | 'movie' | 'tv'>('all');
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Responsive device width tracking
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1400
  );

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 640;
  const isTablet = windowWidth >= 640 && windowWidth < 1024;
  const isWide = windowWidth >= 1440;

  // Responsive dynamic card dimensions & wide spacing to fill empty side space
  const cardWidth = isMobile
    ? 200
    : isTablet
    ? 260
    : isWide
    ? 330
    : 290;

  const cardHeight = Math.round(cardWidth * 1.5); // 2:3 vertical poster ratio

  const spacing = isMobile
    ? 110
    : isTablet
    ? 180
    : isWide
    ? 330
    : 280;

  // Smooth Interactive Drag / Swipe State
  const [dragOffset, setDragOffset] = useState(0);
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const hasMovedRef = useRef(false);

  // Load trending data from TMDB / Cache with graceful offline fallback
  useEffect(() => {
    let isCancelled = false;

    const loadTrendingData = async () => {
      setLoading(true);

      const cacheKey = `ehsaan_trending_cache_v3_${category}`;
      const cacheTimeKey = `ehsaan_trending_cache_time_v3_${category}`;

      // 1. Instant hydration from cached session if valid (within 30 mins)
      try {
        const cachedRaw = localStorage.getItem(cacheKey);
        const cachedTime = localStorage.getItem(cacheTimeKey);
        if (cachedRaw && cachedTime) {
          const age = Date.now() - parseInt(cachedTime, 10);
          if (age < 30 * 60 * 1000) {
            const parsed = JSON.parse(cachedRaw);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setItems(parsed);
              setLoading(false);
            }
          }
        }
      } catch {
        // ignore cache parse error
      }

      // 2. Fetch fresh live trending from TMDB
      try {
        const liveItems = await fetchTMDBTrending(category, 'week', settings?.tmdbApiKey);
        if (!isCancelled && liveItems && liveItems.length > 0) {
          const withPosters = liveItems.filter(item => Boolean(item.posterUrl));
          const finalItems = withPosters.length >= 7 ? withPosters : liveItems;

          setItems(finalItems);
          try {
            localStorage.setItem(cacheKey, JSON.stringify(finalItems));
            localStorage.setItem(cacheTimeKey, Date.now().toString());
          } catch {
            // storage quota fallback
          }
        }
      } catch (err) {
        console.warn('Failed to fetch live TMDB trending, attempting fallback:', err);
        if (!isCancelled) {
          try {
            const curated = await fetchTMDBRecommendations(settings?.tmdbApiKey);
            if (curated && curated.length > 0) {
              setItems(curated);
            } else {
              setItems(CURATED_OMDB_RECOMMENDATIONS);
            }
          } catch {
            setItems(CURATED_OMDB_RECOMMENDATIONS);
          }
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    loadTrendingData();

    return () => {
      isCancelled = true;
    };
  }, [category, settings?.tmdbApiKey]);

  // Center active item index reset on category change
  useEffect(() => {
    setActiveIndex(0);
  }, [category]);

  const goToPrev = useCallback(() => {
    setActiveIndex(prev => (prev === 0 ? items.length - 1 : prev - 1));
  }, [items.length]);

  const goToNext = useCallback(() => {
    setActiveIndex(prev => (prev + 1) % items.length);
  }, [items.length]);

  // Auto-advance coverflow every 6.5s when user is not hovering or dragging
  useEffect(() => {
    if (items.length <= 1 || isHovered || isDraggingRef.current) return;

    const interval = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % items.length);
    }, 3200);

    return () => clearInterval(interval);
  }, [items.length, isHovered]);

  // Keyboard navigation (Left / Right arrow keys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }
      if (e.key === 'ArrowLeft') {
        goToPrev();
      } else if (e.key === 'ArrowRight') {
        goToNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPrev, goToNext]);

  // --- SWIPE & DRAG GESTURE LOGIC (Mouse & Touch) ---
  const handlePointerDown = (clientX: number) => {
    isDraggingRef.current = true;
    dragStartXRef.current = clientX;
    hasMovedRef.current = false;
    setDragOffset(0);
  };

  const handlePointerMove = (clientX: number) => {
    if (!isDraggingRef.current) return;
    const diff = clientX - dragStartXRef.current;
    if (Math.abs(diff) > 5) {
      hasMovedRef.current = true;
    }
    // Dampen drag slightly for natural resistance
    setDragOffset(diff * 0.7);
  };

  const handlePointerUp = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    if (dragOffset < -40) {
      goToNext();
    } else if (dragOffset > 40) {
      goToPrev();
    }
    setDragOffset(0);
  };

  // Wheel horizontal swipe navigation
  const wheelTimeoutRef = useRef<number | null>(null);
  const handleWheel = (e: React.WheelEvent) => {
    if (Math.abs(e.deltaX) > 25) {
      if (wheelTimeoutRef.current) return;
      if (e.deltaX > 0) {
        goToNext();
      } else {
        goToPrev();
      }
      wheelTimeoutRef.current = window.setTimeout(() => {
        wheelTimeoutRef.current = null;
      }, 350);
    }
  };

  const handleCardClick = (index: number, item: MediaItem) => {
    // If the user was dragging/swiping, do not trigger click
    if (hasMovedRef.current) return;

    if (index === activeIndex) {
      onSelectMedia(item);
    } else {
      setActiveIndex(index);
    }
  };

  return (
    <section
      aria-label="Trending Shows Coverflow"
      className="relative w-full min-h-[calc(100vh-4rem)] flex flex-col justify-between overflow-hidden select-none bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-300"
      onWheel={handleWheel}
      onTouchStart={e => handlePointerDown(e.touches[0].clientX)}
      onTouchMove={e => handlePointerMove(e.touches[0].clientX)}
      onTouchEnd={handlePointerUp}
      onTouchCancel={handlePointerUp}
      onMouseDown={e => {
        // Only primary mouse click initiates drag
        if (e.button === 0) handlePointerDown(e.clientX);
      }}
      onMouseMove={e => handlePointerMove(e.clientX)}
      onMouseUp={handlePointerUp}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        handlePointerUp();
      }}
    >
      {/* Ambient Radial Glow matching App Theme */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-700 opacity-60 dark:opacity-40"
        style={{
          background:
            'radial-gradient(circle 900px at 50% 45%, var(--accent-primary) 0%, transparent 75%)',
          filter: 'blur(100px)',
          opacity: 0.12,
        }}
      />

      {/* Top Header Section with Google Sans Flex Typography & Preserved Arrow Controls */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-['Google_Sans_Flex',sans-serif] font-bold tracking-tight text-[var(--text-primary)] leading-tight">
            Trending this week
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1.5 font-['Google_Sans_Flex',sans-serif] font-normal tracking-wide">
            What the world is watching right now, updated every half hour.
          </p>
        </div>

        {/* Category Pill Switcher & Navigation Arrow Buttons (Preserved at Top Right) */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-1 p-1 rounded-full bg-[var(--chip-bg)] border border-[var(--border-subtle)] shadow-2xs">
            <button
              type="button"
              onClick={() => setCategory('all')}
              className={`px-3 py-1 rounded-full text-xs font-['Google_Sans_Flex',sans-serif] font-bold transition-all cursor-pointer ${
                category === 'all'
                  ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setCategory('movie')}
              className={`px-3 py-1 rounded-full text-xs font-['Google_Sans_Flex',sans-serif] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                category === 'movie'
                  ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Film className="w-3 h-3" />
              <span>Movies</span>
            </button>
            <button
              type="button"
              onClick={() => setCategory('tv')}
              className={`px-3 py-1 rounded-full text-xs font-['Google_Sans_Flex',sans-serif] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                category === 'tv'
                  ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Tv className="w-3 h-3" />
              <span>Series</span>
            </button>
          </div>

          {/* Top Right Arrow Controls (Preserved as requested) */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={goToPrev}
              aria-label="Previous Trending Title"
              className="p-2 rounded-full bg-[var(--chip-bg)] hover:bg-[var(--border-subtle)] text-[var(--text-primary)] transition active:scale-95 border border-[var(--border-subtle)] shadow-2xs cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={goToNext}
              aria-label="Next Trending Title"
              className="p-2 rounded-full bg-[var(--chip-bg)] hover:bg-[var(--border-subtle)] text-[var(--text-primary)] transition active:scale-95 border border-[var(--border-subtle)] shadow-2xs cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Expanded 3D Coverflow Stage Container: Spans Wide & Fills Unallocated Space */}
      <div
        className="relative z-10 w-full flex-1 flex items-center justify-center my-auto py-6 sm:py-8 overflow-hidden cursor-grab active:cursor-grabbing"
        style={{
          perspective: isMobile ? '800px' : isTablet ? '1200px' : '1600px',
        }}
      >
        {loading && items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 text-[var(--text-secondary)] py-20">
            <div className="w-8 h-8 rounded-full border-2 border-[var(--accent-primary)] border-t-transparent animate-spin" />
            <span className="text-xs font-semibold tracking-wider uppercase font-['Google_Sans_Flex',sans-serif]">
              Loading trending titles...
            </span>
          </div>
        ) : (
          <div
            className="relative"
            style={{
              width: `${cardWidth}px`,
              height: `${cardHeight}px`,
              transformStyle: 'preserve-3d',
            }}
          >
            {items.map((item, index) => {
              const total = items.length;
              let offset = (index - activeIndex) % total;
              if (offset > total / 2) offset -= total;
              if (offset < -total / 2) offset += total;

              const absOffset = Math.abs(offset);

              // On wide screens show 7 cards (offset <= 3), on mobile show 5 cards (offset <= 2)
              const maxVisibleOffset = isMobile ? 2 : 3;
              const isVisible = absOffset <= maxVisibleOffset;
              if (!isVisible) return null;

              const isCenter = offset === 0;

              // Apply dragOffset interactively to translateX
              const baseTranslateX = offset * spacing + dragOffset;
              const translateZ = -absOffset * (isMobile ? 55 : 85);
              const rotateY = -offset * (isMobile ? 20 : 25);
              const scale = 1 - absOffset * (isMobile ? 0.10 : 0.12);
              const opacity = 1 - absOffset * (isMobile ? 0.25 : 0.18);
              const zIndex = 35 - absOffset * 10;
              const brightness = 1 - absOffset * 0.20;

              // Clean subtle hover lift on center card (without any obscuring details card)
              const isCenterHovered = isCenter && isHovered && !isDraggingRef.current;
              const popTranslateY = isCenterHovered ? -8 : 0;
              const popScale = isCenterHovered ? scale * 1.04 : scale;

              const rating = item.imdbRating || item.tmdbRating || 7.5;

              return (
                <div
                  key={item.id || item.tmdbId || index}
                  onClick={() => handleCardClick(index, item)}
                  role="button"
                  tabIndex={0}
                  aria-label={`${item.title} (${item.year || 'Trending'})`}
                  className={`absolute inset-0 rounded-2xl sm:rounded-3xl cursor-pointer select-none overflow-hidden ${
                    isDraggingRef.current ? 'transition-none' : 'transition-all duration-400 ease-[cubic-bezier(0.25,1,0.5,1)]'
                  } ${
                    isCenter
                      ? 'shadow-[0_28px_65px_-12px_rgba(0,0,0,0.7)]'
                      : 'shadow-xl'
                  }`}
                  style={{
                    transform: `translate3d(${baseTranslateX}px, ${popTranslateY}px, ${translateZ}px) rotateY(${rotateY}deg) scale(${popScale})`,
                    zIndex: isCenter ? 40 : zIndex,
                    opacity,
                    filter: `brightness(${isCenterHovered ? 1.05 : brightness})`,
                    border: isCenter
                      ? '2px solid rgba(255, 255, 255, 0.45)'
                      : '1px solid rgba(255, 255, 255, 0.18)',
                  }}
                >
                  {/* Pristine Full Movie Poster Artwork (No obscuring hover details card) */}
                  <img
                    src={item.posterUrl || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=80'}
                    alt={item.title}
                    className="w-full h-full object-cover pointer-events-none"
                    loading="lazy"
                    onError={e => {
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=80';
                    }}
                  />

                  {/* Clean, Subtle Bottom Gradient with Title and Metadata */}
                  {isCenter && (
                    <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col justify-end p-4 sm:p-5 pointer-events-none transition-opacity duration-300">
                      <p className="text-base sm:text-lg font-['Google_Sans_Flex',sans-serif] font-bold text-white drop-shadow truncate">
                        {item.title}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-neutral-300 font-medium mt-0.5">
                        <span>{item.year || '2026'}</span>
                        <span>·</span>
                        <span className="text-[#EBB04D] font-bold">★ {rating.toFixed(1)}/10</span>
                        {item.type === 'tv' && (
                          <>
                            <span>·</span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] uppercase font-bold bg-white/20 text-white backdrop-blur-xs">
                              Series
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
