import React, { useState, useEffect, useRef } from 'react';
import { ActiveTab } from '../../types/movie';
import { Film, Bookmark, Layers, Settings, Search } from 'lucide-react';

interface BottomNavigationProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  swapSearchAndLists?: boolean;
  onOpenSearch?: () => void;
  onTriggerSwapConfirm?: () => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab,
  onSelectTab,
  swapSearchAndLists = false,
  onOpenSearch,
  onTriggerSwapConfirm,
}) => {
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
      }, 450);
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

      if (currentScrollY > lastScrollY.current && currentScrollY > 60) {
        // Scrolling down
        setIsVisible(false);
      } else {
        // Scrolling up or at top
        setIsVisible(true);
      }

      lastScrollY.current = currentScrollY;

      // Clear any existing timer
      if (scrollTimeout.current) {
        window.clearTimeout(scrollTimeout.current);
      }

      // Re-show navigation when scrolling stops
      scrollTimeout.current = window.setTimeout(() => {
        setIsVisible(true);
      }, 1200);
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
      className={`md:hidden fixed bottom-5 left-0 right-0 z-40 flex justify-center pointer-events-none px-4 pb-safe transition-all duration-300 ease-out ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-28 opacity-0'
      }`}
    >
      <nav
        aria-label="Mobile Navigation"
        className="pointer-events-auto flex items-center gap-1.5 p-1.5 bg-[var(--bg-nav-container)] rounded-full shadow-xl border border-[var(--border-subtle)] backdrop-blur-md transition-colors duration-200"
      >
        {tabs.map(tab => {
          const isActive = !tab.isSpecialAction && activeTab === tab.id;
          const Icon = tab.icon;

          if (isActive) {
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id, tab.isSpecialAction)}
                onTouchStart={() => startPress(tab.id)}
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
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--bg-nav-active)] text-[var(--text-nav-active)] text-sm font-bold shadow-xs transition-all duration-200 focus:outline-none select-none"
              >
                <Icon className="w-4 h-4 stroke-[2.5]" />
                <span>{tab.label}</span>
              </button>
            );
          }

          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id, tab.isSpecialAction)}
              onTouchStart={() => startPress(tab.id)}
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
              title={
                tab.id === 'lists' || tab.id === 'search'
                  ? `${tab.label} (Hold to swap layout)`
                  : tab.label
              }
              className={`p-2.5 rounded-full text-[var(--text-nav-inactive)] hover:opacity-80 active:scale-90 transition-all duration-150 focus:outline-none select-none ${
                tab.isSpecialAction ? 'hover:text-[var(--accent-primary)]' : ''
              }`}
            >
              <Icon className="w-5 h-5 stroke-[2]" />
            </button>
          );
        })}
      </nav>
    </div>
  );
};
