import React, { useState, useEffect, useMemo } from 'react';
import {
  MediaItem,
  PersonalMediaState,
  ActiveTab,
  HomeSectionsConfig,
  AppTweaksConfig,
  UserSettings,
  DEFAULT_APP_TWEAKS,
  DEFAULT_HOME_SECTION_ORDER,
  CustomList,
} from '../../types/movie';
import { fetchNetflixTop10Movies, fetchNetflixTop10Series } from '../../data/curatedCatalog';
import { DailyMixShowcase } from './DailyMixShowcase';
import {
  LibraryStats,
  HomeCustomizeModal,
  normalizeHomeSectionOrder,
  isHomeSectionVisible,
} from './LibraryStats';
import { RankingRail } from './RankingRail';
import { ContinueWatchingRail } from './ContinueWatchingRail';
import { ExploreSection } from './ExploreSection';
import { Footer } from '../layout/Footer';
import { StickerHomeAllHidden } from '../common/ExpressiveStickers';
import { resolveStateForMediaItem, normalizeMediaTitle } from '../../utils/mediaDedup';
import { Pencil } from 'lucide-react';

interface HomeViewProps {
  mediaItems: MediaItem[];
  userStates: Record<string, PersonalMediaState>;
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
  onSelectMedia: (item: MediaItem) => void;
  onNavigateTab: (tab: ActiveTab) => void;
  onNavigateToWatchlistWithFilter: (status?: string) => void;
  homeSections?: HomeSectionsConfig;
  onUpdateHomeSections?: (sections: HomeSectionsConfig) => void;
  onRemoveFromWatchlist?: (id: string) => void;
  onDismissFromWatching?: (id: string) => void;
  onMarkWatching?: (id: string, item?: MediaItem) => void;
  onMarkWatched?: (id: string, item?: MediaItem) => void;
  onToggleWatchlist?: (id: string, item?: MediaItem) => void;
  onToggleFavorite?: (id: string, item?: MediaItem) => void;
  onAddMediaToLibrary?: (item: MediaItem) => void;
  customLists?: CustomList[];
  onAddItemToList?: (listId: string, mediaId: string, item?: MediaItem) => void;
  onRemoveItemFromList?: (listId: string, mediaId: string) => void;
  onOpenChangelog?: () => void;
  onOpenLicense?: () => void;
  onRandomPick?: (items: MediaItem[]) => void;
  tweaks?: AppTweaksConfig;
  settings?: UserSettings;
  onUpdateSettings?: (partial: Partial<UserSettings>) => void;
  onOpenSearch?: () => void;
}

