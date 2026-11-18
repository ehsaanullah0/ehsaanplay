import React, { useState, useEffect, useMemo } from 'react';
import {
  MediaItem,
  PersonalMediaState,
  ActiveTab,
  HomeSectionsConfig,
  AppTweaksConfig,
  UserSettings,
  DEFAULT_APP_TWEAKS,
  CustomList,
} from '../../types/movie';
import { fetchNetflixTop10Movies, fetchNetflixTop10Series } from '../../data/curatedCatalog';
import { TrendingHeroShowcase } from './TrendingHeroShowcase';
import { LibraryStats } from './LibraryStats';
import { RankingRail } from './RankingRail';
import { ContinueWatchingRail } from './ContinueWatchingRail';
import { ExploreSection } from './ExploreSection';
import { Footer } from '../layout/Footer';
import { resolveStateForMediaItem, normalizeMediaTitle } from '../../utils/mediaDedup';

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
}) => {
  const sections = homeSections || {
    showHeroSlideshow: false,
    showTopMovies: true,
    showTopSeries: true,
    showContinueWatching: true,
    showFavorites: true,
    showRecentlyWatched: true,
    showExplore: true,
  };

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
      {/* Full-Screen Trending Shows Coverflow Stage (Hidden by default, opt-in) */}
      {sections.showHeroSlideshow === true && (
        <TrendingHeroShowcase
          onSelectMedia={onSelectMedia}
          userStates={userStates}
          settings={settings}
          tweaks={tweaks || settings?.tweaks}
          onToggleWatchlist={onToggleWatchlist}
          onScrollToCinema={() => {
            const el = document.getElementById('your-cinema-shelf');
            el?.scrollIntoView({ behavior: 'smooth' });
          }}
        />
      )}

      {/* Main Home Content: Your Cinema Shelf and Personal Collection Rails (Visible After Scroll) */}
      <div id="your-cinema-shelf" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-14 scroll-mt-16">
        {/* Integrated Library Stats ("Your Cinema Shelf") */}
        <LibraryStats
          stats={stats}
          onNavigateToWatchlist={onNavigateToWatchlistWithFilter}
          onNavigateTab={onNavigateTab}
          homeSections={sections}
          onUpdateHomeSections={onUpdateHomeSections}
        />

      {/* Continue Watching Section */}
      {sections.showContinueWatching && continueWatchingItems.length > 0 && (
        <ContinueWatchingRail
          items={continueWatchingItems}
          onSelectMedia={onSelectMedia}
          onDismissFromWatching={onDismissFromWatching}
        />
      )}

      {/* Top 10 Movies Rail (Industry Trends Worldwide) */}
      {sections.showTopMovies && (
        <RankingRail
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
      )}

      {/* Top 10 Series Rail (Industry Trends Worldwide) */}
      {sections.showTopSeries && (
        <RankingRail
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
      )}

      {/* Personal Favorites Rail / Grid */}
      {sections.showFavorites && favoriteItems.length > 0 && (
        <RankingRail
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
      )}

      {/* Recently Watched Rail */}
      {sections.showRecentlyWatched && recentlyWatchedItems.length > 0 && (
        <RankingRail
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
      )}

      {/* Explore Recommendations Section (Excluding Watchlist & Watched titles, supporting TMDB & OMDb) */}
      {sections.showExplore !== false && (
        <ExploreSection
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
      )}

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
    </div>
  );
});
