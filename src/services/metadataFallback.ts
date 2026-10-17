/**
 * EHSAAN PLAY — Unified Metadata, TMDB Secret Integration & OMDb Engine
 */

import { MediaItem, MediaType } from '../types/movie';
import {
  searchTMDB,
  fetchTMDBDetails,
  findTMDBByImdbId,
  testTMDBConnection,
  isTMDBConfigured,
} from './tmdb';
import {
  searchOMDB,
  fetchOMDBDetailsByImdbId,
  fetchOMDBDetailsByTitle,
  isOMDBConfigured,
} from './omdb';
import { tmdbCircuitBreaker, omdbCircuitBreaker } from './circuitBreaker';
import {
  getCachedMediaItem,
  cacheMediaItem,
  getCachedSearchResults,
  cacheSearchResults,
  deduplicateRequest,
} from './metadataCache';

export interface SearchDiagnosticInfo {
  provider: 'tmdb' | 'omdb' | 'cache' | 'multi';
  query: string;
  attempted: boolean;
  httpStatus: number;
  durationMs: number;
  rawResultsCount: number;
  filteredResultsCount: number;
  renderedResultsCount: number;
  errorMessage?: string;
  fallbackAttempted?: boolean;
  fallbackSucceeded?: boolean;
  fallbackSource?: string;
}

export interface FailoverSearchResult {
  items: MediaItem[];
  source: 'tmdb' | 'omdb' | 'cache' | 'empty';
  error?: string;
  diagnostic?: SearchDiagnosticInfo;
}

export interface FailoverDetailsResult {
  details: Partial<MediaItem>;
  source: 'tmdb' | 'omdb' | 'cache';
  error?: string;
}

export type SearchProviderMode = 'auto' | 'tmdb' | 'omdb';

/**
 * Universal Search with TMDB (Secret Integration) & OMDb Fallback
 */
export async function searchWithFallback(
  query: string,
  tmdbApiKey?: string,
  omdbApiKey?: string,
  signal?: AbortSignal,
  providerPreference: SearchProviderMode = 'auto'
): Promise<FailoverSearchResult> {
  const trimmed = query.trim();
  if (!trimmed) {
    return {
      items: [],
      source: 'empty',
      diagnostic: {
        provider: 'tmdb',
        query: '',
        attempted: false,
        httpStatus: 0,
        durationMs: 0,
        rawResultsCount: 0,
        filteredResultsCount: 0,
        renderedResultsCount: 0,
      },
    };
  }

  const cacheKey = `search_${providerPreference}_${trimmed.toLowerCase()}`;

  return deduplicateRequest<FailoverSearchResult>(cacheKey, async () => {
    // 1. Check local cache first when offline
    const cached = await getCachedSearchResults(trimmed);
    if (cached && cached.length > 0 && typeof navigator !== 'undefined' && !navigator.onLine) {
      return {
        items: cached,
        source: 'cache',
        diagnostic: {
          provider: 'cache',
          query: trimmed,
          attempted: true,
          httpStatus: 200,
          durationMs: 0,
          rawResultsCount: cached.length,
          filteredResultsCount: cached.length,
          renderedResultsCount: cached.length,
        },
      };
    }

    // 2. Primary Choice: Try TMDB Secret Integration if allowed by providerPreference
    const tryTMDB = providerPreference === 'auto' || providerPreference === 'tmdb';
    if (tryTMDB && tmdbCircuitBreaker.isAvailable()) {
      const tmdbStartTime = performance.now();
      try {
        const tmdbResults = await searchTMDB(trimmed, 'multi', 1, tmdbApiKey);
        const duration = Math.round(performance.now() - tmdbStartTime);

        if (tmdbResults && tmdbResults.length > 0) {
          tmdbCircuitBreaker.recordSuccess();
          cacheSearchResults(trimmed, tmdbResults);
          for (const item of tmdbResults) {
            cacheMediaItem(item);
          }
          return {
            items: tmdbResults,
            source: 'tmdb',
            diagnostic: {
              provider: 'tmdb',
              query: trimmed,
              attempted: true,
              httpStatus: 200,
              durationMs: duration,
              rawResultsCount: tmdbResults.length,
              filteredResultsCount: tmdbResults.length,
              renderedResultsCount: tmdbResults.length,
            },
          };
        }
      } catch (err: any) {
        if (signal?.aborted) throw err;
        tmdbCircuitBreaker.recordFailure(err?.message || 'TMDB Search error');
        console.warn('TMDB search failed, falling back if allowed:', err?.message);
      }
    }

    // 3. Fallback / Direct Choice: Try OMDb API
    const tryOMDB = providerPreference === 'auto' || providerPreference === 'omdb';
    if (tryOMDB && omdbCircuitBreaker.isAvailable()) {
      const omdbStartTime = performance.now();
      try {
        const omdbResults = await searchOMDB(trimmed, omdbApiKey, signal);
        const duration = Math.round(performance.now() - omdbStartTime);

        if (omdbResults && omdbResults.length > 0) {
          omdbCircuitBreaker.recordSuccess();
          cacheSearchResults(trimmed, omdbResults);
          for (const item of omdbResults) {
            cacheMediaItem(item);
          }
          return {
            items: omdbResults,
            source: 'omdb',
            diagnostic: {
              provider: 'omdb',
              query: trimmed,
              attempted: true,
              httpStatus: 200,
              durationMs: duration,
              rawResultsCount: omdbResults.length,
              filteredResultsCount: omdbResults.length,
              renderedResultsCount: omdbResults.length,
              fallbackAttempted: tryTMDB,
              fallbackSucceeded: true,
              fallbackSource: 'omdb',
            },
          };
        }
      } catch (err: any) {
        if (signal?.aborted) throw err;
        omdbCircuitBreaker.recordFailure(err?.message || 'OMDb Search error');
      }
    }

    // 4. Return cached results if online queries produced no items
    if (cached && cached.length > 0) {
      return {
        items: cached,
        source: 'cache',
        diagnostic: {
          provider: 'cache',
          query: trimmed,
          attempted: true,
          httpStatus: 200,
          durationMs: 0,
          rawResultsCount: cached.length,
          filteredResultsCount: cached.length,
          renderedResultsCount: cached.length,
        },
      };
    }

    return {
      items: [],
      source: 'empty',
      diagnostic: {
        provider: tryTMDB ? 'tmdb' : 'omdb',
        query: trimmed,
        attempted: true,
        httpStatus: 200,
        durationMs: 0,
        rawResultsCount: 0,
        filteredResultsCount: 0,
        renderedResultsCount: 0,
      },
    };
  });
}

