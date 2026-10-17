import { MediaItem, MediaType, CastMember, CrewMember } from '../types/movie';
import { omdbCircuitBreaker, tmdbCircuitBreaker } from './circuitBreaker';
import { findTMDBByImdbId, fetchTMDBDetails, searchTMDB } from './tmdb';
export interface DiagnosticResult {
  success: boolean;
  status: number;
  message: string;
  latencyMs: number;
  endpoint?: string;
  resultsCount?: number;
}

const OMDB_BASE_URL = 'https://www.omdbapi.com/';
const REQUEST_TIMEOUT_MS = 6000;
export const DEFAULT_OMDB_API_KEY = default';

export function getEffectiveOMDBKey(customKey?: string): string {
  if (customKey && customKey.trim()) {
    return customKey.trim();
  }

  // Safe check across Vite client (import.meta.env) and Node/test environments (process.env)
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_OMDB_API_KEY) {
      return String(import.meta.env.VITE_OMDB_API_KEY).trim();
    }
  } catch {
    // ignore
  }

  try {
    if (typeof process !== 'undefined' && process.env?.VITE_OMDB_API_KEY) {
      return String(process.env.VITE_OMDB_API_KEY).trim();
    }
  } catch {
    // ignore
  }

  return DEFAULT_OMDB_API_KEY;
}

export function isOMDBConfigured(customKey?: string): boolean {
  return getEffectiveOMDBKey(customKey).length > 0;
}

export interface OMDBRawSearchItem {
  Title: string;
  Year: string;
  imdbID: string;
  Type: string; // 'movie' | 'series' | 'episode'
  Poster: string;
}

export interface OMDBRawDetail {
  Title?: string;
  Year?: string;
  Rated?: string;
  Released?: string;
  Runtime?: string;
  Genre?: string;
  Director?: string;
  Writer?: string;
  Actors?: string;
  Plot?: string;
  Language?: string;
  Country?: string;
  Awards?: string;
  Poster?: string;
  Ratings?: Array<{ Source: string; Value: string }>;
  Metascore?: string;
  imdbRating?: string;
  imdbVotes?: string;
  imdbID?: string;
  Type?: string;
  totalSeasons?: string;
  BoxOffice?: string;
  Production?: string;
  Response?: string;
  Error?: string;
}

/**
 * Normalizes OMDb search result into EHSAAN PLAY MediaItem format
 */
export function normalizeOMDBSearchItem(item: OMDBRawSearchItem): MediaItem {
  const isSeries = item.Type === 'series';
  const type: MediaType = isSeries ? 'tv' : 'movie';
  const rawYear = item.Year ? parseInt(item.Year.substring(0, 4), 10) : NaN;
  const year = isNaN(rawYear) ? 2025 : rawYear;
  const poster = item.Poster && item.Poster !== 'N/A' && item.Poster.startsWith('http') ? item.Poster : '';

  return {
    id: item.imdbID,
     // indicates fallback origin
    type,
    title: item.Title || 'Untitled',
    originalTitle: item.Title || 'Untitled',
    releaseDate: `${year}-01-01`,
    year,
    overview: 'Metadata provided via secondary provider (OMDb).',
    posterUrl: poster,
    fallbackPosterUrl: poster,
    backdropUrl: poster,
    
    voteCount: 0,
    genres: [isSeries ? 'TV Series' : 'Movie'],
    cast: [],
    crew: [],
    providers: [{ name: 'Stream / Purchase', type: 'stream' }],
    imdbId: item.imdbID,
    metadataSource: 'omdb',
  };
}

/**
 * Normalizes rich OMDb details into partial MediaItem format
 */
