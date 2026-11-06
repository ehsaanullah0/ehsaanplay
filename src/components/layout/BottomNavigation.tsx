import React, { useState, useEffect, useRef } from 'react';
import { ActiveTab } from '../../types/movie';
import { Film, Bookmark, Layers, Settings, Search } from 'lucide-react';
import { useFullscreen } from '../../hooks/useFullscreen';

interface BottomNavigationProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  swapSearchAndLists?: boolean;
  onOpenSearch?: () => void;
  onTriggerSwapConfirm?: () => void;
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
}) => {
  const { isFullscreen } = useFullscreen();
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);
  const scrollTimeout = useRef<number | null>(null);

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

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const delta = currentScrollY - lastScrollY.current;

      // When near top or bottom, always keep navigation visible
      if (currentScrollY < 100) {
        setIsVisible(true);
      } else if (delta > 40 && currentScrollY > 160) {
        // Only hide on significant, fast continuous downward scrolling
        setIsVisible(false);
      } else if (delta < -10) {
        // Immediately reveal on any slight upward scroll gesture
        setIsVisible(true);
      }

      lastScrollY.current = currentScrollY;

      if (scrollTimeout.current) {
        window.clearTimeout(scrollTimeout.current);
      }

      // Fast restore when scrolling pauses so user can always tap
      scrollTimeout.current = window.setTimeout(() => {
        setIsVisible(true);
      }, 500);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeout.current) window.clearTimeout(scrollTimeout.current);
    };
  }, []);

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

  const activeIndex = tabs.findIndex(tab => !tab.isSpecialAction && activeTab === tab.id);

  const handleTabClick = (tabId: ActiveTab | 'search', isSpecialAction?: boolean) => {
    if (isLongPressRef.current) {
      isLongPressRef.current = false;
      return;
    }

    if (isSpecialAction && tabId === 'search') {
      if (onOpenSearch) onOpenSearch();
    } else {
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
      className={`md:hidden fixed left-0 right-0 z-40 flex justify-center pointer-events-none px-4 transition-all duration-300 ease-out ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-28 opacity-0'
      }`}
    >
      {/* Floating Conjoined Scalloped Organic Dock Container */}
      <nav
        aria-label="Mobile Navigation"
        className="pointer-events-auto relative w-[248px] h-[64px] select-none touch-manipulation"
      >
        {/* SVG Fluid Conjoined Organic Hull with Crisp Outline & Floating Ambient Shadow */}
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
            className="absolute top-[8px] left-[7px] w-[48px] h-[48px] rounded-full bg-[var(--bg-nav-active)] pointer-events-none transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] z-10"
            style={{
              transform: `translateX(${activeIndex * 62}px)`,
              boxShadow: '0 4px 14px -1px rgba(0, 0, 0, 0.25), 0 2px 6px -1px rgba(0, 0, 0, 0.14)',
            }}
          />
        )}

        {/* 4 Interactive Tab Buttons Layer */}
        <div className="relative z-20 w-full h-full flex items-center">
          {tabs.map((tab) => {
            const isActive = !tab.isSpecialAction && activeTab === tab.id;
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
                {/* Subtle Inactive Circular Pod Background (matches reference image pod disc) */}
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

                {/* Overlaid Active Icon in center of the sliding bubble */}
                {isActive && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <Icon className="w-5 h-5 text-[var(--text-nav-active)] stroke-[2.5] scale-110 animate-scale-up" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