/**
 * Fetch Media Details via TMDB or OMDb
 */
export async function fetchDetailsWithFallback(
  item: MediaItem,
  tmdbApiKey?: string,
  omdbApiKey?: string,
  signal?: AbortSignal
): Promise<FailoverDetailsResult> {
  const cacheKey = `details_${item.id}`;
  return deduplicateRequest<FailoverDetailsResult>(cacheKey, async () => {
    let primaryDetails: Partial<MediaItem> | null = null;
    let activeSource: 'tmdb' | 'omdb' | 'cache' = 'cache';

    // 2. Query TMDB if item has tmdbId, starts with tmdb-, or has an IMDb ID (tt...)
    let targetTmdbId = item.tmdbId;
    let targetType = item.type || 'movie';

    if (!targetTmdbId && item.imdbId && item.imdbId.startsWith('tt')) {
      const found = await findTMDBByImdbId(item.imdbId, tmdbApiKey);
      if (found) {
        targetTmdbId = found.id;
        targetType = found.type;
      }
    }

    // Always attempt TMDB title/year lookup if no tmdbId yet, so TMDB backdrop is fetched even for OMDb items
    if (!targetTmdbId && item.title && tmdbCircuitBreaker.isAvailable()) {
      try {
        const tmdbSearch = await searchTMDB(item.title, item.type || 'multi', 1, tmdbApiKey);
        if (tmdbSearch && tmdbSearch.length > 0) {
          const match = tmdbSearch.find(r =>
            (item.year && r.year) ? Math.abs(r.year - item.year) <= 1 : true
          ) || tmdbSearch[0];
          if (match && match.tmdbId) {
            targetTmdbId = match.tmdbId;
            targetType = match.type || targetType;
          }
        }
      } catch (err) {
        console.warn('TMDB title search lookup for backdrop failed:', err);
      }
    }

    let tmdbDetails: Partial<MediaItem> | null = null;
    if (targetTmdbId || item.id.startsWith('tmdb-') || item.metadataSource === 'tmdb') {
      try {
        tmdbDetails = await fetchTMDBDetails(
          targetTmdbId || item.id,
          targetType,
          tmdbApiKey
        );
        if (tmdbDetails) {
          if (item.metadataSource === 'tmdb' || !primaryDetails) {
            primaryDetails = tmdbDetails;
            activeSource = 'tmdb';
          }
        }
      } catch (err) {
        console.warn('TMDB details fetch failed, falling back:', err);
      }
    }

    // 3. Query OMDb to supplement missing details (ratings, crew, plot, or as primary fallback)
    let omdbDetails: Partial<MediaItem> | null = null;
    const omdbActive = isOMDBConfigured(omdbApiKey);
    if (omdbActive && omdbCircuitBreaker.isAvailable()) {
      try {
        if (item.imdbId && item.imdbId.startsWith('tt')) {
          omdbDetails = await fetchOMDBDetailsByImdbId(item.imdbId, omdbApiKey, signal);
        } else if (item.title) {
          omdbDetails = await fetchOMDBDetailsByTitle(
            item.title,
            item.year,
            item.type,
            omdbApiKey,
            signal
          );
        }
      } catch (err) {
        console.warn('OMDb details lookup error:', err);
      }
    }

    if (!primaryDetails && omdbDetails) {
      primaryDetails = omdbDetails;
      activeSource = 'omdb';
    }

    // Base merged details
    const merged: Partial<MediaItem> = {
      ...primaryDetails,
    };

    // ALWAYS PREFER TMDB FOR BACKDROP IMAGE FOR HIGH QUALITY (even when added from OMDb)
    if (tmdbDetails?.backdropUrl && tmdbDetails.backdropUrl.length > 5 && !tmdbDetails.backdropUrl.includes('N/A')) {
      merged.backdropUrl = tmdbDetails.backdropUrl;
    } else if (omdbDetails?.backdropUrl && omdbDetails.backdropUrl.includes('image.tmdb.org')) {
      merged.backdropUrl = omdbDetails.backdropUrl;
    }

    if (tmdbDetails?.tmdbId && !merged.tmdbId) {
      merged.tmdbId = tmdbDetails.tmdbId;
    }

    if (tmdbDetails?.posterUrl && (!merged.posterUrl || merged.posterUrl.includes('N/A') || merged.posterUrl.length < 5)) {
      merged.posterUrl = tmdbDetails.posterUrl;
    }

    // Cross-merge crew from both TMDB and OMDb if available
    const combinedCrew = [...(primaryDetails?.crew || [])];
    if (omdbDetails?.crew) {
      for (const omdbMember of omdbDetails.crew) {
        if (!combinedCrew.some(c => c.name.toLowerCase() === omdbMember.name.toLowerCase())) {
          combinedCrew.push(omdbMember);
        }
      }
    }
    if (combinedCrew.length > 0) {
      merged.crew = combinedCrew;
    }

    if (!merged.imdbRating && omdbDetails?.imdbRating) {
      merged.imdbRating = omdbDetails.imdbRating;
    }

    // 4. Query Backend Streaming Service (/api/streaming-info) if providers are missing or generic
    if (
      !merged.providers ||
      merged.providers.length === 0 ||
      (merged.providers.length === 1 && (merged.providers[0].name === 'Stream / Purchase' || merged.providers[0].name === 'IMDb'))
    ) {
      try {
        const queryTitle = encodeURIComponent(merged.title || item.title || '');
        const queryYear = merged.year || item.year || '';
        const queryImdbId = merged.imdbId || item.imdbId || '';
        const queryType = merged.type || item.type || 'movie';

        const streamUrl = `/api/streaming-info?title=${queryTitle}&year=${queryYear}&imdbId=${queryImdbId}&type=${queryType}`;
        const streamRes = await fetch(streamUrl);
        if (streamRes.ok) {
          const streamData = await streamRes.json();
          if (streamData.providers && Array.isArray(streamData.providers) && streamData.providers.length > 0) {
            merged.providers = streamData.providers;
          }
        }
      } catch {
        // ignore streaming lookup error
      }
    }

    if (!merged.providers || merged.providers.length === 0) {
      merged.providers = [{ name: 'Stream / VOD Available', type: 'stream' }];
    }

    const finalEnrichedItem: MediaItem = {
      ...item,
      ...merged,
      metadataSource: activeSource === 'tmdb' ? 'tmdb' : 'omdb',
    };

    cacheMediaItem(finalEnrichedItem);
    return { details: finalEnrichedItem, source: activeSource };
  });
}

