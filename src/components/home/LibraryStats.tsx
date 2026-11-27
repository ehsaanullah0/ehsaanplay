import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  ActiveTab,
  HomeSectionId,
  HomeSectionsConfig,
  DEFAULT_HOME_SECTION_ORDER,
} from '../../types/movie';
import { Pencil, X, ArrowUp, ArrowDown, Eye, EyeOff, RotateCcw } from 'lucide-react';
import { useRegisterBackAction } from '../../contexts/BackNavigationContext';

interface HomeSectionMeta {
  id: HomeSectionId;
  label: string;
  description: string;
  visibilityKey: keyof HomeSectionsConfig;
}

export const HOME_SECTIONS_META: Record<HomeSectionId, HomeSectionMeta> = {
  daily_mix: {
    id: 'daily_mix',
    label: 'Daily Mix',
    description: 'Animated random watchlist picks in Material shapes',
    visibilityKey: 'showDailyMix',
  },
  dashboard: {
    id: 'dashboard',
    label: 'Dashboard',
    description: 'Your Cinema Shelf library stats & watch time',
    visibilityKey: 'showDashboard',
  },
  continue_watching: {
    id: 'continue_watching',
    label: 'Continue Watching',
    description: 'Movies and series currently in progress',
    visibilityKey: 'showContinueWatching',
  },
  top_movies: {
    id: 'top_movies',
    label: 'Top 10 Movies',
    description: 'Trending movies worldwide',
    visibilityKey: 'showTopMovies',
  },
  top_series: {
    id: 'top_series',
    label: 'Top 10 Series',
    description: 'Trending television series worldwide',
    visibilityKey: 'showTopSeries',
  },
  favorites: {
    id: 'favorites',
    label: 'Personal Favorites',
    description: 'Your favorited movies and series',
    visibilityKey: 'showFavorites',
  },
  recently_watched: {
    id: 'recently_watched',
    label: 'Recently Watched',
    description: 'Your most recently completed titles',
    visibilityKey: 'showRecentlyWatched',
  },
  recommendations: {
    id: 'recommendations',
    label: 'Recommendations',
    description: 'Explore curated picks tailored to your shelf',
    visibilityKey: 'showExplore',
  },
};

export function normalizeHomeSectionOrder(order?: HomeSectionId[]): HomeSectionId[] {
  const validSet = new Set<HomeSectionId>(DEFAULT_HOME_SECTION_ORDER);
  const result: HomeSectionId[] = [];
  const seen = new Set<HomeSectionId>();

  if (Array.isArray(order)) {
    for (const id of order) {
      if (validSet.has(id) && !seen.has(id)) {
        result.push(id);
        seen.add(id);
      }
    }
  }

  for (const id of DEFAULT_HOME_SECTION_ORDER) {
    if (!seen.has(id)) {
      result.push(id);
      seen.add(id);
    }
  }

  return result;
}

export function isHomeSectionVisible(
  sections: HomeSectionsConfig,
  id: HomeSectionId
): boolean {
  if (id === 'daily_mix') {
    return sections.showDailyMix === true;
  }
  const meta = HOME_SECTIONS_META[id];
  const val = sections[meta.visibilityKey];
  return val !== false;
}

interface HomeCustomizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  homeSections: HomeSectionsConfig;
  onUpdateHomeSections: (sections: HomeSectionsConfig) => void;
}

