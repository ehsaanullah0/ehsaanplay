import React, { useState, useEffect, useRef } from 'react';
import { ActiveTab } from '../../types/movie';
import { Film, Compass, Bookmark, Layers, Settings } from 'lucide-react';

interface BottomNavigationProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab,
  onSelectTab,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);
  const scrollTimeout = useRef<number | null>(null);

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

  const tabs: { id: ActiveTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'home', label: 'Home', icon: Film },
    { id: 'watchlist', label: 'Watchlist', icon: Bookmark },
    { id: 'lists', label: 'Lists', icon: Layers },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

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
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          if (isActive) {
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--bg-nav-active)] text-[var(--text-nav-active)] text-sm font-bold shadow-xs transition-all duration-200 focus:outline-none"
              >
                <Icon className="w-4 h-4 stroke-[2.5]" />
                <span>{tab.label}</span>
              </button>
            );
          }

          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              aria-label={tab.label}
              className="p-2.5 rounded-full text-[var(--text-nav-inactive)] hover:opacity-80 active:scale-90 transition-all duration-150 focus:outline-none"
            >
              <Icon className="w-5 h-5 stroke-[2]" />
            </button>
          );
        })}
      </nav>
    </div>
  );
};
