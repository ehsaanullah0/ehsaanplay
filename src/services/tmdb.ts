/**
 * TMDB API Service (The Movie Database) with Secret Integration
 * 
 * Securely proxies calls through /api/tmdb on the Express server
 * using server-side environment variables (TMDB_API_KEY, VITE_TMDB_API_KEY) or custom key overrides.
 */

import { MediaItem, MediaType, CastMember, CrewMember, WatchProvider, SeasonInfo, EpisodeDetail } from '../types/movie';

export const DEFAULT_TMDB_KEY = defalt tmdb key// Default fallback TMDB API key

const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/';

/**
 * Custom error class for TMDB operations
 */
export class TMDBError extends Error {
  statusCode?: number;
  endpoint?: string;

  constructor(message: string, statusCode?: number, endpoint?: string) {
    super(message);
    this.statusCode = statusCode;
    this.endpoint = endpoint;
    this.name = 'TMDBError';
  }
}

/**
 * Checks if TMDB API key is available
 */
export function isTMDBConfigured(): boolean {
  return true; // Always supported via server-side proxy
}

/**
 * Helper to get active TMDB key indicator
 */
export function getEffectiveTMDBKey(userKey?: string): string {
  if (userKey && userKey.trim().length > 0) return userKey.trim();
  const envKey = (import.meta as any).env?.VITE_TMDB_API_KEY;
  if (envKey && envKey.trim().length > 0) return envKey.trim();
  return DEFAULT_TMDB_KEY;
}

/**
 * Helper to construct TMDB image URLs safely
 */
export function getTMDBImageUrl(path: string | null | undefined, size: 'w300' | 'w500' | 'w1280' | 'original' = 'w500'): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${TMDB_IMAGE_BASE_URL}${size}${cleanPath}`;
}

/**
 * Internal helper to send request via /api/tmdb server proxy
 */
async function tmdbFetch(endpoint: string, params: Record<string, string> = {}, customKey?: string): Promise<any> {
  const urlParams = new URLSearchParams(params);
  urlParams.set('endpoint', endpoint);

  const headers: Record<string, string> = {};
  const activeKey = customKey || (import.meta as any).env?.VITE_TMDB_API_KEY;
  if (activeKey) {
    headers['x-tmdb-api-key'] = activeKey;
  }

  try {
    const baseUrl = typeof window !== 'undefined' ? '' : (process.env.APP_URL || 'http://localhost:3000');
    const res = await fetch(`${baseUrl}/api/tmdb?${urlParams.toString()}`, { headers });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({ Error: res.statusText }));
      throw new TMDBError(errData.Error || `TMDB API request failed with status ${res.status}`, res.status, endpoint);
    }
    return await res.json();
  } catch (err: any) {
    if (err instanceof TMDBError) throw err;
    throw new TMDBError(`TMDB Proxy request failed: ${err.message || 'Network error'}`, 500, endpoint);
  }
}

/**
 * Formats a raw TMDB API response item into a clean MediaItem
 */
export function formatTMDBMediaItem(data: any, typeOverride?: MediaType): MediaItem {
  const mediaType: MediaType = typeOverride || (data.media_type === 'tv' || data.first_air_date ? 'tv' : 'movie');
  const title = data.title || data.name || data.original_title || data.original_name || 'Untitled';
  const originalTitle = data.original_title || data.original_name || title;
  const releaseDate = data.release_date || data.first_air_date || '';
  const year = releaseDate ? parseInt(releaseDate.substring(0, 4), 10) || new Date().getFullYear() : new Date().getFullYear();

  const posterPath = data.poster_path ? getTMDBImageUrl(data.poster_path, 'w500') : '';
  const backdropPath = data.backdrop_path ? getTMDBImageUrl(data.backdrop_path, 'w1280') : (posterPath || '');

  // Extract genres
  const genres: string[] = Array.isArray(data.genres)
    ? data.genres.map((g: any) => typeof g === 'string' ? g : g.name)
    : [];

  // Cast extraction
  const cast: CastMember[] = Array.isArray(data.credits?.cast)
    ? data.credits.cast.slice(0, 10).map((c: any) => ({
        name: c.name || 'Unknown',
        character: c.character || 'Actor',
        profileUrl: c.profile_path ? getTMDBImageUrl(c.profile_path, 'w300') : undefined,
      }))
    : [];

  // Priority jobs for crew
  const priorityJobs = ['Director', 'Writer', 'Screenplay', 'Executive Producer', 'Producer', 'Creator', 'Original Music Composer', 'Director of Photography'];
  const crew: CrewMember[] = Array.isArray(data.credits?.crew)
    ? data.credits.crew
        .filter((c: any) => c && c.name)
        .sort((a: any, b: any) => {
          const idxA = priorityJobs.indexOf(a.job || a.department);
          const idxB = priorityJobs.indexOf(b.job || b.department);
          if (idxA !== -1 && idxB !== -1) return idxA - idxB;
          if (idxA !== -1) return -1;
          if (idxB !== -1) return 1;
          return 0;
        })
        .slice(0, 10)
        .map((c: any) => ({
          name: c.name,
          job: c.job || c.department || 'Crew',
          profileUrl: c.profile_path ? getTMDBImageUrl(c.profile_path, 'w300') : undefined,
        }))
    : [];

  if (Array.isArray(data.created_by)) {
    data.created_by.forEach((creator: any) => {
      if (creator.name && !crew.some(c => c.name === creator.name)) {
        crew.unshift({
          name: creator.name,
          job: 'Creator',
          profileUrl: creator.profile_path ? getTMDBImageUrl(creator.profile_path, 'w300') : undefined,
        });
      }
    });
  }

  // Trailer URL
  let trailerUrl: string | undefined;
  if (Array.isArray(data.videos?.results)) {
    const trailer = data.videos.results.find((v: any) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser'));
    if (trailer?.key) {
      trailerUrl = `https://www.youtube.com/watch?v=${trailer.key}`;
    }
  }

  // Watch Providers (US or region primary)
  let providers: WatchProvider[] | undefined;
  const wpResults = data['watch/providers']?.results;
  const regionData = wpResults?.US || wpResults?.GB || (wpResults ? Object.values(wpResults)[0] : null) as any;
  if (regionData) {
    const flatrate = (regionData.flatrate || []).map((p: any) => ({ name: p.provider_name, type: 'stream' as const, logoUrl: getTMDBImageUrl(p.logo_path, 'w300') }));
    const rent = (regionData.rent || []).map((p: any) => ({ name: p.provider_name, type: 'rent' as const, logoUrl: getTMDBImageUrl(p.logo_path, 'w300') }));
    const buy = (regionData.buy || []).map((p: any) => ({ name: p.provider_name, type: 'buy' as const, logoUrl: getTMDBImageUrl(p.logo_path, 'w300') }));
    providers = [...flatrate, ...rent, ...buy].filter((p, index, self) => self.findIndex(s => s.name === p.name) === index).slice(0, 8);
  }

  return {
    id: `tmdb-${mediaType}-${data.id}`,
    tmdbId: data.id,
    type: mediaType,
    title,
    originalTitle,
    releaseDate,
    year,
    runtime: data.runtime || (Array.isArray(data.episode_run_time) ? data.episode_run_time[0] : undefined),
    seasonsCount: data.number_of_seasons,
    episodesCount: data.number_of_episodes,
    overview: data.overview || 'No overview available.',
    tagline: data.tagline || undefined,
    posterUrl: posterPath,
    backdropUrl: backdropPath,
    voteCount: data.vote_count || 0,
    tmdbRating: data.vote_average ? Math.round(data.vote_average * 10) / 10 : undefined,
    imdbRating: data.vote_average ? Math.round(data.vote_average * 10) / 10 : undefined,
    genres,
    cast,
    crew,
    trailerUrl,
    providers,
    imdbId: data.imdb_id || data.external_ids?.imdb_id,
    popularity: data.popularity,
    metadataSource: 'tmdb',
    status: data.status,
    language: data.original_language?.toUpperCase(),
  };
}

