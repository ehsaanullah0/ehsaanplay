import React, { useState } from 'react';
import { ActiveTab, HomeSectionsConfig } from '../../types/movie';
import { Pencil, Check, X } from 'lucide-react';

interface LibraryStatsProps {
  stats: {
    moviesCount: number;
    seriesCount: number;
    watchedCount: number;
    watchlistCount: number;
    favoritesCount: number;
    inProgressCount: number;
    totalHours: number;
  };
  onNavigateToWatchlist: (statusFilter?: string) => void;
  onNavigateTab: (tab: ActiveTab) => void;
  homeSections?: HomeSectionsConfig;
  onUpdateHomeSections?: (sections: HomeSectionsConfig) => void;
}

export const LibraryStats: React.FC<LibraryStatsProps> = ({
  stats,
  onNavigateToWatchlist,
  homeSections,
  onUpdateHomeSections,
}) => {
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);

  const sections = homeSections || {
    showHeroSlideshow: true,
    showTopMovies: true,
    showTopSeries: true,
    showContinueWatching: true,
    showFavorites: true,
    showRecentlyWatched: true,
    showExplore: true,
  };

  const handleToggle = (key: keyof HomeSectionsConfig) => {
    if (onUpdateHomeSections) {
      const currentVal = sections[key] !== false;
      onUpdateHomeSections({
        ...sections,
        [key]: !currentVal,
      });
    }
  };

  return (
    <section className="mb-10 sm:mb-14 relative">
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mb-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]">
            Personal Library
          </span>
          <div className="flex items-center gap-2.5 mt-0.5">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight">
              Your Cinema Shelf
            </h2>
            {onUpdateHomeSections && (
              <button
                onClick={() => setIsCustomizeOpen(!isCustomizeOpen)}
                aria-label="Customize Home Shelves"
                title="Customize Home Shelves"
                className="p-2 rounded-full bg-[var(--chip-bg)] hover:opacity-85 text-[var(--text-primary)] transition active:scale-95"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
          {stats.totalHours > 0 ? (
            <span>
              <strong className="text-[var(--text-primary)] tabular-nums font-semibold">{stats.totalHours} hrs</strong> logged in your journal
            </span>
          ) : (
            'Track what you love, at your own pace.'
          )}
        </p>
      </div>

      {/* Integrated Typographic Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 bg-[var(--bg-card-olive)] text-[var(--text-card-olive)] p-5 sm:p-7 rounded-3xl shadow-2xs border border-[var(--border-subtle)]">
        <button
          onClick={() => onNavigateToWatchlist('all')}
          className="text-left group focus:outline-none rounded-xl p-1 -m-1"
        >
          <div className="text-xs font-bold text-[var(--text-card-olive)] opacity-80 group-hover:opacity-100 transition-opacity uppercase tracking-wider">
            Movies
          </div>
          <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-[var(--text-card-olive)] tabular-nums tracking-tight mt-1 transition-colors">
            {stats.moviesCount}
          </div>
        </button>

        <button
          onClick={() => onNavigateToWatchlist('all')}
          className="text-left group focus:outline-none rounded-xl p-1 -m-1"
        >
          <div className="text-xs font-bold text-[var(--text-card-olive)] opacity-80 group-hover:opacity-100 transition-opacity uppercase tracking-wider">
            TV Series
          </div>
          <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-[var(--text-card-olive)] tabular-nums tracking-tight mt-1 transition-colors">
            {stats.seriesCount}
          </div>
        </button>

        <button
          onClick={() => onNavigateToWatchlist('watched')}
          className="text-left group focus:outline-none rounded-xl p-1 -m-1"
        >
          <div className="text-xs font-bold text-[var(--text-card-olive)] opacity-80 group-hover:opacity-100 transition-opacity uppercase tracking-wider">
            Watched
          </div>
          <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-[var(--text-card-olive)] tabular-nums tracking-tight mt-1 transition-colors">
            {stats.watchedCount}
          </div>
        </button>

        <button
          onClick={() => onNavigateToWatchlist('watchlist')}
          className="text-left group focus:outline-none rounded-xl p-1 -m-1"
        >
          <div className="text-xs font-bold text-[var(--text-card-olive)] opacity-80 group-hover:opacity-100 transition-opacity uppercase tracking-wider">
            Watchlist
          </div>
          <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-[var(--text-card-olive)] tabular-nums tracking-tight mt-1">
            {stats.watchlistCount}
          </div>
        </button>
      </div>

      {/* Customize Home Shelves Popover / Modal */}
      {isCustomizeOpen && (
        <div className="absolute top-16 left-0 sm:left-auto right-0 z-30 w-full sm:w-80 p-5 rounded-3xl bg-[var(--modal-bg)] shadow-2xl border border-[var(--border-subtle)] text-[var(--text-primary)] animate-slide-up">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
            <h4 className="text-sm font-bold text-[var(--text-primary)]">Shelf Sections</h4>
            <button
              onClick={() => setIsCustomizeOpen(false)}
              className="p-1 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-3 space-y-2">
            {[
              { key: 'showHeroSlideshow', label: 'Featured Hero Slideshow' },
              { key: 'showContinueWatching', label: 'Continue Watching' },
              { key: 'showTopMovies', label: 'Top 10 Movies' },
              { key: 'showTopSeries', label: 'Top 10 Series' },
              { key: 'showFavorites', label: 'Personal Favorites' },
              { key: 'showRecentlyWatched', label: 'Recently Watched' },
              { key: 'showExplore', label: 'Explore Recommendations' },
            ].map(({ key, label }) => {
              const active = key === 'showHeroSlideshow'
                ? sections.showHeroSlideshow === true
                : sections[key as keyof HomeSectionsConfig] !== false;
              return (
                <button
                  key={key}
                  onClick={() => handleToggle(key as keyof HomeSectionsConfig)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition ${
                    active
                      ? 'bg-[var(--accent-secondary)] text-[var(--accent-secondary-text)]'
                      : 'bg-[var(--modal-subtle)] text-[var(--text-secondary)] hover:bg-[var(--chip-bg)]'
                  }`}
                >
                  <span>{label}</span>
                  {active ? (
                    <Check className="w-4 h-4 stroke-[2.5]" />
                  ) : (
                    <span className="text-[10px] uppercase font-bold opacity-60">Hidden</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};