export function normalizeOMDBDetails(data: OMDBRawDetail): Partial<MediaItem> {
  // Parse runtime in minutes (e.g., "136 min")
  let runtime: number | undefined = undefined;
  if (data.Runtime && data.Runtime !== 'N/A') {
    const match = data.Runtime.match(/(\d+)/);
    if (match) runtime = parseInt(match[1], 10);
  }

  // Parse genres
  const genres: string[] = (data.Genre && data.Genre !== 'N/A')
    ? data.Genre.split(',').map(g => g.trim()).filter(Boolean)
    : [];

  // Parse cast
  const cast: CastMember[] = (data.Actors && data.Actors !== 'N/A')
    ? data.Actors.split(',').map(name => ({
        name: name.trim(),
        character: 'Cast',
      })).filter(c => c.name.length > 0)
    : [];

  // Parse crew (Director + Writer)
  const crew: CrewMember[] = [];
  if (data.Director && data.Director !== 'N/A') {
    data.Director.split(',').forEach(d => {
      const trimmed = d.trim();
      if (trimmed) crew.push({ name: trimmed, job: 'Director' });
    });
  }
  if (data.Writer && data.Writer !== 'N/A') {
    data.Writer.split(',').forEach(w => {
      const trimmed = w.trim();
      if (trimmed && !crew.some(c => c.name === trimmed)) {
        crew.push({ name: trimmed, job: 'Writer' });
      }
    });
  }

  // Parse IMDb rating
  let parsedImdbRating: number | undefined = undefined;
  if (data.imdbRating && data.imdbRating !== 'N/A') {
    const r = parseFloat(data.imdbRating);
    if (!isNaN(r) && r > 0) {
      parsedImdbRating = r;
    }
  }

  // Parse vote count
  let voteCount: number | undefined = undefined;
  if (data.imdbVotes && data.imdbVotes !== 'N/A') {
    const cleaned = data.imdbVotes.replace(/,/g, '');
    const v = parseInt(cleaned, 10);
    if (!isNaN(v)) voteCount = v;
  }

  // Seasons for TV series
  let seasonsCount: number | undefined = undefined;
  if (data.totalSeasons && data.totalSeasons !== 'N/A') {
    const s = parseInt(data.totalSeasons, 10);
    if (!isNaN(s) && s > 0) seasonsCount = s;
  }

  const poster = data.Poster && data.Poster !== 'N/A' && data.Poster.startsWith('http') ? data.Poster : undefined;

  return {
    overview: data.Plot && data.Plot !== 'N/A' ? data.Plot : undefined,
    runtime,
    genres: genres.length > 0 ? genres : undefined,
    cast: cast.length > 0 ? cast : undefined,
    crew: crew.length > 0 ? crew : undefined,
    imdbRating: parsedImdbRating,
    // Note: preserve source of each rating! We assign imdbRating directly, and provide imdbRating fallback only if none exists
    voteCount,
    seasonsCount,
    country: data.Country && data.Country !== 'N/A' ? data.Country : undefined,
    language: data.Language && data.Language !== 'N/A' ? data.Language : undefined,
    productionCompany: data.Production && data.Production !== 'N/A' ? data.Production : undefined,
    boxOffice: data.BoxOffice && data.BoxOffice !== 'N/A' ? data.BoxOffice : undefined,
    imdbId: data.imdbID,
    fallbackPosterUrl: poster,
    metadataSource: 'omdb',
  };
}

/**
 * Execute a resilient HTTP request to OMDb with timeout and circuit breaker
 */
async function fetchOMDBJson<T>(params: Record<string, string>, customApiKey?: string, signal?: AbortSignal): Promise<{ data: T | null; status: number; error?: string }> {
  const apiKey = getEffectiveOMDBKey(customApiKey);
  if (!apiKey) {
    return { data: null, status: 0, error: 'OMDb API key not configured' };
  }

  if (!omdbCircuitBreaker.isAvailable()) {
    return { data: null, status: 503, error: 'OMDb circuit breaker is OPEN' };
  }

  const url = new URL(OMDB_BASE_URL);
  url.searchParams.set('apikey', apiKey);
  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined && val !== null && val !== '') {
      url.searchParams.set(key, val);
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  // Link caller signal if passed
  const onCallerAbort = () => controller.abort();
  if (signal) {
    signal.addEventListener('abort', onCallerAbort);
  }

  try {
    const res = await fetch(url.toString(), { signal: controller.signal });
    clearTimeout(timeoutId);
    if (signal) signal.removeEventListener('abort', onCallerAbort);

    if (res.status === 429) {
      omdbCircuitBreaker.recordFailure(true, 30);
      return { data: null, status: 429, error: 'OMDb rate limit exceeded' };
    }

    if (res.status >= 500) {
      omdbCircuitBreaker.recordFailure(false);
      return { data: null, status: res.status, error: `OMDb server error ${res.status}` };
    }

    if (!res.ok) {
      return { data: null, status: res.status, error: `OMDb HTTP error ${res.status}` };
    }

    const json = await res.json();
    if (json.Response === 'False') {
      // Check if invalid API key
      if (json.Error && json.Error.toLowerCase().includes('invalid api key')) {
        omdbCircuitBreaker.recordFailure(false);
        return { data: null, status: 401, error: json.Error };
      }
      // Valid not-found (e.g. "Movie not found!") does NOT trigger circuit breaker failure
      return { data: json as T, status: 200, error: json.Error };
    }

    omdbCircuitBreaker.recordSuccess();
    return { data: json as T, status: 200 };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (signal) signal.removeEventListener('abort', onCallerAbort);

    const isAbort = err instanceof DOMException && err.name === 'AbortError';
    if (!signal?.aborted) {
      // Record failure on circuit breaker for genuine timeout or network drop
      omdbCircuitBreaker.recordFailure(false);
    }

    return {
      data: null,
      status: 0,
      error: isAbort ? 'Request timed out after 5s' : (err instanceof Error ? err.message : 'Network error'),
    };
  }
}

