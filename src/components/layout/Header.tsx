import React from 'react';
import { ActiveTab } from '../../types/movie';
import { Search, Download, Sparkles } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface HeaderProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onOpenSearch: () => void;
  onRandomPick: () => void;
  autoHideHeader?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  onOpenSearch,
  onRandomPick,
  autoHideHeader = true,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = React.useState(false);
  const [isVisible, setIsVisible] = React.useState(true);
  const lastScrollYRef = React.useRef(0);

  React.useEffect(() => {
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
          {/* Quick Random Pick Button */}
          <button
            onClick={onRandomPick}
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#E4EAB8] text-[#3B421E] hover:bg-[#D8E0A3] active:scale-95 transition border border-[#4E562F]/20 shadow-xs"
            title="Pick a random film from your library"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#3B421E]" />
            <span>Random Pick</span>
          </button>

          {/* Search Trigger */}
          <button
            onClick={onOpenSearch}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--bg-card-yellow)] hover:opacity-90 text-[var(--text-card-yellow)] text-xs sm:text-sm font-bold transition focus:outline-none shadow-3xs"
            aria-label="Search movies and series"
          >
            <Search className="w-4 h-4 stroke-[2.5]" />
            <span className="hidden sm:inline font-black">Search...</span>
          </button>

          {/* PWA Install Button (if available) */}
          {!isInstalled && isInstallable && (
            <button
              onClick={install}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[var(--accent-primary)] text-[var(--bg-primary)] hover:opacity-90 transition shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Install App</span>
            </button>
          )}

          {!isInstalled && isIOS && (
            <button
              onClick={() => setShowIOSModal(true)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-[var(--chip-bg)] text-[var(--chip-text)] hover:opacity-90 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install</span>
            </button>
          )}
        </div>
      </div>

      {/* iOS Safari Installation Guide Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-3xl bg-[var(--modal-bg)] p-6 shadow-xl border border-[var(--border-subtle)] text-[var(--text-primary)]">
            <h3 className="text-lg font-bold">Install on iPhone / iPad</h3>
            <p className="mt-3 text-sm text-[var(--text-secondary)] leading-relaxed">
              1. Tap the <strong className="text-[var(--text-primary)]">Share</strong> icon in Safari toolbar.<br />
              2. Scroll down and choose <strong className="text-[var(--text-primary)]">Add to Home Screen</strong>.
            </p>
            <button
              onClick={() => setShowIOSModal(false)}
              className="mt-5 w-full rounded-2xl bg-[var(--accent-primary)] py-2.5 text-sm font-semibold text-[var(--bg-primary)] hover:opacity-90 transition"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