export const HomeView: React.FC<HomeViewProps> = React.memo(({
  mediaItems,
  userStates,
  stats,
  onSelectMedia,
  onNavigateTab,
  onNavigateToWatchlistWithFilter,
  homeSections,
  onUpdateHomeSections,
  onRemoveFromWatchlist,
  onDismissFromWatching,
  onMarkWatching,
  onMarkWatched,
  onToggleWatchlist,
  onToggleFavorite,
  onAddMediaToLibrary,
  customLists,
  onAddItemToList,
  onRemoveItemFromList,
  onOpenChangelog,
  onOpenLicense,
  onRandomPick,
  tweaks,
  settings,
  onUpdateSettings,
  onOpenSearch,
}) => {
  const [isHomeCustomizeOpen, setIsHomeCustomizeOpen] = useState(false);

  const sections: HomeSectionsConfig = useMemo(
    () => ({
      showHeroSlideshow: false,
      showDailyMix: false,
      showDashboard: true,
      showTopMovies: true,
      showTopSeries: true,
      showContinueWatching: true,
      showFavorites: true,
      showRecentlyWatched: true,
      showExplore: true,
      sectionOrder: DEFAULT_HOME_SECTION_ORDER,
      ...homeSections,
    }),
    [homeSections]
  );

  const sectionOrder = useMemo(
    () => normalizeHomeSectionOrder(sections.sectionOrder),
    [sections.sectionOrder]
  );

  const isDashboardVisible = isHomeSectionVisible(sections, 'dashboard');
  const visibleSectionCount = useMemo(
    () => sectionOrder.filter((id) => isHomeSectionVisible(sections, id)).length,
    [sectionOrder, sections]
  );

  // State for Industry Trending Top 10 Movies & Series (Fetched live from TMDB / Industry trends)
  const [trendingMovies, setTrendingMovies] = useState<MediaItem[]>([]);
  const [trendingSeries, setTrendingSeries] = useState<MediaItem[]>([]);

  useEffect(() => {
    let isMounted = true;

    fetchNetflixTop10Movies(settings?.tmdbApiKey)
      .then(movies => {
        if (isMounted && movies && movies.length > 0) {
          setTrendingMovies(movies);
        }
      })
      .catch(err => {
        console.warn('Failed to load industry trending movies:', err);
      });

    fetchNetflixTop10Series(settings?.tmdbApiKey)
      .then(series => {
        if (isMounted && series && series.length > 0) {
          setTrendingSeries(series);
        }
      })
      .catch(err => {
        console.warn('Failed to load industry trending series:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [settings?.tmdbApiKey]);

  // In-Progress / Continue Watching items (O(N), zero duplicates)
  const continueWatchingItems = useMemo(() => {
    const list: { item: MediaItem; state: PersonalMediaState }[] = [];
    const seenIndexByKey = new Map<string, number>();

    const getMatchKeys = (item: MediaItem) => {
      const keys: string[] = [`id:${item.id}`];
      if (item.imdbId) keys.push(`imdb:${item.imdbId}`);
      if (item.tmdbId) keys.push(`tmdb:${item.type || 'movie'}:${item.tmdbId}`);
      const normTitle = normalizeMediaTitle(item.title || '');
      if (normTitle) keys.push(`title:${item.type || 'movie'}:${normTitle}`);
      return keys;
    };

    for (const item of mediaItems) {
      const state = resolveStateForMediaItem(item, userStates);
      if (
        state &&
        !state.isWatched &&
        state.progressPercent !== undefined &&
        state.progressPercent > 0 &&
        state.progressPercent < 100
      ) {
        const keys = getMatchKeys(item);
        let existingIdx = -1;
        for (const k of keys) {
          const found = seenIndexByKey.get(k);
          if (found !== undefined) {
            existingIdx = found;
            break;
          }
        }

        if (existingIdx !== -1) {
          const prev = list[existingIdx];
          const prevScore = (prev.state.tvProgress?.currentSeason || 1) * 1000 + (prev.state.tvProgress?.currentEpisode || 1);
          const currScore = (state.tvProgress?.currentSeason || 1) * 1000 + (state.tvProgress?.currentEpisode || 1);
          const prevTime = prev.state.lastWatchedAt || '';
          const currTime = state.lastWatchedAt || '';
          if (currScore > prevScore || (currScore === prevScore && currTime > prevTime)) {
            list[existingIdx] = { item, state };
          }
          for (const k of keys) seenIndexByKey.set(k, existingIdx);
          continue;
        }

        const nextIndex = list.length;
        list.push({ item, state });
        for (const k of keys) seenIndexByKey.set(k, nextIndex);
      }
    }

    return list.sort((a, b) => {
      const timeA = a.state.lastWatchedAt || '';
      const timeB = b.state.lastWatchedAt || '';
      return timeB.localeCompare(timeA);
    });
  }, [mediaItems, userStates]);

  // Recently Watched (O(N), zero duplicates)
  const recentlyWatchedItems = useMemo(() => {
    const withState: { item: MediaItem; state: PersonalMediaState }[] = [];
    for (const m of mediaItems) {
      const st = resolveStateForMediaItem(m, userStates);
      if (st?.isWatched) {
        withState.push({ item: m, state: st });
      }
    }
    withState.sort((a, b) => {
      const timeA = a.state.lastWatchedAt || a.state.addedAt || '';
      const timeB = b.state.lastWatchedAt || b.state.addedAt || '';
      return timeB.localeCompare(timeA);
    });

    const list: MediaItem[] = [];
    const seenKeys = new Set<string>();
    for (const { item: m } of withState) {
      const normTitle = normalizeMediaTitle(m.title || '');
      const keys = [`id:${m.id}`];
      if (m.imdbId) keys.push(`imdb:${m.imdbId}`);
      if (m.tmdbId) keys.push(`tmdb:${m.type || 'movie'}:${m.tmdbId}`);
      if (normTitle) keys.push(`title:${m.type || 'movie'}:${normTitle}`);

      if (keys.some(k => seenKeys.has(k))) continue;
      for (const k of keys) seenKeys.add(k);
      list.push(m);
      if (list.length >= 10) break;
    }
    return list;
  }, [mediaItems, userStates]);

  // Favorites / Personal Picks (O(N), zero duplicates)
  const favoriteItems = useMemo(() => {
    const withState: { item: MediaItem; state: PersonalMediaState }[] = [];
    for (const m of mediaItems) {
      const st = resolveStateForMediaItem(m, userStates);
      if (st?.isFavorite) {
        withState.push({ item: m, state: st });
      }
    }
    withState.sort((a, b) => {
      const timeA = a.state.favoritedAt || a.state.addedAt || '';
      const timeB = b.state.favoritedAt || b.state.addedAt || '';
      return timeB.localeCompare(timeA);
    });

    const list: MediaItem[] = [];
    const seenKeys = new Set<string>();
    for (const { item: m } of withState) {
      const normTitle = normalizeMediaTitle(m.title || '');
      const keys = [`id:${m.id}`];
      if (m.imdbId) keys.push(`imdb:${m.imdbId}`);
      if (m.tmdbId) keys.push(`tmdb:${m.type || 'movie'}:${m.tmdbId}`);
      if (normTitle) keys.push(`title:${m.type || 'movie'}:${normTitle}`);

      if (keys.some(k => seenKeys.has(k))) continue;
      for (const k of keys) seenKeys.add(k);
      list.push(m);
    }
    return list;
  }, [mediaItems, userStates]);

  return (
    <div className="w-full pb-28 md:pb-16 animate-fade-in">
      <div id="your-cinema-shelf" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10 scroll-mt-16">
        {/* Fallback Edit Pencil trigger if Dashboard is hidden so user can always customize Home */}
        {!isDashboardVisible && onUpdateHomeSections && (
          <div className="flex justify-end mb-4">
            <button
              type="button"
              onClick={() => setIsHomeCustomizeOpen(true)}
              aria-label="Customize & Rearrange Home Page"
              title="Customize & Rearrange Home Page"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[var(--chip-bg)] hover:bg-[var(--bg-surface-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)] text-xs font-bold transition active:scale-95 cursor-pointer shadow-2xs"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Edit Home</span>
            </button>
          </div>
        )}

        {/* Empty Home Fallback if user hid every Home section */}
        {visibleSectionCount === 0 && onUpdateHomeSections && (
          <div className="mb-10 py-10 px-6 rounded-3xl bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] text-center flex flex-col items-center gap-3 select-none">
            <StickerHomeAllHidden className="w-40 h-32 sm:w-44 sm:h-36" />
            <h2 className="text-lg font-extrabold text-[var(--text-primary)]">
              All Home sections are hidden
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] max-w-md">
              Open the Home page customizer to turn sections back on or restore the default layout.
            </p>
            <button
              type="button"
              onClick={() => setIsHomeCustomizeOpen(true)}
              className="mt-1 inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-full bg-[var(--accent-primary)] text-[var(--bg-primary)] text-xs font-bold hover:opacity-90 active:scale-95 transition cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Customize Home Page</span>
            </button>
          </div>
        )}

        {/* Dynamic Ordered Home Sections */}
        {sectionOrder.map((sectionId) => {
          if (!isHomeSectionVisible(sections, sectionId)) return null;

          if (sectionId === 'daily_mix') {
            return (
              <DailyMixShowcase
                key="daily_mix"
                mediaItems={mediaItems}
                userStates={userStates}
                onSelectMedia={onSelectMedia}
                onNavigateToWatchlist={() => onNavigateToWatchlistWithFilter('watchlist')}
                onOpenSearch={onOpenSearch}
              />
            );
          }

          if (sectionId === 'dashboard') {
            return (
              <LibraryStats
                key="dashboard"
                stats={stats}
                onNavigateToWatchlist={onNavigateToWatchlistWithFilter}
                onNavigateTab={onNavigateTab}
                homeSections={sections}
                onUpdateHomeSections={onUpdateHomeSections}
                onOpenCustomize={() => setIsHomeCustomizeOpen(true)}
              />
            );
          }

          if (sectionId === 'continue_watching') {
            if (continueWatchingItems.length === 0) return null;
            return (
              <ContinueWatchingRail
                key="continue_watching"
                items={continueWatchingItems}
                onSelectMedia={onSelectMedia}
                onDismissFromWatching={onDismissFromWatching}
              />
            );
          }

          if (sectionId === 'top_movies') {
            return (
              <RankingRail
                key="top_movies"
                title="Top 10 Movies"
                subtitle="Trending movies in the industry worldwide"
                items={trendingMovies}
                userStates={userStates}
                onSelectMedia={onSelectMedia}
                showRankingNumbers={true}
                onRemoveFromWatchlist={onRemoveFromWatchlist}
                onMarkWatching={onMarkWatching}
                onMarkWatched={onMarkWatched}
                onDismissFromWatching={onDismissFromWatching}
                onToggleWatchlist={onToggleWatchlist}
                onToggleFavorite={onToggleFavorite}
                onAddMediaToLibrary={onAddMediaToLibrary}
                customLists={customLists}
                onAddItemToList={onAddItemToList}
                onRemoveItemFromList={onRemoveItemFromList}
              />
            );
          }

          if (sectionId === 'top_series') {
            return (
              <RankingRail
                key="top_series"
                title="Top 10 Series"
                subtitle="Trending television series in the industry worldwide"
                items={trendingSeries}
                userStates={userStates}
                onSelectMedia={onSelectMedia}
                showRankingNumbers={true}
                onRemoveFromWatchlist={onRemoveFromWatchlist}
                onMarkWatching={onMarkWatching}
                onMarkWatched={onMarkWatched}
                onDismissFromWatching={onDismissFromWatching}
                onToggleWatchlist={onToggleWatchlist}
                onToggleFavorite={onToggleFavorite}
                onAddMediaToLibrary={onAddMediaToLibrary}
                customLists={customLists}
                onAddItemToList={onAddItemToList}
                onRemoveItemFromList={onRemoveItemFromList}
              />
            );
          }

          if (sectionId === 'favorites') {
            if (favoriteItems.length === 0) return null;
            return (
              <RankingRail
                key="favorites"
                title="Personal Favorites"
                subtitle="Your top favorited movies and series"
                items={favoriteItems}
                userStates={userStates}
                onSelectMedia={onSelectMedia}
                showRankingNumbers={false}
                onRemoveFromWatchlist={onRemoveFromWatchlist}
                onMarkWatching={onMarkWatching}
                onMarkWatched={onMarkWatched}
                onDismissFromWatching={onDismissFromWatching}
                onToggleWatchlist={onToggleWatchlist}
                onToggleFavorite={onToggleFavorite}
                onAddMediaToLibrary={onAddMediaToLibrary}
                customLists={customLists}
                onAddItemToList={onAddItemToList}
                onRemoveItemFromList={onRemoveItemFromList}
                onExpand={() => onNavigateToWatchlistWithFilter('favorites')}
                expandTooltip="View All in Favorites Watchlist"
                onRandomPick={onRandomPick}
                layout={tweaks?.favoritesLayout || 'horizontal'}
              />
            );
          }

          if (sectionId === 'recently_watched') {
            if (recentlyWatchedItems.length === 0) return null;
            return (
              <RankingRail
                key="recently_watched"
                title="Recently Watched"
                subtitle="Your most recently completed movies and series"
                items={recentlyWatchedItems}
                userStates={userStates}
                onSelectMedia={onSelectMedia}
                showRankingNumbers={false}
                onRemoveFromWatchlist={onRemoveFromWatchlist}
                onMarkWatching={onMarkWatching}
                onMarkWatched={onMarkWatched}
                onDismissFromWatching={onDismissFromWatching}
                onToggleWatchlist={onToggleWatchlist}
                onToggleFavorite={onToggleFavorite}
                onAddMediaToLibrary={onAddMediaToLibrary}
                customLists={customLists}
                onAddItemToList={onAddItemToList}
                onRemoveItemFromList={onRemoveItemFromList}
              />
            );
          }

          if (sectionId === 'recommendations') {
            return (
              <ExploreSection
                key="recommendations"
                mediaItems={mediaItems}
                userStates={userStates}
                onSelectMedia={onSelectMedia}
                onRemoveFromWatchlist={onRemoveFromWatchlist}
                onMarkWatching={onMarkWatching}
                onMarkWatched={onMarkWatched}
                onDismissFromWatching={onDismissFromWatching}
                onToggleWatchlist={onToggleWatchlist}
                onToggleFavorite={onToggleFavorite}
                onAddMediaToLibrary={onAddMediaToLibrary}
                customLists={customLists}
                onAddItemToList={onAddItemToList}
                onRemoveItemFromList={onRemoveItemFromList}
                tweaks={tweaks || settings?.tweaks}
                omdbApiKey={settings?.omdbApiKey}
                tmdbApiKey={settings?.tmdbApiKey}
                recommendationProvider={settings?.recommendationProvider}
                onUpdateSettings={onUpdateSettings}
              />
            );
          }

          return null;
        })}

        {/* Minimal Themed Footer Showcase (with red cross button to remove) */}
        {tweaks?.showFooterShowcase !== false && (
          <Footer
            onOpenChangelog={onOpenChangelog}
            onOpenLicense={onOpenLicense}
            onDismiss={() => {
              if (onUpdateSettings) {
                onUpdateSettings({
                  tweaks: {
                    ...DEFAULT_APP_TWEAKS,
                    ...tweaks,
                    showFooterShowcase: false,
                  },
                });
              }
            }}
          />
        )}
      </div>

      {/* Home Page Rearrange & Visibility Customizer Modal (triggered by Shelf Edit Pencil Icon) */}
      {onUpdateHomeSections && (
        <HomeCustomizeModal
          isOpen={isHomeCustomizeOpen}
          onClose={() => setIsHomeCustomizeOpen(false)}
          homeSections={sections}
          onUpdateHomeSections={onUpdateHomeSections}
        />
      )}
    </div>
  );
});