/**
 * Search OMDb for movies and series
 */
export async function searchOMDB(query: string, customApiKey?: string, signal?: AbortSignal): Promise<MediaItem[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const res = await fetchOMDBJson<{ Search?: OMDBRawSearchItem[]; Response?: string }>(
    { s: trimmed, page: '1' },
    customApiKey,
    signal
  );

  if (!res.data || !Array.isArray(res.data.Search)) {
    return [];
  }

  return res.data.Search
    .filter(item => item.Type === 'movie' || item.Type === 'series')
    .map(normalizeOMDBSearchItem);
}

/**
 * Fetch OMDb details by IMDb ID
 * Note: Never pass a raw OMDb numeric ID here! Strictly requires an IMDb ID (e.g. 'tt0816692')
 */
export async function fetchOMDBDetailsByImdbId(
  imdbId: string,
  customApiKey?: string,
  signal?: AbortSignal
): Promise<Partial<MediaItem> | null> {
  if (!imdbId || !imdbId.startsWith('tt')) {
    return null;
  }

  const res = await fetchOMDBJson<OMDBRawDetail>(
    { i: imdbId, plot: 'full' },
    customApiKey,
    signal
  );

  if (!res.data || res.data.Response === 'False') {
    return null;
  }

  return normalizeOMDBDetails(res.data);
}

export interface ImdbMetadataPreview {
  raw: OMDBRawDetail;
  mediaItem: MediaItem;
  title: string;
  year?: string;
  type: 'movie' | 'series' | 'episode' | 'other';
  typeDisplay: string;
  rated?: string;
  released?: string;
  runtime?: string;
  runtimeMinutes?: number;
  genre?: string;
  genresList: string[];
  director?: string;
  writer?: string;
  actors?: string;
  castList: string[];
  plot?: string;
  language?: string;
  country?: string;
  awards?: string;
  posterUrl?: string;
  ratings: Array<{ source: string; value: string }>;
  metascore?: string;
  imdbRating?: number;
  imdbRatingString?: string;
  imdbVotes?: string;
  imdbId: string;
  totalSeasons?: string;
  boxOffice?: string;
  production?: string;
}

export interface ImdbPreviewFetchResult {
  success: boolean;
  data?: ImdbMetadataPreview;
  error?: string;
  errorCode?: 'INVALID_ID' | 'NOT_FOUND' | 'INVALID_KEY' | 'RATE_LIMIT' | 'TIMEOUT' | 'NETWORK_ERROR' | 'UNKNOWN';
}

function cleanOmdbString(val?: string): string | undefined {
  if (!val || typeof val !== 'string') return undefined;
  const trimmed = val.trim();
  if (trimmed === '' || trimmed === 'N/A' || trimmed === 'null' || trimmed === 'undefined') {
    return undefined;
  }
  return trimmed;
}

/**
 * High-fidelity IMDb link & title ID preview fetcher
 */