/**
 * Finds TMDB media item by IMDb ID (e.g., 'tt0133093')
 */
export async function findTMDBByImdbId(
  imdbId: string,
  customApiKey?: string
): Promise<{ id: number; type: MediaType } | null> {
  const cleanId = (imdbId || '').trim().toLowerCase();
  if (!cleanId || !cleanId.startsWith('tt')) return null;

  try {
    const data = await tmdbFetch(`find/${cleanId}`, { external_source: 'imdb_id' }, customApiKey);
    if (data.movie_results && data.movie_results.length > 0) {
      return { id: data.movie_results[0].id, type: 'movie' };
    }
    if (data.tv_results && data.tv_results.length > 0) {
      return { id: data.tv_results[0].id, type: 'tv' };
    }
  } catch (err) {
    console.warn(`TMDB find by IMDb ID ${cleanId} failed:`, err);
  }
  return null;
}

/**
 * Searches TMDB for movies, TV series, or multi-media
 */
export async function searchTMDB(
  query: string,
  type: 'movie' | 'tv' | 'multi' | 'person' = 'multi',
  page: number = 1,
  customApiKey?: string
): Promise<MediaItem[]> {
  if (!query || !query.trim()) return [];

  const endpoint = type === 'multi' ? 'search/multi' : `search/${type}`;
  const data = await tmdbFetch(endpoint, { query: query.trim(), page: page.toString() }, customApiKey);

  if (!data.results || !Array.isArray(data.results)) {
    return [];
  }

  const results: MediaItem[] = [];

  for (const item of data.results) {
    if (item.media_type === 'person') {
      // Unpack person's known for movies/tv shows
      if (Array.isArray(item.known_for)) {
        for (const known of item.known_for) {
          if (known.media_type === 'movie' || known.media_type === 'tv') {
            results.push(formatTMDBMediaItem(known, known.media_type));
          }
        }
      }
    } else if (item.media_type === 'movie' || item.media_type === 'tv' || type === 'movie' || type === 'tv') {
      const targetType: MediaType | undefined = (type === 'movie' || type === 'tv') ? type : undefined;
      results.push(formatTMDBMediaItem(item, targetType));
    }
  }

  return results;
}

