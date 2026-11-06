import React, { useRef, useState, useEffect } from 'react';
import { ActiveTab } from '../../types/movie';
import { Search, Download, Sparkles, Maximize2, Minimize2, Layers } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { useFullscreen } from '../../hooks/useFullscreen';

interface HeaderProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onOpenSearch: () => void;
  onRandomPick: () => void;
  onOpenImdbPreview?: () => void;
  autoHideHeader?: boolean;
  swapSearchAndLists?: boolean;
  onTriggerSwapConfirm?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  onOpenSearch,
  onRandomPick,
  onOpenImdbPreview,
  autoHideHeader = true,
  swapSearchAndLists = false,
  onTriggerSwapConfirm,
}) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollYRef = useRef(0);

  const handleHeaderInstall = async () => {
    // Immediately awake native browser install prompt dialog window
    await install();
  };

  // Long press detection on the top corner action button (Search or Lists)
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);

  const startPress = (x: number, y: number) => {
    isLongPressRef.current = false;
    startPosRef.current = { x, y };
    if (timerRef.current) clearTimeout(timerRef.current);

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
  };

  const cancelPress = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      startPress(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startPosRef.current && e.touches.length === 1) {
      const dx = Math.abs(e.touches[0].clientX - startPosRef.current.x);
      const dy = Math.abs(e.touches[0].clientY - startPosRef.current.y);
      if (dx > 10 || dy > 10) {
        cancelPress();
      }
    }
  };

  const handleTouchEnd = () => {
    cancelPress();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      startPress(e.clientX, e.clientY);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (startPosRef.current) {
      const dx = Math.abs(e.clientX - startPosRef.current.x);
      const dy = Math.abs(e.clientY - startPosRef.current.y);
      if (dx > 10 || dy > 10) {
        cancelPress();
      }
    }
  };

  const handleMouseUp = () => {
    cancelPress();
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    cancelPress();
    if (onTriggerSwapConfirm) {
      onTriggerSwapConfirm();
    }
  };

  const handleCornerButtonClick = (e: React.MouseEvent) => {
    if (isLongPressRef.current) {
      e.preventDefault();
      e.stopPropagation();
      isLongPressRef.current = false;
      return;
    }

    if (swapSearchAndLists) {
      onSelectTab('lists');
    } else {
      onOpenSearch();
    }
  };

  useEffect(() => {
    if (!autoHideHeader) {
      setIsVisible(true);
      return;
    }

    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY <= 20) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollYRef.current && currentScrollY > 60) {
        // Scrolling down -> Hide topbar
        setIsVisible(false);
      } else if (currentScrollY < lastScrollYRef.current) {
        // Scrolling up -> Show topbar
        setIsVisible(true);
      }

      lastScrollYRef.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [autoHideHeader]);

  return (
    <header
      className={`sticky top-0 z-40 w-full bg-[var(--header-bg)] backdrop-blur-md border-b border-[var(--border-subtle)] text-[var(--text-primary)] transition-transform duration-300 ease-in-out ${
        isVisible ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Single Brand Wordmark */}
        <button
          onClick={() => onSelectTab('home')}
          className="text-left font-black tracking-tight text-xl sm:text-2xl text-[var(--text-primary)] hover:opacity-80 transition-colors focus:outline-none"
        >
          EHSAAN <span className="text-[var(--accent-primary)] font-semibold">PLAY</span>
        </button>

        {/* Zone 2: Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-8">
          <button
            onClick={() => onSelectTab('home')}
            className={`text-sm font-semibold transition-colors pb-0.5 relative ${
              activeTab === 'home'
                ? 'text-[var(--accent-primary)] font-bold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Home
            {activeTab === 'home' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent-primary)] rounded-full" />
            )}
          </button>
          <button
            onClick={() => onSelectTab('watchlist')}
            className={`text-sm font-semibold transition-colors pb-0.5 relative ${
              activeTab === 'watchlist'
                ? 'text-[var(--accent-primary)] font-bold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Watchlist
            {activeTab === 'watchlist' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent-primary)] rounded-full" />
            )}
          </button>
          <button
            onClick={() => onSelectTab('lists')}
            className={`text-sm font-semibold transition-colors pb-0.5 relative ${
              activeTab === 'lists'
                ? 'text-[var(--accent-primary)] font-bold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Lists
            {activeTab === 'lists' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent-primary)] rounded-full" />
            )}
          </button>
          <button
            onClick={() => onSelectTab('settings')}
            className={`text-sm font-semibold transition-colors pb-0.5 relative ${
              activeTab === 'settings'
                ? 'text-[var(--accent-primary)] font-bold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Settings
            {activeTab === 'settings' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent-primary)] rounded-full" />
            )}
          </button>
        </nav>

        {/* Zone 3: Primary Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Force Fullscreen Toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className={`p-2 rounded-full text-xs font-bold transition border shadow-2xs active:scale-95 flex items-center justify-center ${
              isFullscreen
                ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] border-transparent'
                : 'bg-[var(--chip-bg)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)] border-[var(--border-subtle)]'
            }`}
            title={isFullscreen ? 'Exit Fullscreen Mode' : 'Enter Force OS Fullscreen Mode'}
            aria-label="Toggle Fullscreen Mode"
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4 stroke-[2.5]" />
            ) : (
              <Maximize2 className="w-4 h-4 stroke-[2.5]" />
            )}
          </button>

          {/* Quick Random Pick Button */}
          <button
            onClick={onRandomPick}
            className={`hidden sm:inline-flex ${!swapSearchAndLists ? 'md:hidden' : ''} items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-[var(--chip-bg)] text-[var(--text-primary)] hover:opacity-85 active:scale-95 transition border border-[var(--border-subtle)] shadow-xs`}
            title="Pick a random film from your library"
          >
            <Sparkles className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
            <span>Random Pick</span>
          </button>



          {/* PWA Install Button — Located directly LEFT to Search as requested */}
          {!isInstalled && (
            <button
              onClick={handleHeaderInstall}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black bg-[var(--accent-primary)] text-[var(--bg-primary)] hover:opacity-90 active:scale-95 transition shadow-xs border border-transparent select-none animate-pulse"
              title="Install EHSAAN PLAY as Standalone Web App (Left to Search)"
              aria-label="Install as Standalone Web App"
            >
              <Download className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden sm:inline">Install</span>
            </button>
          )}

          {/* Interactive Action Buttons: Search & IMDb — Minimal, Colourful & Small */}
          {swapSearchAndLists ? (
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Lists Button — Minimal, Theme-Colourful, Small (h-8) */}
              <button
                type="button"
                onClick={handleCornerButtonClick}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onContextMenu={handleContextMenu}
                className={`h-8 px-2.5 sm:px-3 rounded-full flex items-center justify-center gap-1.5 text-xs font-black shadow-2xs hover:shadow-xs active:scale-95 transition-all border border-[var(--border-subtle)] select-none focus:outline-none ${
                  activeTab === 'lists'
                    ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] shadow-xs'
                    : 'bg-[var(--bg-card-olive)] hover:opacity-90 text-[var(--text-card-olive)]'
                }`}
                aria-label="Custom lists (long press to exchange position)"
                title="Custom Lists — Long-press to swap with Search Bar"
              >
                <Layers className="w-3.5 h-3.5 stroke-[2.5]" />
                <span className="hidden sm:inline tracking-tight">Lists</span>
              </button>

              {/* IMDb Button — Minimal, Vibrant Golden Yellow, Small (h-8) */}
              <button
                type="button"
                onClick={() => onOpenImdbPreview?.()}
                className="h-8 px-2.5 sm:px-3 rounded-full bg-[#F5C518] hover:bg-[#E2B616] active:scale-95 text-[#121212] flex items-center justify-center gap-1 text-[11px] font-black tracking-tight shadow-xs hover:shadow-[0_2px_8px_rgba(245,197,24,0.4)] border border-[#DFB00F] transition-all select-none focus:outline-none"
                title="Open IMDb Link & ID Fetch Window"
                aria-label="Open IMDb Fetch Window"
              >
                <span className="leading-none">IMDb</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Search Button — Minimal, Colourful Theme Accent, Small (h-8) */}
              <button
                type="button"
                onClick={handleCornerButtonClick}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onContextMenu={handleContextMenu}
                className="h-8 px-2.5 sm:px-3 rounded-full bg-[var(--bg-card-olive)] hover:opacity-90 text-[var(--text-card-olive)] border border-[var(--border-subtle)] flex items-center justify-center gap-1.5 text-xs font-black shadow-2xs hover:shadow-xs active:scale-95 transition-all select-none focus:outline-none group/search"
                aria-label="Search movies and series (long press to exchange position)"
                title="Search movies and series (Long-press to swap with Custom Lists)"
              >
                <Search className="w-3.5 h-3.5 stroke-[2.5] text-[var(--text-card-olive)] group-hover/search:scale-110 transition-transform" />
                <span className="hidden sm:inline tracking-tight">Search</span>
              </button>

              {/* IMDb Button — Minimal, Vibrant Golden Yellow, Small (h-8) */}
              <button
                type="button"
                onClick={() => onOpenImdbPreview?.()}
                className="h-8 px-2.5 sm:px-3 rounded-full bg-[#F5C518] hover:bg-[#E2B616] active:scale-95 text-[#121212] flex items-center justify-center gap-1 text-[11px] font-black tracking-tight shadow-xs hover:shadow-[0_2px_8px_rgba(245,197,24,0.4)] border border-[#DFB00F] transition-all select-none focus:outline-none"
                title="Open IMDb Link & ID Fetch Window"
                aria-label="Open IMDb Fetch Window"
              >
                <span className="leading-none">IMDb</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