/**
 * Provider Health Status
 */
export interface ProviderHealthStatus {
  tmdb: {
    name: string;
    state: string;
    message: string;
    isAvailable: boolean;
    isConfigured: boolean;
  };
  omdb: {
    name: string;
    state: string;
    message: string;
    isAvailable: boolean;
    isConfigured: boolean;
  };
}

export function getProvidersHealthStatus(customTmdbKey?: string, customOmdbKey?: string): ProviderHealthStatus {
  const tmdbStatus = tmdbCircuitBreaker.getStatusMessage();
  const tmdbConfigured = isTMDBConfigured();

  const omdbStatus = omdbCircuitBreaker.getStatusMessage();
  const omdbConfigured = isOMDBConfigured(customOmdbKey);

  return {
    tmdb: {
      name: 'TMDB (Secret Integration)',
      state: tmdbStatus.state,
      message: tmdbStatus.message,
      isAvailable: tmdbCircuitBreaker.isAvailable(),
      isConfigured: tmdbConfigured,
    },
    omdb: {
      name: 'OMDb',
      state: omdbStatus.state,
      message: omdbConfigured ? omdbStatus.message : 'Not configured (No API key found)',
      isAvailable: omdbConfigured && omdbCircuitBreaker.isAvailable(),
      isConfigured: omdbConfigured,
    },
  };
}
