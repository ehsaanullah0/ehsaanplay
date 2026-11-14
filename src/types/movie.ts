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

export interface EpisodeDetail {
  episodeNumber: number;
  seasonNumber: number;
  title: string;
  overview?: string;
  airDate?: string;
  stillUrl?: string;
  rating?: number;
  runtime?: number;
}

export interface SeasonInfo {
  seasonNumber: number;
  name: string;
  episodeCount: number;
  episodes?: EpisodeDetail[];
  posterUrl?: string;
  airDate?: string;
}

export interface MediaItem {
  id: string;
  
  type: MediaType;
  title: string;
  originalTitle: string;
  releaseDate: string;
  year: number;
  runtime?: number; // in minutes (movies)
  seasonsCount?: number; // for TV series
  episodesCount?: number; // for TV series
  seasons?: SeasonInfo[]; // per-season breakdown for TV series
  episodesList?: EpisodeDetail[]; // detailed episode list across seasons
  overview: string;
  tagline?: string;
  posterUrl: string;
  backdropUrl: string;
  
  tmdbId?: number;
  tmdbRating?: number;
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
  imdbId?: string;
  imdbRating?: number; // Preserves source of rating
  popularity?: number; // Popularity score for clean ranking
  metadataSource?: 'tmdb' | 'omdb' | 'cache';
  fallbackPosterUrl?: string; // Poster fallback
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

export type RatingTagId = 'snoozefest' | 'popcorn_flick' | 'worth_the_hype' | 'absolute_cinema';

export interface RatingTagItem {
  id: RatingTagId;
  label: string;
  description: string;
  colorClass: string;
  activeBorderClass: string;
  activeBgClass: string;
  numericRating: number;
}

export const RATING_TAGS: RatingTagItem[] = [
  {
    id: 'snoozefest',
    label: 'Snoozefest',
    description: 'Your time is worth more.',
    colorClass: 'text-red-700 dark:text-red-400',
    activeBorderClass: 'border-red-600/80 ring-2 ring-red-500/20',
    activeBgClass: 'bg-red-500/10',
    numericRating: 2.5,
  },
  {
    id: 'popcorn_flick',
    label: 'Popcorn Flick',
    description: "Fun if you don't overthink it.",
    colorClass: 'text-sky-700 dark:text-sky-400',
    activeBorderClass: 'border-sky-600/80 ring-2 ring-sky-500/20',
    activeBgClass: 'bg-sky-500/10',
    numericRating: 5.5,
  },
  {
    id: 'worth_the_hype',
    label: 'Worth the Hype',
    description: 'Clear your evening for this.',
    colorClass: 'text-emerald-700 dark:text-emerald-400',
    activeBorderClass: 'border-emerald-600/80 ring-2 ring-emerald-500/20',
    activeBgClass: 'bg-emerald-500/10',
    numericRating: 8.0,
  },
  {
    id: 'absolute_cinema',
    label: 'Absolute Cinema',
    description: 'Drop everything and watch it.',
    colorClass: 'text-amber-900 dark:text-amber-300',
    activeBorderClass: 'border-amber-700/90 dark:border-amber-500/80 ring-2 ring-amber-600/30',
    activeBgClass: 'bg-amber-600/15 dark:bg-amber-500/15',
    numericRating: 10.0,
  },
];

export function resolveRatingTag(state?: PersonalMediaState): RatingTagItem | undefined {
  if (!state) return undefined;
  if (state.ratingTag) {
    return RATING_TAGS.find(t => t.id === state.ratingTag);
  }
  if (state.personalRating && state.personalRating > 0) {
    const r = state.personalRating;
    if (r <= 4) return RATING_TAGS[0];
    if (r <= 6.5) return RATING_TAGS[1];
    if (r <= 8.5) return RATING_TAGS[2];
    return RATING_TAGS[3];
  }
  return undefined;
}

export interface PersonalMediaState {
  mediaId: string;
  inWatchlist: boolean;
  isWatched: boolean;
  isFavorite: boolean;
  favoritedAt?: string;
  personalRating?: number; // 1 to 10
  ratingTag?: RatingTagId;
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
  showBatchSelectButton?: boolean; // Default: false (display Batch Select button in Watchlist toolbar)
  showExploreFilterLabels?: boolean; // Default: false (display text labels in Explore selection bar; default is icon-only)
  favoritesLayout?: 'horizontal' | 'vertical'; // Default: 'horizontal' (Personal favorites display format)
  showFooterShowcase?: boolean; // Default: true (Bottom footer showcase visibility)
  // Hero Slideshow Controls
  heroSlideshowLayout?: 'card' | 'full-width'; // Default: 'card' (card boxed or edge-to-edge top/sides)
  heroSlideshowOpacity?: number; // 0.0 to 1.0 (default: 0.75)
  heroSlideshowGenresPill?: boolean; // Default: false (true = theme colored pills, false = dot separated)
  heroSlideshowTitleColor?: 'white' | 'artwork-adaptive'; // Default: 'white' (standard white vs theme accent color)
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
  showBatchSelectButton: false,
  showExploreFilterLabels: false,
  favoritesLayout: 'horizontal',
  showFooterShowcase: true,
  heroSlideshowLayout: 'card',
  heroSlideshowOpacity: 0.75,
  heroSlideshowGenresPill: false,
  heroSlideshowTitleColor: 'white',
};

export interface UserSettings {
  theme: 'cream' | 'dark-olive' | 'oled-black';
  colorScheme?: string;
  previewButtonFormat?: 'full' | 'icon-only';
  backdropOpacity: number; // 0.0 to 1.0 (default 0.40)
  tmdbApiKey?: string;
  omdbApiKey?: string;
  recommendationProvider?: 'tmdb' | 'omdb'; // Default: 'tmdb' (Active recommendation catalog provider)
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
  ratingTag?: 'all' | RatingTagId;
  sortBy: SortOption;
  searchQuery: string;
}

export type ActiveTab = 'home' | 'watchlist' | 'lists' | 'settings';