export const HomeCustomizeModal: React.FC<HomeCustomizeModalProps> = ({
  isOpen,
  onClose,
  homeSections,
  onUpdateHomeSections,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  useRegisterBackAction(isOpen, onClose, 25);

  if (!isOpen) return null;

  const order = normalizeHomeSectionOrder(homeSections.sectionOrder);
  const visibleCount = order.filter((id) => isHomeSectionVisible(homeSections, id)).length;

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= order.length) return;
    const nextOrder = [...order];
    const [moved] = nextOrder.splice(index, 1);
    nextOrder.splice(targetIndex, 0, moved);
    onUpdateHomeSections({
      ...homeSections,
      sectionOrder: nextOrder,
    });
  };

  const toggleVisibility = (id: HomeSectionId) => {
    const meta = HOME_SECTIONS_META[id];
    const currentlyVisible = isHomeSectionVisible(homeSections, id);
    onUpdateHomeSections({
      ...homeSections,
      [meta.visibilityKey]: !currentlyVisible,
      sectionOrder: order,
    });
  };

  const handleResetDefault = () => {
    onUpdateHomeSections({
      ...homeSections,
      showHeroSlideshow: false,
      showDailyMix: false,
      showDashboard: true,
      showContinueWatching: true,
      showTopMovies: true,
      showTopSeries: true,
      showFavorites: true,
      showRecentlyWatched: true,
      showExplore: true,
      sectionOrder: DEFAULT_HOME_SECTION_ORDER,
    });
  };

  const handleShowAll = () => {
    onUpdateHomeSections({
      ...homeSections,
      showDailyMix: true,
      showDashboard: true,
      showContinueWatching: true,
      showTopMovies: true,
      showTopSeries: true,
      showFavorites: true,
      showRecentlyWatched: true,
      showExplore: true,
      sectionOrder: order,
    });
  };

  const modalNode = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Rearrange Home Page"
      onClick={onClose}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-[var(--modal-bg)] rounded-3xl shadow-2xl border border-[var(--border-subtle)] p-6 text-[var(--text-primary)] animate-scale-up"
      >
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <Pencil className="w-4 h-4 text-[var(--accent-primary)]" />
            <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
              Rearrange Home Page
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close home layout customizer"
            className="p-1.5 rounded-full hover:bg-[var(--chip-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-between gap-2 mt-3 mb-4">
          <p className="text-xs text-[var(--text-secondary)]">
            Reorder or hide sections on your Home page.
          </p>
          <span className="text-[11px] font-bold text-[var(--text-secondary)] tabular-nums shrink-0">
            {visibleCount}/{order.length} visible
          </span>
        </div>

        <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
          {order.map((id, idx) => {
            const meta = HOME_SECTIONS_META[id];
            const visible = isHomeSectionVisible(homeSections, id);

            return (
              <div
                key={id}
                className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition ${
                  visible
                    ? 'bg-[var(--chip-bg)] border-[var(--border-subtle)] text-[var(--text-primary)]'
                    : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-muted)] opacity-60'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-[var(--text-primary)] truncate">
                    {meta.label}
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)] truncate mt-0.5">
                    {meta.description}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => moveSection(idx, 'up')}
                    className="w-9 h-9 rounded-xl flex items-center justify-center bg-[var(--modal-bg)] text-[var(--text-primary)] hover:bg-[var(--chip-bg)] disabled:opacity-30 disabled:pointer-events-none transition shadow-2xs border border-[var(--border-subtle)] cursor-pointer"
                    title="Move Up"
                    aria-label={`Move ${meta.label} up`}
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    disabled={idx === order.length - 1}
                    onClick={() => moveSection(idx, 'down')}
                    className="w-9 h-9 rounded-xl flex items-center justify-center bg-[var(--modal-bg)] text-[var(--text-primary)] hover:bg-[var(--chip-bg)] disabled:opacity-30 disabled:pointer-events-none transition shadow-2xs border border-[var(--border-subtle)] cursor-pointer"
                    title="Move Down"
                    aria-label={`Move ${meta.label} down`}
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleVisibility(id)}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition shadow-2xs cursor-pointer ${
                      visible
                        ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)]'
                        : 'bg-[var(--chip-bg)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                    title={visible ? `Hide ${meta.label}` : `Show ${meta.label}`}
                    aria-label={visible ? `Hide ${meta.label}` : `Show ${meta.label}`}
                  >
                    {visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetDefault}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--chip-bg)] transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Default</span>
            </button>
            {visibleCount < order.length && (
              <button
                type="button"
                onClick={handleShowAll}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold text-[var(--accent-primary)] hover:bg-[var(--chip-bg)] transition cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Show All</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-[var(--accent-primary)] text-[var(--bg-primary)] text-xs font-bold hover:opacity-90 transition active:scale-95 shadow-xs cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalNode, document.body) : modalNode;
};