/**
 * Fetches comprehensive details for a specific TMDB movie or TV show, including seasons & episodes
 */
export async function fetchTMDBDetails(
  id: number | string,
  type: MediaType = 'movie',
  customApiKey?: string
): Promise<MediaItem> {
  const numericId = typeof id === 'string' ? id.replace(/^tmdb-(movie|tv)-/, '') : id;
  const endpoint = `${type}/${numericId}`;
  
  const data = await tmdbFetch(endpoint, { append_to_response: 'credits,videos,watch/providers,external_ids' }, customApiKey);
  const item = formatTMDBMediaItem(data, type);

  // If TV show, fetch season and episode details
  if (type === 'tv' && data.number_of_seasons > 0) {
    try {
      const seasonsList: SeasonInfo[] = [];
      const allEpisodesList: EpisodeDetail[] = [];
      const totalSeasonsToFetch = Math.min(data.number_of_seasons, 6);
      
      for (let s = 1; s <= totalSeasonsToFetch; s++) {
        try {
          const seasonData = await tmdbFetch(`tv/${numericId}/season/${s}`, {}, customApiKey);
          const epList: EpisodeDetail[] = Array.isArray(seasonData.episodes)
            ? seasonData.episodes.map((ep: any) => ({
                episodeNumber: ep.episode_number,
                seasonNumber: s,
                title: ep.name || `Episode ${ep.episode_number}`,
                overview: ep.overview,
                airDate: ep.air_date,
                stillUrl: ep.still_path ? getTMDBImageUrl(ep.still_path, 'w500') : undefined,
                rating: ep.vote_average ? Math.round(ep.vote_average * 10) / 10 : undefined,
                runtime: ep.runtime,
              }))
            : [];

          allEpisodesList.push(...epList);
          seasonsList.push({
            seasonNumber: s,
            name: seasonData.name || `Season ${s}`,
            episodeCount: epList.length || seasonData.episodes?.length || 0,
            episodes: epList,
            posterUrl: seasonData.poster_path ? getTMDBImageUrl(seasonData.poster_path, 'w500') : undefined,
            airDate: seasonData.air_date,
          });
        } catch {
          seasonsList.push({
            seasonNumber: s,
            name: `Season ${s}`,
            episodeCount: 10,
          });
        }
      }

      if (seasonsList.length > 0) {
        item.seasons = seasonsList;
        item.seasonsCount = data.number_of_seasons;
      }
      if (allEpisodesList.length > 0) {
        item.episodesList = allEpisodesList;
        item.episodesCount = allEpisodesList.length;
      }
    } catch (err) {
      console.warn('TMDB TV seasons details lookup error:', err);
    }
  }

  return item;
}

/**
 * Fetches trending movies or TV series from TMDB
 */
export async function fetchTMDBTrending(
  type: 'movie' | 'tv' | 'all' = 'all',
  timeWindow: 'day' | 'week' = 'week',
  customApiKey?: string
): Promise<MediaItem[]> {
  const endpoint = `trending/${type}/${timeWindow}`;
  const data = await tmdbFetch(endpoint, {}, customApiKey);

  if (!data.results || !Array.isArray(data.results)) {
    return [];
  }

  return data.results.map((item: any) => formatTMDBMediaItem(item));
}

/**
 * Diagnostic test to verify TMDB Secret Integration connectivity
 */
export async function testTMDBConnection(customApiKey?: string): Promise<{
  ok: boolean;
  message: string;
  source?: string;
  latencyMs?: number;
  sampleCount?: number;
}> {
  const startTime = Date.now();
  try {
    const data = await tmdbFetch('configuration', {}, customApiKey);
    const latencyMs = Date.now() - startTime;

    if (data.images && data.images.secure_base_url) {
      // Perform a sample search test
      const searchTest = await searchTMDB('Inception', 'movie', 1, customApiKey);
      return {
        ok: true,
        message: `TMDB Secret Integration active & verified! CDN host: ${data.images.secure_base_url}`,
        source: customApiKey ? 'Custom Overridden Key' : 'Server Environment Proxy Secret',
        latencyMs,
        sampleCount: searchTest.length,
      };
    }

    return {
      ok: true,
      message: 'TMDB proxy connected successfully.',
      latencyMs,
    };
  } catch (err: any) {
    return {
      ok: false,
      message: err.message || 'Failed to connect to TMDB via server proxy secret.',
      latencyMs: Date.now() - startTime,
    };
  }
}