export async function fetchImdbPreview(
  imdbId: string,
  customApiKey?: string,
  signal?: AbortSignal
): Promise<ImdbPreviewFetchResult> {
  const cleanId = (imdbId || '').trim().toLowerCase();
  if (!cleanId || !cleanId.startsWith('tt')) {
    return {
      success: false,
      error: 'Invalid IMDb ID format. Must begin with "tt" followed by digits.',
      errorCode: 'INVALID_ID',
    };
  }

  const res = await fetchOMDBJson<OMDBRawDetail>(
    { i: cleanId, plot: 'full' },
    customApiKey,
    signal
  );

  if (!res.data) {
    if (res.status === 429) {
      return {
        success: false,
        error: 'OMDb API rate limit reached. Please wait a moment or configure a custom API key in Settings.',
        errorCode: 'RATE_LIMIT',
      };
    }
    if (res.status === 401 || (res.error && res.error.toLowerCase().includes('invalid api key'))) {
      return {
        success: false,
        error: 'Invalid OMDb API key. Please check your API key in Settings or environment configuration.',
        errorCode: 'INVALID_KEY',
      };
    }
    return {
      success: false,
      error: res.error || 'Network error fetching IMDb data. Please check your internet connection.',
      errorCode: res.error?.includes('timed out') ? 'TIMEOUT' : 'NETWORK_ERROR',
    };
  }

  if (res.data.Response === 'False') {
    const errMsg = res.data.Error || 'Title not found on IMDb/OMDb.';
    const isInvalidKey = errMsg.toLowerCase().includes('invalid api key');
    return {
      success: false,
      error: errMsg,
      errorCode: isInvalidKey ? 'INVALID_KEY' : 'NOT_FOUND',
    };
  }

  const raw = res.data;
  const rawType = (raw.Type || '').toLowerCase();
  let type: 'movie' | 'series' | 'episode' | 'other' = 'movie';
  let typeDisplay = 'Movie';
  if (rawType === 'series') {
    type = 'series';
    typeDisplay = 'TV Series';
  } else if (rawType === 'episode') {
    type = 'episode';
    typeDisplay = 'TV Episode';
  } else if (rawType && rawType !== 'movie') {
    type = 'other';
    typeDisplay = raw.Type || 'Media';
  }

  const title = cleanOmdbString(raw.Title) || 'Untitled';
  const year = cleanOmdbString(raw.Year);
  const rated = cleanOmdbString(raw.Rated);
  const released = cleanOmdbString(raw.Released);
  const runtime = cleanOmdbString(raw.Runtime);
  const genre = cleanOmdbString(raw.Genre);
  const director = cleanOmdbString(raw.Director);
  const writer = cleanOmdbString(raw.Writer);
  const actors = cleanOmdbString(raw.Actors);
  const plot = cleanOmdbString(raw.Plot);
  const language = cleanOmdbString(raw.Language);
  const country = cleanOmdbString(raw.Country);
  const awards = cleanOmdbString(raw.Awards);
  const metascore = cleanOmdbString(raw.Metascore);
  const imdbRatingString = cleanOmdbString(raw.imdbRating);
  const imdbVotes = cleanOmdbString(raw.imdbVotes);
  const totalSeasons = cleanOmdbString(raw.totalSeasons);
  const boxOffice = cleanOmdbString(raw.BoxOffice);
  const production = cleanOmdbString(raw.Production);

  const rawPoster = cleanOmdbString(raw.Poster);
  const posterUrl = rawPoster && rawPoster.startsWith('http') ? rawPoster : undefined;

  let parsedRating: number | undefined = undefined;
  if (imdbRatingString) {
    const num = parseFloat(imdbRatingString);
    if (!isNaN(num) && num > 0) parsedRating = num;
  }

  let runtimeMinutes: number | undefined = undefined;
  if (runtime) {
    const match = runtime.match(/(\d+)/);
    if (match) runtimeMinutes = parseInt(match[1], 10);
  }

  const genresList = genre ? genre.split(',').map(g => g.trim()).filter(Boolean) : [];
  const castList = actors ? actors.split(',').map(a => a.trim()).filter(Boolean) : [];

  const ratings: Array<{ source: string; value: string }> = [];
  if (Array.isArray(raw.Ratings)) {
    raw.Ratings.forEach(r => {
      const src = cleanOmdbString(r.Source);
      const val = cleanOmdbString(r.Value);
      if (src && val) {
        ratings.push({ source: src, value: val });
      }
    });
  }

  // Construct valid MediaItem for EHSAAN PLAY
  const rawYearNum = year ? parseInt(year.substring(0, 4), 10) : NaN;
  const yearNum = !isNaN(rawYearNum) ? rawYearNum : 2025;
  const mediaType: MediaType = type === 'series' ? 'tv' : 'movie';

  const mediaItem: MediaItem = {
    id: cleanId,
    
    type: mediaType,
    title,
    originalTitle: title,
    releaseDate: released || `${yearNum}-01-01`,
    year: yearNum,
    overview: plot || 'No synopsis provided by IMDb.',
    posterUrl: posterUrl || '',
    fallbackPosterUrl: posterUrl || '',
    backdropUrl: posterUrl || '',
    
    imdbRating: parsedRating,
    voteCount: imdbVotes ? parseInt(imdbVotes.replace(/,/g, ''), 10) || 0 : 0,
    genres: genresList.length > 0 ? genresList : [typeDisplay],
    cast: castList.map(name => ({ name, character: 'Cast' })),
    crew: director ? [{ name: director, job: 'Director' }] : [],
    providers: [{ name: 'IMDb', type: 'stream' }],
    imdbId: cleanId,
    metadataSource: 'omdb',
    runtime: runtimeMinutes,
    country,
    language,
    boxOffice,
    productionCompany: production,
  };

  // Build OMDb crew fallback from director & writer strings
  const fallbackCrew: CrewMember[] = [];
  if (director) {
    director.split(',').forEach(d => {
      const cleanDir = d.trim();
      if (cleanDir) fallbackCrew.push({ name: cleanDir, job: 'Director' });
    });
  }
  if (writer) {
    writer.split(',').forEach(w => {
      const cleanW = w.replace(/\([^)]*\)/g, '').trim();
      if (cleanW && !fallbackCrew.some(c => c.name === cleanW)) {
        fallbackCrew.push({ name: cleanW, job: 'Writer' });
      }
    });
  }
  if (fallbackCrew.length > 0) {
    mediaItem.crew = fallbackCrew;
  }

  // Attempt TMDB enrichment for crew, episodes, streaming providers, backdrops & trailers
  try {
    let tmdbRef = await findTMDBByImdbId(cleanId, customApiKey);
    if (!tmdbRef && title && tmdbCircuitBreaker.isAvailable()) {
      try {
        const tmdbSearch = await searchTMDB(title, mediaType, 1, customApiKey);
        if (tmdbSearch && tmdbSearch.length > 0) {
          const match = tmdbSearch.find((r: MediaItem) => Math.abs((r.year || 0) - yearNum) <= 1) || tmdbSearch[0];
          if (match && match.tmdbId) {
            tmdbRef = { id: match.tmdbId, type: match.type || mediaType };
          }
        }
      } catch (err) {
        console.warn('TMDB title search fallback during OMDb enrichment failed:', err);
      }
    }

    if (tmdbRef) {
      const tmdbDetails = await fetchTMDBDetails(tmdbRef.id, tmdbRef.type, customApiKey);
      if (tmdbDetails) {
        mediaItem.tmdbId = tmdbDetails.tmdbId;
        mediaItem.tmdbRating = tmdbDetails.tmdbRating;
        if (tmdbDetails.backdropUrl && tmdbDetails.backdropUrl.length > 5 && !tmdbDetails.backdropUrl.includes('N/A')) {
          mediaItem.backdropUrl = tmdbDetails.backdropUrl;
        }
        if (tmdbDetails.trailerUrl) mediaItem.trailerUrl = tmdbDetails.trailerUrl;
        if (tmdbDetails.genres && tmdbDetails.genres.length > 0) mediaItem.genres = tmdbDetails.genres;
        
        // Enrich Crew with full Directors, Writers, Producers, Creators, Composers
        if (tmdbDetails.crew && tmdbDetails.crew.length > 0) {
          mediaItem.crew = tmdbDetails.crew;
        }
        
        // Enrich Cast with profile pictures and characters
        if (tmdbDetails.cast && tmdbDetails.cast.length > 0) {
          mediaItem.cast = tmdbDetails.cast;
        }

        // Enrich Watch / Streaming Providers (Netflix, Prime, Disney+, Apple TV+, Max, Hulu)
        if (tmdbDetails.providers && tmdbDetails.providers.length > 0) {
          mediaItem.providers = tmdbDetails.providers;
        }

        // Enrich TV Seasons & Detailed Episodes list
        if (tmdbRef.type === 'tv' || mediaType === 'tv') {
          if (tmdbDetails.seasons && tmdbDetails.seasons.length > 0) {
            mediaItem.seasons = tmdbDetails.seasons;
            mediaItem.seasonsCount = tmdbDetails.seasonsCount || tmdbDetails.seasons.length;
          }
          if (tmdbDetails.episodesList && tmdbDetails.episodesList.length > 0) {
            mediaItem.episodesList = tmdbDetails.episodesList;
            mediaItem.episodesCount = tmdbDetails.episodesCount || tmdbDetails.episodesList.length;
          }
        }
      }
    }
  } catch (err) {
    console.warn('IMDb link preview TMDB enrichment failed:', err);
  }

  const preview: ImdbMetadataPreview = {
    raw,
    mediaItem,
    title,
    year,
    type,
    typeDisplay,
    rated,
    released,
    runtime,
    runtimeMinutes,
    genre,
    genresList,
    director,
    writer,
    actors,
    castList,
    plot,
    language,
    country,
    awards,
    posterUrl,
    ratings,
    metascore,
    imdbRating: parsedRating,
    imdbRatingString,
    imdbVotes,
    imdbId: cleanId,
    totalSeasons,
    boxOffice,
    production,
  };

  return {
    success: true,
    data: preview,
  };
}

