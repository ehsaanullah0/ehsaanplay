import React, { useState, useEffect, useRef } from 'react';
import { ActiveTab, GenreMixBottomBarAction } from '../../types/movie';
import { Film, Bookmark, Layers, Settings, Search, Sparkles, X, Shuffle } from 'lucide-react';
import { useFullscreen } from '../../hooks/useFullscreen';

interface BottomNavigationProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  swapSearchAndLists?: boolean;
  onOpenSearch?: () => void;
  onTriggerSwapConfirm?: () => void;
  genreMixAction?: GenreMixBottomBarAction | null;
}

/**
 * Mathematically continuous, organic 4-pod scalloped metaball contour (248x64).
 * 4 circular nodes at x = 31, 93, 155, 217; radius = 27; height = 64; waist dip = 7px.
 * Tangent-continuous cubic Bézier waists connect adjacent circular pods.
 */
const SCALLOPED_DOCK_PATH =
  'M 31 59 A 27 27 0 0 1 31 5 ' +
  'C 46 5, 50 12, 62 12 ' +
  'C 74 12, 78 5, 93 5 ' +
  'C 108 5, 112 12, 124 12 ' +
  'C 136 12, 140 5, 155 5 ' +
  'C 170 5, 174 12, 186 12 ' +
  'C 198 12, 202 5, 217 5 ' +
  'A 27 27 0 0 1 217 59 ' +
  'C 202 59, 198 52, 186 52 ' +
  'C 174 52, 170 59, 155 59 ' +
  'C 140 59, 136 52, 124 52 ' +
  'C 112 52, 108 59, 93 59 ' +
  'C 78 59, 74 52, 62 52 ' +
  'C 50 52, 46 59, 31 59 Z';

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab,
  onSelectTab,
  swapSearchAndLists = false,
  onOpenSearch,
  onTriggerSwapConfirm,
  genreMixAction,
}) => {
  const { isFullscreen } = useFullscreen();
  const [isVisible, setIsVisible] = useState(true);
  const [optimisticTab, setOptimisticTab] = useState<ActiveTab>(activeTab);
  const lastScrollY = useRef(0);

  const isMixing = Boolean(genreMixAction && genreMixAction.genreCount > 0);

  // Keep optimistic tab in sync whenever parent activeTab updates
  useEffect(() => {
    setOptimisticTab(activeTab);
  }, [activeTab]);

  // Long press detection on tabs (especially search/lists to trigger swap confirm)
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);

  const startPress = (tabId: string) => {
    isLongPressRef.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);

    if (tabId === 'lists' || tabId === 'search') {
      timerRef.current = setTimeout(() => {
        isLongPressRef.current = true;
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try {
            navigator.vibrate(40);
          } catch {
            // ignore
          }
        }
        if (onTriggerSwapConfirm) {
          onTriggerSwapConfirm();
        }
      }, 500);
    }
  };

  const cancelPress = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  // Directional scroll detection
  useEffect(() => {
    let accumulatedDelta = 0;

    const handleScroll = () => {
      // While mixing genres, always keep the bar visible so the user never loses the Generate button
      if (isMixing) {
        setIsVisible(true);
        return;
      }

      const currentScrollY = window.scrollY;
      const delta = currentScrollY - lastScrollY.current;

      // Always show near top of page
      if (currentScrollY <= 50) {
        setIsVisible(true);
        accumulatedDelta = 0;
        lastScrollY.current = currentScrollY;
        return;
      }

      // Reset accumulation on directional shift
      if ((delta > 0 && accumulatedDelta < 0) || (delta < 0 && accumulatedDelta > 0)) {
        accumulatedDelta = 0;
      }
      accumulatedDelta += delta;

      // Scrolling DOWN by > 12px -> cleanly hide dock
      if (accumulatedDelta > 12 && currentScrollY > 50) {
        setIsVisible(false);
      }
      // Scrolling UP by > 12px -> reveal dock
      else if (accumulatedDelta < -12) {
        setIsVisible(true);
      }

      // Keep visible if user is at the very bottom of the document
      const isAtBottom =
        window.innerHeight + currentScrollY >= document.documentElement.scrollHeight - 30;
      if (isAtBottom) {
        setIsVisible(true);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isMixing]);

  // Define tabs dynamically based on swapSearchAndLists
  const tabs: {
    id: ActiveTab | 'search';
    label: string;
    icon: React.FC<{ className?: string }>;
    isSpecialAction?: boolean;
  }[] = [
    { id: 'home', label: 'Home', icon: Film },
    { id: 'watchlist', label: 'Watchlist', icon: Bookmark },
    swapSearchAndLists
      ? { id: 'search', label: 'Search', icon: Search, isSpecialAction: true }
      : { id: 'lists', label: 'Lists', icon: Layers },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const currentTab = optimisticTab || activeTab;
  const activeIndex = tabs.findIndex(tab => !tab.isSpecialAction && currentTab === tab.id);

  const handleTabClick = (tabId: ActiveTab | 'search', isSpecialAction?: boolean) => {
    if (isLongPressRef.current) {
      isLongPressRef.current = false;
      return;
    }

    if (isSpecialAction && tabId === 'search') {
      if (onOpenSearch) onOpenSearch();
    } else {
      // Immediate optimistic feedback without delay
      setOptimisticTab(tabId as ActiveTab);
      setIsVisible(true);
      onSelectTab(tabId as ActiveTab);
    }
  };

  return (
    <div
      style={{
        bottom: isFullscreen
          ? 'calc(1.1rem + env(safe-area-inset-bottom, 0px))'
          : 'calc(0.75rem + env(safe-area-inset-bottom, 0px))',
      }}
      className={`fixed left-0 right-0 z-40 flex justify-center px-4 transition-all duration-300 ease-out will-change-transform ${
        isMixing ? 'flex' : 'md:hidden'
      } ${
        isVisible || isMixing ? 'translate-y-0 opacity-100 pointer-events-auto' : 'translate-y-28 opacity-0 pointer-events-none'
      }`}
    >
      {/* Morphing Liquid Nav Dock Container */}
      <nav
        aria-label="Navigation & Actions"
        style={{
          width: isMixing ? 'min(390px, calc(100vw - 32px))' : '248px',
          height: '64px',
          transition: 'width 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
        className="relative select-none touch-manipulation flex items-center justify-center"
      >
        {/* State A: Normal 4-Pod Scalloped Dock (Liquid morphs out when mixing) */}
        {!isMixing && (
          <div className="absolute inset-0 w-full h-full animate-fade-in">
            {/* SVG Fluid Conjoined Organic Hull */}
            <svg
              viewBox="0 0 248 64"
              className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
              style={{
                filter:
                  'drop-shadow(0 14px 28px rgba(0, 0, 0, 0.25)) drop-shadow(0 3px 8px rgba(0, 0, 0, 0.12))',
              }}
            >
              <path
                d={SCALLOPED_DOCK_PATH}
                className="fill-[var(--bg-nav-container)] transition-colors duration-300"
                style={{
                  stroke: 'var(--nav-dock-border, rgba(255, 255, 255, 0.95))',
                  strokeWidth: 2.75,
                  strokeLinejoin: 'round',
                }}
              />
            </svg>

            {/* Sliding Active Circular Highlight with Spring Physics */}
            {activeIndex >= 0 && (
              <div
                className="absolute top-[8px] left-[7px] w-[48px] h-[48px] rounded-full bg-[var(--bg-nav-active)] pointer-events-none transition-transform duration-250 ease-[cubic-bezier(0.2,0.8,0.2,1)] z-10 will-change-transform"
                style={{
                  transform: `translateX(${activeIndex * 62}px)`,
                  boxShadow: '0 4px 14px -1px rgba(0, 0, 0, 0.25), 0 2px 6px -1px rgba(0, 0, 0, 0.14)',
                }}
              />
            )}

            {/* 4 Interactive Tab Buttons Layer */}
            <div className="relative z-20 w-full h-full flex items-center">
              {tabs.map((tab) => {
                const isActive = !tab.isSpecialAction && currentTab === tab.id;
                const Icon = tab.icon;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleTabClick(tab.id, tab.isSpecialAction)}
                    onTouchStart={() => startPress(tab.id)}
                    onTouchMove={cancelPress}
                    onTouchEnd={cancelPress}
                    onTouchCancel={cancelPress}
                    onMouseDown={() => startPress(tab.id)}
                    onMouseUp={cancelPress}
                    onMouseLeave={cancelPress}
                    onContextMenu={e => {
                      if (tab.id === 'lists' || tab.id === 'search') {
                        e.preventDefault();
                        if (onTriggerSwapConfirm) onTriggerSwapConfirm();
                      }
                    }}
                    aria-label={tab.label}
                    aria-current={isActive ? 'page' : undefined}
                    title={
                      tab.id === 'lists' || tab.id === 'search'
                        ? `${tab.label} (Hold to swap layout)`
                        : tab.label
                    }
                    style={{ touchAction: 'manipulation' }}
                    className="w-[62px] h-[64px] flex items-center justify-center relative cursor-pointer focus:outline-none active:scale-95 transition-transform duration-150"
                  >
                    <div
                      className={`w-[46px] h-[46px] rounded-full flex items-center justify-center transition-all duration-200 ${
                        isActive
                          ? 'opacity-0 scale-90'
                          : 'opacity-100 scale-100 bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.1]'
                      }`}
                    >
                      <Icon
                        className={`w-5 h-5 transition-all duration-200 ${
                          isActive
                            ? 'text-[var(--text-nav-active)] stroke-[2.5] scale-110'
                            : 'text-[var(--text-nav-inactive)] stroke-[2] opacity-85 hover:opacity-100'
                        }`}
                      />
                    </div>

                    {isActive && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <Icon className="w-5 h-5 text-[var(--text-nav-active)] stroke-[2.5] scale-110 animate-scale-up" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* State B: Liquid Morph Generate Button (Transitions in when selecting genres) */}
        {isMixing && genreMixAction && (
          <div className="absolute inset-0 w-full h-full flex items-center justify-between px-2.5 py-1.5 rounded-full bg-[var(--bg-nav-container)] border-[2.75px] border-[var(--nav-dock-border)] shadow-2xl animate-liquid-morph z-30 overflow-hidden">
            {/* Subtle Liquid Shimmer Aura */}
            <div
              className="absolute inset-0 opacity-20 pointer-events-none animate-liquid-flow"
              style={{
                background:
                  'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
              }}
            />

            {/* Left Section: Cancel/Clear & Count Indicator */}
            <div className="flex items-center gap-2 pl-1 z-10 min-w-0">
              <button
                type="button"
                onClick={genreMixAction.onClear}
                className="w-9 h-9 rounded-full bg-black/10 dark:bg-white/10 hover:bg-rose-500 hover:text-white text-[var(--text-nav-inactive)] flex items-center justify-center transition-all active:scale-90 cursor-pointer shrink-0"
                title="Clear selected genres"
                aria-label="Clear selected genres"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>

              <div className="flex flex-col min-w-0 pr-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-[var(--text-nav-inactive)] opacity-75 leading-none">
                  Mix Mode
                </span>
                <span className="text-xs font-bold text-[var(--text-nav-inactive)] truncate max-w-[110px] sm:max-w-[140px] leading-tight mt-0.5">
                  {genreMixAction.genreCount} Genres
                </span>
              </div>
            </div>

            {/* Right Section: Liquid Animated Generate Action Button */}
            <button
              type="button"
              onClick={genreMixAction.onGenerate}
              className="relative px-5 py-2.5 rounded-full bg-[var(--bg-nav-active)] text-[var(--text-nav-active)] font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg active:scale-95 transition-all duration-200 cursor-pointer overflow-hidden group shrink-0"
            >
              {/* Internal Liquid Glow Shimmer */}
              <div className="absolute inset-0 bg-gradient-to-r from-amber-400/20 via-transparent to-amber-400/20 opacity-0 group-hover:opacity-100 transition-opacity" />

              <Sparkles className="w-4 h-4 text-amber-300 fill-current animate-pulse shrink-0" />
              <span className="tracking-tight whitespace-nowrap">
                Generate Top {genreMixAction.selectedCount}
              </span>
            </button>
          </div>
        )}
      </nav>
    </div>
  );
};
