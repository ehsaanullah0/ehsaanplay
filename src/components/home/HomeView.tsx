import React, { useMemo } from 'react';
import { MediaItem, PersonalMediaState, ActiveTab, HomeSectionsConfig } from '../../types/movie';
import { LibraryStats } from './LibraryStats';
import { RankingRail } from './RankingRail';
import { ContinueWatchingRail } from './ContinueWatchingRail';
import { ExploreSection } from './ExploreSection';
import { Footer } from '../layout/Footer';

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
  };
  onSelectMedia: (item: MediaItem) => void;
  onNavigateTab: (tab: ActiveTab) => void;
  onNavigateToWatchlistWithFilter: (status?: string) => void;
  homeSections?: HomeSectionsConfig;
  onUpdateHomeSections?: (sections: HomeSectionsConfig) => void;
  onRemoveFromWatchlist?: (id: string) => void;
  onDismissFromWatching?: (id: string) => void;
  onMarkWatching?: (id: string) => void;
  onMarkWatched?: (id: string) => void;
  onToggleWatchlist?: (id: string) => void;
  tmdbApiKey?: string;
  onAddMediaToLibrary?: (item: MediaItem) => void;
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
  tmdbApiKey,
  onAddMediaToLibrary,
}) => {
  const sections = homeSections || {
    showTopMovies: true,
    showTopSeries: true,
    showContinueWatching: true,
    showFavorites: true,
    showRecentlyWatched: true,
    showExplore: true,
  };

  // Top 10 Movies sorted by TMDB / user rating
  const top10Movies = useMemo(() => {
    return mediaItems
      .filter(m => m.type === 'movie')
      .sort((a, b) => {
        const ratingA = userStates[a.id]?.personalRating || a.tmdbRating;
        const ratingB = userStates[b.id]?.personalRating || b.tmdbRating;
        return ratingB - ratingA;
      })
      .slice(0, 10);
  }, [mediaItems, userStates]);

  // Top 10 Series
  const top10Series = useMemo(() => {
    return mediaItems
      .filter(m => m.type === 'tv')
      .sort((a, b) => {
        const ratingA = userStates[a.id]?.personalRating || a.tmdbRating;
        const ratingB = userStates[b.id]?.personalRating || b.tmdbRating;
        return ratingB - ratingA;
      })
      .slice(0, 10);
  }, [mediaItems, userStates]);

  // In-Progress / Continue Watching items
  const continueWatchingItems = useMemo(() => {
    const list: { item: MediaItem; state: PersonalMediaState }[] = [];
    for (const item of mediaItems) {
      const state = userStates[item.id];
      if (
        state &&
        !state.isWatched &&
        state.progressPercent !== undefined &&
        state.progressPercent > 0 &&
        state.progressPercent < 100
      ) {
        list.push({ item, state });
      }
    }
    return list.sort((a, b) => {
      const timeA = a.state.lastWatchedAt || '';
      const timeB = b.state.lastWatchedAt || '';
      return timeB.localeCompare(timeA);
    });
  }, [mediaItems, userStates]);

  // Recently Watched
  const recentlyWatchedItems = useMemo(() => {
    return mediaItems
      .filter(m => userStates[m.id]?.isWatched)
      .sort((a, b) => {
        const timeA = userStates[a.id]?.lastWatchedAt || userStates[a.id]?.addedAt || '';
        const timeB = userStates[b.id]?.lastWatchedAt || userStates[b.id]?.addedAt || '';
        return timeB.localeCompare(timeA);
      })
      .slice(0, 10);
  }, [mediaItems, userStates]);

  // Favorites / Personal Picks
  const favoriteItems = useMemo(() => {
    return mediaItems
      .filter(m => userStates[m.id]?.isFavorite)
      .slice(0, 10);
  }, [mediaItems, userStates]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 pb-20 md:pb-8">
      {/* Integrated Library Stats */}
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

      {/* Top 10 Movies Rail */}
      {sections.showTopMovies && (
        <RankingRail
          title="Top 10 Movies"
          subtitle="Highest rated feature films in your library"
          items={top10Movies}
          userStates={userStates}
          onSelectMedia={onSelectMedia}
          showRankingNumbers={true}
          onRemoveFromWatchlist={onRemoveFromWatchlist}
          onMarkWatching={onMarkWatching}
          onMarkWatched={onMarkWatched}
        />
      )}

      {/* Top 10 Series Rail */}
      {sections.showTopSeries && (
        <RankingRail
          title="Top 10 Series"
          subtitle="Acclaimed television narratives and limited series"
          items={top10Series}
          userStates={userStates}
          onSelectMedia={onSelectMedia}
          showRankingNumbers={true}
          onRemoveFromWatchlist={onRemoveFromWatchlist}
          onMarkWatching={onMarkWatching}
          onMarkWatched={onMarkWatched}
        />
      )}

      {/* Personal Favorites Rail */}
      {sections.showFavorites && favoriteItems.length > 0 && (
        <RankingRail
          title="Personal Favorites"
          subtitle="Titles marked with highest sentiment in your journal"
          items={favoriteItems}
          userStates={userStates}
          onSelectMedia={onSelectMedia}
          showRankingNumbers={false}
          onRemoveFromWatchlist={onRemoveFromWatchlist}
          onMarkWatching={onMarkWatching}
          onMarkWatched={onMarkWatched}
          onToggleWatchlist={onToggleWatchlist}
        />
      )}

      {/* Recently Watched Rail */}
      {sections.showRecentlyWatched && recentlyWatchedItems.length > 0 && (
        <RankingRail
          title="Recently Watched"
          subtitle="Your most recently completed journeys"
          items={recentlyWatchedItems}
          userStates={userStates}
          onSelectMedia={onSelectMedia}
          showRankingNumbers={false}
          onRemoveFromWatchlist={onRemoveFromWatchlist}
          onMarkWatching={onMarkWatching}
          onMarkWatched={onMarkWatched}
          onToggleWatchlist={onToggleWatchlist}
        />
      )}

      {/* Explore Recommendations Section (50+ Titles from TMDB excluding Watchlist) */}
      {sections.showExplore !== false && (
        <ExploreSection
          mediaItems={mediaItems}
          userStates={userStates}
          onSelectMedia={onSelectMedia}
          onRemoveFromWatchlist={onRemoveFromWatchlist}
          onMarkWatching={onMarkWatching}
          onMarkWatched={onMarkWatched}
          onToggleWatchlist={onToggleWatchlist}
          tmdbApiKey={tmdbApiKey}
          onAddMediaToLibrary={onAddMediaToLibrary}
        />
      )}

      {/* Minimal Themed Footer */}
      <Footer />
    </div>
  );
};