/**
 * Fetch OMDb details by Title and Year (with optional media type filter)
 */
export async function fetchOMDBDetailsByTitle(
  title: string,
  year?: number,
  type?: MediaType,
  customApiKey?: string,
  signal?: AbortSignal
): Promise<Partial<MediaItem> | null> {
  const trimmed = title.trim();
  if (!trimmed) return null;

  const params: Record<string, string> = {
    t: trimmed,
    plot: 'full',
  };

  if (year && !isNaN(year) && year > 1900) {
    params.y = year.toString();
  }

  if (type === 'tv') {
    params.type = 'series';
  } else if (type === 'movie') {
    params.type = 'movie';
  }

  const res = await fetchOMDBJson<OMDBRawDetail>(params, customApiKey, signal);

  if (!res.data || res.data.Response === 'False') {
    return null;
  }

  return normalizeOMDBDetails(res.data);
}

/**
 * Connection diagnostic test for OMDb
 */
export async function testOMDBConnection(customApiKey?: string): Promise<DiagnosticResult> {
  const apiKey = getEffectiveOMDBKey(customApiKey);
  if (!apiKey) {
    return {
      success: false,
      status: 0,
      message: 'No OMDb API key provided. Set VITE_OMDB_API_KEY in .env or configure custom key.',
      latencyMs: 0,
    };
  }

  const startTime = performance.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    // Test with a canonical lightweight query (e.g., Guardians of the Galaxy Vol 2: tt3896198)
    const res = await fetch(`${OMDB_BASE_URL}?i=tt3896198&apikey=${encodeURIComponent(apiKey)}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const latencyMs = Math.round(performance.now() - startTime);

    if (res.ok) {
      const data = await res.json();
      if (data.Response === 'False') {
        return {
          success: false,
          status: res.status,
          message: `OMDb rejected request: ${data.Error || 'Invalid API key'}`,
          latencyMs,
        };
      }
      return {
        success: true,
        status: res.status,
        message: `Connected successfully (HTTP ${res.status}). OMDb API is active and ready as fallback.`,
        latencyMs,
      };
    } else {
      return {
        success: false,
        status: res.status,
        message: `OMDb returned HTTP ${res.status}: ${res.statusText}`,
        latencyMs,
      };
    }
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const latencyMs = Math.round(performance.now() - startTime);
    const isTimeout = err instanceof DOMException && err.name === 'AbortError';
    return {
      success: false,
      status: 0,
      message: isTimeout ? 'Connection timed out after 5 seconds' : `Network error: ${err instanceof Error ? err.message : 'Unknown'}`,
      latencyMs,
    };
  }
}


export async function testOMDbSearch(customApiKey?: string, query = "Inception"): Promise<DiagnosticResult> {
  const startTime = performance.now();
  try {
    const results = await searchOMDB(query, customApiKey);
    const latencyMs = Math.round(performance.now() - startTime);
    return {
      success: true,
      status: 200,
      message: `Search verified (HTTP 200). Found ${results.length} results for "${query}".`,
      latencyMs,
      resultsCount: results.length,
      endpoint: "/search",
    };
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - startTime);
    return {
      success: false,
      status: 0,
      message: err?.message || "Search test failed",
      latencyMs,
      endpoint: "/search",
    };
  }
}

export { testOMDBConnection as testOMDbConnection };
