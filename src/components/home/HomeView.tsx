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
import { areMediaItemsSame } from '../../hooks/useMediaLibrary';
import { resolveStateForMediaItem } from '../../utils/mediaDedup';

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

export const HomeView: React.FC<HomeViewProps> = ({
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

  // In-Progress / Continue Watching items (Guaranteed zero duplicates)
  const continueWatchingItems = useMemo(() => {
    const list: { item: MediaItem; state: PersonalMediaState }[] = [];
    const seenTitles = new Set<string>();

    for (const item of mediaItems) {
      const state = resolveStateForMediaItem(item, userStates);
      if (
        state &&
        !state.isWatched &&
        state.progressPercent !== undefined &&
        state.progressPercent > 0 &&
        state.progressPercent < 100
      ) {
        const normTitle = (item.title || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        const dedupKey = normTitle ? `${normTitle}_${item.year || ''}` : item.id;

        const existingIdx = list.findIndex(entry => {
          const entryNorm = (entry.item.title || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
          return (normTitle && entryNorm === normTitle) || areMediaItemsSame(entry.item, item);
        });

        if (existingIdx !== -1) {
          // If already in list, keep the one with higher episode progress or more recent timestamp
          const prev = list[existingIdx];
          const prevScore = (prev.state.tvProgress?.currentSeason || 1) * 1000 + (prev.state.tvProgress?.currentEpisode || 1);
          const currScore = (state.tvProgress?.currentSeason || 1) * 1000 + (state.tvProgress?.currentEpisode || 1);
          const prevTime = prev.state.lastWatchedAt || '';
          const currTime = state.lastWatchedAt || '';
          if (currScore > prevScore || (currScore === prevScore && currTime > prevTime)) {
            list[existingIdx] = { item, state };
          }
          continue;
        }

        seenTitles.add(dedupKey);
        list.push({ item, state });
      }
    }
    return list.sort((a, b) => {
      const timeA = a.state.lastWatchedAt || '';
      const timeB = b.state.lastWatchedAt || '';
      return timeB.localeCompare(timeA);
    });
  }, [mediaItems, userStates]);

  // Recently Watched (Guaranteed zero duplicates)
  const recentlyWatchedItems = useMemo(() => {
    const list: MediaItem[] = [];
    const sorted = [...mediaItems]
      .filter(m => resolveStateForMediaItem(m, userStates)?.isWatched)
      .sort((a, b) => {
        const stA = resolveStateForMediaItem(a, userStates);
        const stB = resolveStateForMediaItem(b, userStates);
        const timeA = stA?.lastWatchedAt || stA?.addedAt || '';
        const timeB = stB?.lastWatchedAt || stB?.addedAt || '';
        return timeB.localeCompare(timeA);
      });

    for (const m of sorted) {
      const normTitle = (m.title || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      const isDuplicate = list.some(existing => {
        const existingNorm = (existing.title || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        return (normTitle && existingNorm === normTitle) || areMediaItemsSame(existing, m);
      });
      if (!isDuplicate) {
        list.push(m);
      }
    }
    return list.slice(0, 10);
  }, [mediaItems, userStates]);

  // Favorites / Personal Picks (Guaranteed zero duplicates)
  const favoriteItems = useMemo(() => {
    const list: MediaItem[] = [];
    const sorted = [...mediaItems]
      .filter(m => resolveStateForMediaItem(m, userStates)?.isFavorite)
      .sort((a, b) => {
        const stA = resolveStateForMediaItem(a, userStates);
        const stB = resolveStateForMediaItem(b, userStates);
        const timeA = stA?.favoritedAt || stA?.addedAt || '';
        const timeB = stB?.favoritedAt || stB?.addedAt || '';
        return timeB.localeCompare(timeA);
      });

    for (const m of sorted) {
      const normTitle = (m.title || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      const isDuplicate = list.some(existing => {
        const existingNorm = (existing.title || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        return (normTitle && existingNorm === normTitle) || areMediaItemsSame(existing, m);
      });
      if (!isDuplicate) {
        list.push(m);
      }
    }
    return list;
  }, [mediaItems, userStates]);

  // Featured 5 recently added or highlighted titles for top Hero Slideshow
  const featuredSlideshowItems = useMemo(() => {
    if (!mediaItems || mediaItems.length === 0) return [];
    // Prioritize titles with backdrops and posters
    const withArt = mediaItems.filter(m => m.backdropUrl || m.posterUrl);
    return (withArt.length >= 5 ? withArt : mediaItems).slice(0, 5);
  }, [mediaItems]);

  return (
    <div className="w-full pb-28 md:pb-16 animate-fade-in">
      {/* Full-Screen Trending Shows Coverflow Stage (Directly from TMDB) */}
      {sections.showHeroSlideshow !== false && (
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
};
