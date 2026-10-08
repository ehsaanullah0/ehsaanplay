export type MediaType = 'movie' | 'tv';

export interface CastMember {
  name: string;
  character: string;
  profileUrl?: string;
}

export interface CrewMember {
  name: string;
  job: string;
  profileUrl?: string;
}

export interface WatchProvider {
  name: string;
  type: 'stream' | 'rent' | 'buy';
  logoUrl?: string;
}

export interface SeasonInfo {
  seasonNumber: number;
  name: string;
  episodeCount: number;
}

export interface MediaItem {
  id: string;
  tmdbId: number;
  type: MediaType;
  title: string;
  originalTitle: string;
  releaseDate: string;
  year: number;
  runtime?: number; // in minutes (movies)
  seasonsCount?: number; // for TV series
  episodesCount?: number; // for TV series
  seasons?: SeasonInfo[]; // per-season breakdown for TV series
  overview: string;
  tagline?: string;
  posterUrl: string;
  backdropUrl: string;
  tmdbRating: number;
  voteCount: number;
  genres: string[];
  cast: CastMember[];
  crew: CrewMember[];
  trailerUrl?: string;
  providers?: WatchProvider[];
  country?: string;
  productionCompany?: string;
  status?: string;
  language?: string;
  budget?: string;
  boxOffice?: string;
}

export interface EpisodeState {
  season: number;
  episode: number;
  title?: string;
  completed: boolean;
}

export interface TVProgress {
  currentSeason: number;
  currentEpisode: number;
  completedEpisodes: Record<string, boolean>; // e.g. "s1e1": true
}

export interface PersonalMediaState {
  mediaId: string;
  inWatchlist: boolean;
  isWatched: boolean;
  isFavorite: boolean;
  personalRating?: number; // 1 to 10
  notes?: string;
  progressPercent?: number; // 0 to 100
  lastWatchedAt?: string;
  addedAt: string;
  tvProgress?: TVProgress;
}

export interface CustomList {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  itemIds: string[];
  colorTag?: string;
}

export interface HomeSectionsConfig {
  showHeroSlideshow?: boolean;
  showTopMovies: boolean;
  showTopSeries: boolean;
  showContinueWatching: boolean;
  showFavorites: boolean;
  showRecentlyWatched: boolean;
  showExplore?: boolean;
}

export interface KeyboardShortcutsConfig {
  goBack: string; // Default: 'Escape'
  goHome: string; // Default: 'h'
  goWatchlist: string; // Default: 'w'
  openSearch: string; // Default: 'k'
  goLists: string; // Default: 'l'
}

export const DEFAULT_KEYBOARD_SHORTCUTS: KeyboardShortcutsConfig = {
  goBack: 'Escape',
  goHome: 'h',
  goWatchlist: 'w',
  openSearch: 'k',
  goLists: 'l',
};

export type AppFontFamily = 'default' | 'google-sans-flex';

export interface AppTweaksConfig {
  autoHideHeader: boolean; // Default: true (hide topbar on scroll)
  reducedMotion?: boolean; // Default: false
  showQuickScrollTop?: boolean; // Default: true
  fontFamily?: AppFontFamily; // Default: 'default'
  smoothScrolling?: boolean; // Default: true
  microAnimations?: boolean; // Default: true
  showExploreShelf?: boolean; // Default: true
  showContinueWatching?: boolean; // Default: true
  showTop10Movies?: boolean; // Default: true
  showTop10Series?: boolean; // Default: true
  showFavoriteButton?: boolean; // Default: true
  showAddToListButton?: boolean; // Default: true
  showWatchedButton?: boolean; // Default: true
  showWatchlistButton?: boolean; // Default: true
  swapSearchAndLists?: boolean; // Default: false (exchange search bar & custom lists positions)
  longPressBatchSelection?: boolean; // Default: false (enable long-press to enter batch-selection in Watchlist)
}

export const DEFAULT_APP_TWEAKS: AppTweaksConfig = {
  autoHideHeader: true,
  reducedMotion: false,
  showQuickScrollTop: true,
  fontFamily: 'google-sans-flex',
  smoothScrolling: true,
  microAnimations: true,
  showExploreShelf: true,
  showContinueWatching: true,
  showTop10Movies: true,
  showTop10Series: true,
  showFavoriteButton: true,
  showAddToListButton: true,
  showWatchedButton: true,
  showWatchlistButton: true,
  swapSearchAndLists: false,
  longPressBatchSelection: false,
};

export interface UserSettings {
  theme: 'cream' | 'dark-olive' | 'oled-black';
  colorScheme?: string;
  previewButtonFormat?: 'full' | 'icon-only';
  backdropOpacity: number; // 0.0 to 1.0 (default 0.40)
  tmdbApiKey?: string;
  viewMode: 'grid' | 'cards';
  posterQuality: 'standard' | 'high';
  homeSections?: HomeSectionsConfig;
  imageStorageMode?: 'online' | 'offline'; // 'online' = stream on demand (low storage), 'offline' = pre-cache artwork locally
  keyboardShortcuts?: KeyboardShortcutsConfig;
  tweaks?: AppTweaksConfig;
  swapSearchAndLists?: boolean;
}

export type SortOption = 'recent' | 'rating_desc' | 'rating_asc' | 'year_desc' | 'year_asc' | 'title_asc';
export type FilterStatus = 'all' | 'watchlist' | 'watched' | 'unwatched' | 'in_progress' | 'favorites';

export interface FilterState {
  type: 'all' | 'movie' | 'tv';
  status: FilterStatus;
  genre: string; // 'all' or specific genre
  year: string; // 'all' or specific decade/year
  minRating: number; // 0 to 10
  sortBy: SortOption;
  searchQuery: string;
}

export type ActiveTab = 'home' | 'watchlist' | 'lists' | 'settings';