interface LibraryStatsProps {
  stats: {
    moviesCount: number;
    seriesCount: number;
    watchedCount: number;
    watchlistCount: number;
    favoritesCount: number;
    inProgressCount: number;
    totalHours: number;
    totalMinutes?: number;
    remainingMinutes?: number;
    formattedWatchTime?: string;
  };
  onNavigateToWatchlist: (statusFilter?: string) => void;
  onNavigateTab: (tab: ActiveTab) => void;
  homeSections?: HomeSectionsConfig;
  onUpdateHomeSections?: (sections: HomeSectionsConfig) => void;
  onOpenCustomize?: () => void;
}

export const LibraryStats: React.FC<LibraryStatsProps> = React.memo(({
  stats,
  onNavigateToWatchlist,
  onNavigateTab: _onNavigateTab,
  onUpdateHomeSections,
  onOpenCustomize,
}) => {
  const safeStats = stats || {
    moviesCount: 0,
    seriesCount: 0,
    watchedCount: 0,
    watchlistCount: 0,
    favoritesCount: 0,
    inProgressCount: 0,
    totalHours: 0,
    totalMinutes: 0,
    remainingMinutes: 0,
    formattedWatchTime: '',
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
            {onUpdateHomeSections && onOpenCustomize && (
              <button
                type="button"
                onClick={onOpenCustomize}
                aria-label="Customize & Rearrange Home Page"
                title="Customize & Rearrange Home Page"
                className="p-2 rounded-full bg-[var(--chip-bg)] hover:opacity-85 text-[var(--text-primary)] transition active:scale-95 cursor-pointer"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
          {safeStats.formattedWatchTime || safeStats.totalHours > 0 || (safeStats.totalMinutes !== undefined && safeStats.totalMinutes > 0) ? (
            <span>
              <strong className="text-[var(--text-primary)] tabular-nums font-semibold">
                {safeStats.formattedWatchTime || (safeStats.totalHours > 0 ? `${safeStats.totalHours} ${safeStats.totalHours === 1 ? 'hr' : 'hrs'}` : `${safeStats.totalMinutes} min`)}
              </strong>{' '}
              total watch time
            </span>
          ) : (
            'Track your collection and watch history.'
          )}
        </p>
      </div>

      {/* Integrated Typographic Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 bg-[var(--bg-card-olive)] text-[var(--text-card-olive)] p-5 sm:p-7 rounded-3xl shadow-2xs border border-[var(--border-subtle)]">
        <button
          onClick={() => onNavigateToWatchlist('all')}
          className="text-left group focus:outline-none rounded-xl p-1 -m-1 cursor-pointer"
        >
          <div className="text-xs font-bold text-[var(--text-card-olive)] opacity-80 group-hover:opacity-100 transition-opacity uppercase tracking-wider">
            Movies
          </div>
          <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-[var(--text-card-olive)] tabular-nums tracking-tight mt-1 transition-colors">
            {safeStats.moviesCount}
          </div>
        </button>

        <button
          onClick={() => onNavigateToWatchlist('all')}
          className="text-left group focus:outline-none rounded-xl p-1 -m-1 cursor-pointer"
        >
          <div className="text-xs font-bold text-[var(--text-card-olive)] opacity-80 group-hover:opacity-100 transition-opacity uppercase tracking-wider">
            TV Series
          </div>
          <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-[var(--text-card-olive)] tabular-nums tracking-tight mt-1 transition-colors">
            {safeStats.seriesCount}
          </div>
        </button>

        <button
          onClick={() => onNavigateToWatchlist('watched')}
          className="text-left group focus:outline-none rounded-xl p-1 -m-1 cursor-pointer"
        >
          <div className="text-xs font-bold text-[var(--text-card-olive)] opacity-80 group-hover:opacity-100 transition-opacity uppercase tracking-wider">
            Watched
          </div>
          <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-[var(--text-card-olive)] tabular-nums tracking-tight mt-1 transition-colors">
            {safeStats.watchedCount}
          </div>
        </button>

        <button
          onClick={() => onNavigateToWatchlist('watchlist')}
          className="text-left group focus:outline-none rounded-xl p-1 -m-1 cursor-pointer"
        >
          <div className="text-xs font-bold text-[var(--text-card-olive)] opacity-80 group-hover:opacity-100 transition-opacity uppercase tracking-wider">
            Watchlist
          </div>
          <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-[var(--text-card-olive)] tabular-nums tracking-tight mt-1">
            {safeStats.watchlistCount}
          </div>
        </button>
      </div>
    </section>
  );
});
