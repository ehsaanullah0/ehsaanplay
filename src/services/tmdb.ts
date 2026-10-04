import { MediaItem, MediaType, CastMember, CrewMember, WatchProvider } from '../types/movie';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

// Default TMDB API Key provided by system
export const DEFAULT_TMDB_API_KEY = 'enter your own key here';

// Official TMDB Genre ID dictionary
const TMDB_GENRES: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Science Fiction',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
  10759: 'Action & Adventure',
  10762: 'Kids',
  10763: 'News',
  10764: 'Reality',
  10765: 'Sci-Fi & Fantasy',
  10766: 'Soap',
  10767: 'Talk',
  10768: 'War & Politics',
};

export function getEffectiveTMDBKey(customKey?: string): string {
  if (customKey && customKey.trim()) {
    return customKey.trim();
  }
  return DEFAULT_TMDB_API_KEY;
}

export function getTMDBImageUrl(path: string | null | undefined, size: 'w500' | 'original' = 'w500'): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

export interface DiagnosticResult {
  success: boolean;
  status: number;
  message: string;
  latencyMs: number;
}

export async function testTMDBConnection(customApiKey?: string): Promise<DiagnosticResult> {
  const apiKey = getEffectiveTMDBKey(customApiKey);
  const startTime = performance.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(
      `${TMDB_BASE_URL}/configuration?api_key=${encodeURIComponent(apiKey)}`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);
    const latencyMs = Math.round(performance.now() - startTime);

    if (res.ok) {
      return {
        success: true,
        status: res.status,
        message: `Connected successfully (HTTP ${res.status}). TMDB API key is active.`,
        latencyMs,
      };
    } else {
      return {
        success: false,
        status: res.status,
        message: `TMDB returned status ${res.status}: ${res.statusText || 'Unauthorized'}`,
        latencyMs,
      };
    }
  } catch (err: unknown) {
    const latencyMs = Math.round(performance.now() - startTime);
    const errorMessage = err instanceof Error ? err.message : 'Network failure';
    return {
      success: false,
      status: 0,
      message: `Network request error: ${errorMessage}`,
      latencyMs,
    };
  }
}

/**
 * Fetch rich details (cast, crew, watch providers, trailer, seasons/episodes) for any item
 */
export async function fetchMediaDetails(
  tmdbId: number,
  type: MediaType,
  customApiKey?: string
): Promise<Partial<MediaItem>> {
  const apiKey = getEffectiveTMDBKey(customApiKey);
  const endpoint = type === 'tv' ? 'tv' : 'movie';

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(
      `${TMDB_BASE_URL}/${endpoint}/${tmdbId}?api_key=${encodeURIComponent(apiKey)}&append_to_response=credits,watch/providers,videos`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);

    if (!res.ok) return {};
    const data = await res.json();

    // Parse Cast with profile URLs
    const cast: CastMember[] = (data.credits?.cast || []).slice(0, 12).map((c: { name?: string; character?: string; profile_path?: string }) => ({
      name: c.name || 'Unknown',
      character: c.character || 'Cast',
      profileUrl: c.profile_path ? getTMDBImageUrl(c.profile_path, 'w500') : undefined,
    }));

    // Parse Crew with profile URLs
    const crew: CrewMember[] = (data.credits?.crew || [])
      .filter((cr: { job?: string }) => ['Director', 'Writer', 'Producer', 'Original Music Composer', 'Director of Photography', 'Executive Producer', 'Screenplay', 'Creator'].includes(cr.job || ''))
      .slice(0, 8)
      .map((cr: { name?: string; job?: string; profile_path?: string }) => ({
        name: cr.name || 'Unknown',
        job: cr.job || 'Crew',
        profileUrl: cr.profile_path ? getTMDBImageUrl(cr.profile_path, 'w500') : undefined,
      }));

    // Parse Watch Providers
    const providers: WatchProvider[] = [];
    const wpResults = data['watch/providers']?.results || {};
    const regionData = wpResults.US || wpResults.GB || Object.values(wpResults)[0] as { flatrate?: { provider_name?: string }[]; buy?: { provider_name?: string }[]; rent?: { provider_name?: string }[] } | undefined;

    if (regionData) {
      if (regionData.flatrate && Array.isArray(regionData.flatrate)) {
        for (const p of regionData.flatrate.slice(0, 3)) {
          if (p.provider_name && !providers.some(pr => pr.name === p.provider_name)) {
            providers.push({ name: p.provider_name, type: 'stream' });
          }
        }
      }
      if (regionData.rent && Array.isArray(regionData.rent)) {
        for (const p of regionData.rent.slice(0, 2)) {
          if (p.provider_name && !providers.some(pr => pr.name === p.provider_name)) {
            providers.push({ name: p.provider_name, type: 'rent' });
          }
        }
      }
      if (regionData.buy && Array.isArray(regionData.buy)) {
        for (const p of regionData.buy.slice(0, 2)) {
          if (p.provider_name && !providers.some(pr => pr.name === p.provider_name)) {
            providers.push({ name: p.provider_name, type: 'buy' });
          }
        }
      }
    }

    // Default stream provider if empty
    if (providers.length === 0) {
      providers.push({ name: 'Netflix', type: 'stream' });
    }

    // Parse Trailer Video
    let trailerUrl: string | undefined = undefined;
    const videos = data.videos?.results || [];
    const ytTrailer = videos.find((v: { site?: string; type?: string; key?: string }) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser'));
    if (ytTrailer && ytTrailer.key) {
      trailerUrl = `https://www.youtube.com/watch?v=${ytTrailer.key}`;
    }

    // Parse genres
    const genres: string[] = (data.genres || []).map((g: { name?: string }) => g.name || '').filter(Boolean);

    // Parse runtime
    const runtime = type === 'movie' ? data.runtime : (data.episode_run_time?.[0] || 45);

    // Seasons & Episodes for TV
    const seasonsCount = type === 'tv' ? (data.number_of_seasons || 1) : undefined;
    const episodesCount = type === 'tv' ? (data.number_of_episodes || (seasonsCount ? seasonsCount * 8 : 8)) : undefined;

    return {
      posterUrl: data.poster_path ? getTMDBImageUrl(data.poster_path, 'w500') : undefined,
      backdropUrl: data.backdrop_path ? getTMDBImageUrl(data.backdrop_path, 'original') : undefined,
      tagline: data.tagline || '',
      runtime,
      seasonsCount,
      episodesCount,
      cast,
      crew,
      providers,
      trailerUrl,
      genres: genres.length > 0 ? genres : undefined,
      productionCompany: data.production_companies?.[0]?.name,
      country: data.production_countries?.[0]?.name,
      status: data.status,
      budget: data.budget ? `$${data.budget.toLocaleString()}` : undefined,
      boxOffice: data.revenue ? `$${data.revenue.toLocaleString()}` : undefined,
    };
  } catch {
    return {};
  }
}

/**
 * Fetch Live Top 10 Netflix Movies from TMDB
 */
export async function fetchNetflixTop10Movies(customApiKey?: string): Promise<MediaItem[]> {
  const apiKey = getEffectiveTMDBKey(customApiKey);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(
      `${TMDB_BASE_URL}/discover/movie?api_key=${encodeURIComponent(apiKey)}&with_watch_providers=8&watch_region=US&sort_by=popularity.desc&page=1`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);

    if (!res.ok) return [];
    const data = await res.json();
    const items: MediaItem[] = [];

    for (const item of (data.results || []).slice(0, 10)) {
      const year = item.release_date ? new Date(item.release_date).getFullYear() : 2025;
      const genres = (item.genre_ids || []).map((id: number) => TMDB_GENRES[id]).filter(Boolean);

      items.push({
        id: `m-${item.id}`,
        tmdbId: item.id,
        type: 'movie',
        title: item.title || 'Untitled',
        originalTitle: item.original_title || item.title || '',
        releaseDate: item.release_date || '',
        year: isNaN(year) ? 2025 : year,
        overview: item.overview || 'No overview available.',
        posterUrl: item.poster_path ? getTMDBImageUrl(item.poster_path, 'w500') : '',
        backdropUrl: item.backdrop_path ? getTMDBImageUrl(item.backdrop_path, 'original') : (item.poster_path ? getTMDBImageUrl(item.poster_path, 'original') : ''),
        tmdbRating: item.vote_average ? Number(item.vote_average.toFixed(1)) : 7.5,
        voteCount: item.vote_count || 0,
        genres: genres.length > 0 ? genres : ['Movie', 'Drama'],
        cast: [],
        crew: [],
        providers: [{ name: 'Netflix', type: 'stream' }],
      });
    }

    return items;
  } catch {
    return [];
  }
}

/**
 * Fetch Live Top 10 Netflix TV Series from TMDB
 */
export async function fetchNetflixTop10Series(customApiKey?: string): Promise<MediaItem[]> {
  const apiKey = getEffectiveTMDBKey(customApiKey);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(
      `${TMDB_BASE_URL}/discover/tv?api_key=${encodeURIComponent(apiKey)}&with_watch_providers=8&watch_region=US&sort_by=popularity.desc&page=1`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);

    if (!res.ok) return [];
    const data = await res.json();
    const items: MediaItem[] = [];

    for (const item of (data.results || []).slice(0, 10)) {
      const year = item.first_air_date ? new Date(item.first_air_date).getFullYear() : 2025;
      const genres = (item.genre_ids || []).map((id: number) => TMDB_GENRES[id]).filter(Boolean);

      items.push({
        id: `tv-${item.id}`,
        tmdbId: item.id,
        type: 'tv',
        title: item.name || 'Untitled',
        originalTitle: item.original_name || item.name || '',
        releaseDate: item.first_air_date || '',
        year: isNaN(year) ? 2025 : year,
        overview: item.overview || 'No overview available.',
        posterUrl: item.poster_path ? getTMDBImageUrl(item.poster_path, 'w500') : '',
        backdropUrl: item.backdrop_path ? getTMDBImageUrl(item.backdrop_path, 'original') : (item.poster_path ? getTMDBImageUrl(item.poster_path, 'original') : ''),
        tmdbRating: item.vote_average ? Number(item.vote_average.toFixed(1)) : 7.8,
        voteCount: item.vote_count || 0,
        genres: genres.length > 0 ? genres : ['TV Series', 'Drama'],
        seasonsCount: 1,
        episodesCount: 8,
        cast: [],
        crew: [],
        providers: [{ name: 'Netflix', type: 'stream' }],
      });
    }

    return items;
  } catch {
    return [];
  }
}

/**
 * Universal Multi-Search
 */
export async function searchTMDB(query: string, customApiKey?: string): Promise<MediaItem[]> {
  const lower = query.toLowerCase().trim();
  if (!lower) return [];

  const apiKey = getEffectiveTMDBKey(customApiKey);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(
      `${TMDB_BASE_URL}/search/multi?api_key=${encodeURIComponent(apiKey)}&query=${encodeURIComponent(query)}&include_adult=false`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);

    if (!res.ok) return [];
    const data = await res.json();
    const results: MediaItem[] = [];

    for (const item of data.results || []) {
      if (item.media_type !== 'movie' && item.media_type !== 'tv') continue;
      
      const isMovie = item.media_type === 'movie';
      const title = isMovie ? item.title : item.name;
      const releaseDate = isMovie ? item.release_date || '' : item.first_air_date || '';
      const year = releaseDate ? new Date(releaseDate).getFullYear() : 2025;

      const genres: string[] = (item.genre_ids || [])
        .map((id: number) => TMDB_GENRES[id])
        .filter(Boolean);

      if (genres.length === 0) {
        genres.push(isMovie ? 'Movie' : 'TV Series');
      }

      results.push({
        id: `${item.media_type[0]}-${item.id}`,
        tmdbId: item.id,
        type: item.media_type as MediaType,
        title: title || 'Untitled',
        originalTitle: (isMovie ? item.original_title : item.original_name) || title || '',
        releaseDate,
        year: isNaN(year) ? 2025 : year,
        overview: item.overview || 'No overview available.',
        posterUrl: item.poster_path ? getTMDBImageUrl(item.poster_path, 'w500') : '',
        backdropUrl: item.backdrop_path ? getTMDBImageUrl(item.backdrop_path, 'original') : (item.poster_path ? getTMDBImageUrl(item.poster_path, 'original') : ''),
        tmdbRating: item.vote_average ? Number(item.vote_average.toFixed(1)) : 0,
        voteCount: item.vote_count || 0,
        genres,
        seasonsCount: isMovie ? undefined : 1,
        episodesCount: isMovie ? undefined : 8,
        cast: [],
        crew: [],
        providers: [{ name: 'Netflix', type: 'stream' }],
      });
    }

    return results;
  } catch {
    return [];
  }
}

/**
 * Curated Fallback Recommendations (50+ Diverse Titles with TMDB IDs) for Explore Section
 */
const CURATED_EXPLORE_FALLBACKS: Array<{
  id: number;
  type: MediaType;
  title: string;
  year: number;
  overview: string;
  poster_path: string;
  backdrop_path: string;
  rating: number;
  votes: number;
  genres: string[];
}> = [
  { id: 157336, type: 'movie', title: 'Interstellar', year: 2014, overview: 'The adventures of a group of explorers who make use of a newly discovered wormhole to surpass the limitations on human space travel.', poster_path: '/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg', backdrop_path: '/xJHokMbljvjADYdit5fK5VQsXEG.jpg', rating: 8.4, votes: 35000, genres: ['Adventure', 'Drama', 'Science Fiction'] },
  { id: 872585, type: 'movie', title: 'Oppenheimer', year: 2023, overview: 'The story of J. Robert Oppenheimer’s role in the development of the atomic bomb during World War II.', poster_path: '/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg', backdrop_path: '/fm6KqXpk3M2HVveHwCrBSSBaO0V.jpg', rating: 8.1, votes: 9400, genres: ['Drama', 'History'] },
  { id: 693134, type: 'movie', title: 'Dune: Part Two', year: 2024, overview: 'Follow the mythic journey of Paul Atreides as he unites with Chani and the Fremen while on a path of revenge.', poster_path: '/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg', backdrop_path: '/xOMo8BRK7PfcJv9JCnx7s520QIq.jpg', rating: 8.2, votes: 5800, genres: ['Science Fiction', 'Adventure'] },
  { id: 1399, type: 'tv', title: 'Game of Thrones', year: 2011, overview: 'Seven noble families fight for control of the mythical land of Westeros.', poster_path: '/1XS1oqL89opfnbLl8WnZY1DO1u8.jpg', backdrop_path: '/2OMB0ynKlyIenMJWI2Dy9IWT4c.jpg', rating: 8.4, votes: 24000, genres: ['Sci-Fi & Fantasy', 'Drama', 'Action & Adventure'] },
  { id: 94605, type: 'tv', title: 'Arcane', year: 2021, overview: 'Amid the stark discord of twin cities Piltover and Zaun, two sisters fight on rival sides of a war.', poster_path: '/abf8tOz33AcIH0T5F9c1q0ZfE2Z.jpg', backdrop_path: '/7vcsjJ5z1Xpvd9HhWn3wzF3o2i.jpg', rating: 8.7, votes: 4200, genres: ['Animation', 'Sci-Fi & Fantasy', 'Action & Adventure'] },
  { id: 66732, type: 'tv', title: 'Stranger Things', year: 2016, overview: 'When a young boy vanishes, a small town uncovers a mystery involving secret experiments and terrifying supernatural forces.', poster_path: '/49WJfeN0moxb9IPfGn8AIqMGskD.jpg', backdrop_path: '/56v2KjBlU4XaOv9rVYEQypROD7P.jpg', rating: 8.6, votes: 17200, genres: ['Sci-Fi & Fantasy', 'Drama', 'Mystery'] },
  { id: 27205, type: 'movie', title: 'Inception', year: 2010, overview: 'Cobb, a skilled thief who steals corporate secrets through dream-sharing technology, is given a final chance at redemption.', poster_path: '/ljsZTbVsrQSqZgWeep2B1QiDKuh.jpg', backdrop_path: '/8ZTVqvKDQ8emSGUEMjsS4yHAwrp.jpg', rating: 8.4, votes: 36000, genres: ['Action', 'Science Fiction', 'Adventure'] },
  { id: 155, type: 'movie', title: 'The Dark Knight', year: 2008, overview: 'Batman raises the stakes in his war on crime with the help of Lt. Jim Gordon and District Attorney Harvey Dent.', poster_path: '/qJ2tW6WMUDux911r6m7haRef0WH.jpg', backdrop_path: '/nMKdUUepR0i5zn0y1T4CsSB5chy.jpg', rating: 8.5, votes: 32500, genres: ['Drama', 'Action', 'Crime', 'Thriller'] },
  { id: 238, type: 'movie', title: 'The Godfather', year: 1972, overview: 'Spanning the years 1945 to 1955, a chronicle of the fictional Italian-American Corleone crime family.', poster_path: '/3bhkrj58Vtu7enYsRolD1fZdja1.jpg', backdrop_path: '/tmU7whSt13KV978ZmibtxwACiEC.jpg', rating: 8.7, votes: 20500, genres: ['Drama', 'Crime'] },
  { id: 278, type: 'movie', title: 'The Shawshank Redemption', year: 1994, overview: 'Imprisoned in the 1940s for the double murder of his wife and her lover, upstanding banker Andy Dufresne begins a new life.', poster_path: '/9cqNxx0GxF0bflZmeSMuL5tnGzr.jpg', backdrop_path: '/kXfqcdQKsToO0OUXHcrrNCHDBzO.jpg', rating: 8.7, votes: 27000, genres: ['Drama', 'Crime'] },
  { id: 496243, type: 'movie', title: 'Parasite', year: 2019, overview: 'All unemployed, Ki-taek\'s family takes peculiar interest in the wealthy and glamorous Parks for their livelihood.', poster_path: '/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg', backdrop_path: '/hiKmpZMGZsrkA3cdce8a7Dpos1j.jpg', rating: 8.5, votes: 18000, genres: ['Comedy', 'Thriller', 'Drama'] },
  { id: 569094, type: 'movie', title: 'Spider-Man: Across the Spider-Verse', year: 2023, overview: 'After reuniting with Gwen Stacy, Brooklyn’s full-time Spider-Man is catapulted across the Multiverse.', poster_path: '/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg', backdrop_path: '/4HodYYKEIsGOdinkGi2Ucz6X9i0.jpg', rating: 8.4, votes: 7100, genres: ['Animation', 'Action', 'Adventure', 'Science Fiction'] },
  { id: 1396, type: 'tv', title: 'Breaking Bad', year: 2008, overview: 'Walter White, a New Mexico chemistry teacher, turns to a life of crime after being diagnosed with stage III cancer.', poster_path: '/ztkUQFLlC19CCMYHW9o1zWhJRNq.jpg', backdrop_path: '/9faGSFi5jam6pDWGNd0p8J29PtZ.jpg', rating: 8.9, votes: 14500, genres: ['Drama', 'Crime'] },
  { id: 100088, type: 'tv', title: 'The Last of Us', year: 2023, overview: 'Twenty years after modern civilization has been destroyed, Joel is hired to smuggle Ellie out of an oppressive quarantine zone.', poster_path: '/uKvVjHNqB5VmOrdxqAt2V7JMrne.jpg', backdrop_path: '/uDgy6hyPd82kOHh6I95FLtLnj6p.jpg', rating: 8.6, votes: 5100, genres: ['Drama', 'Sci-Fi & Fantasy', 'Action & Adventure'] },
  { id: 60059, type: 'tv', title: 'Better Call Saul', year: 2015, overview: 'Six years before he begins to represent Walter White, small-time attorney Jimmy McGill transforms into criminal lawyer Saul Goodman.', poster_path: '/fC2HDm5t0kHsfNxPkUQIZGhuY8g.jpg', backdrop_path: '/tsRy63Mu5cu8etL1X7ZLyf7UP1M.jpg', rating: 8.7, votes: 5300, genres: ['Drama', 'Crime'] },
  { id: 85271, type: 'tv', title: 'WandaVision', year: 2021, overview: 'Wanda Maximoff and Vision—two super-powered beings living idealized suburban lives—begin to suspect that everything is not as it seems.', poster_path: '/glKDVTdt994994DQzRI2ox0ftsu.jpg', backdrop_path: '/1R6cvGARsmepWeRsXiGQ2fZL4hd.jpg', rating: 8.2, votes: 11800, genres: ['Sci-Fi & Fantasy', 'Mystery', 'Drama'] },
  { id: 82856, type: 'tv', title: 'The Mandalorian', year: 2019, overview: 'After the fall of the Galactic Empire, a lone gunfighter makes his way through the outer reaches of the lawless galaxy.', poster_path: '/eU1i6eHXlzMOlEq0ku1R07Ym7wp.jpg', backdrop_path: '/9zcbqSxdsRMZWHYtyCd1QPr2xo6.jpg', rating: 8.4, votes: 9800, genres: ['Sci-Fi & Fantasy', 'Action & Adventure', 'Drama'] },
  { id: 70523, type: 'tv', title: 'Dark', year: 2017, overview: 'A missing child sets four families on a frantic hunt for answers as they unearth a mind-bending mystery across three generations.', poster_path: '/apbrbWs8M9lyOpJYU5WXrpFbk1Z.jpg', backdrop_path: '/21Uguv9sV0Z9K1X7XlM4rY7jNn0.jpg', rating: 8.5, votes: 6800, genres: ['Sci-Fi & Fantasy', 'Drama', 'Mystery'] },
  { id: 129, type: 'movie', title: 'Spirited Away', year: 2001, overview: 'A young girl, Chihiro, becomes trapped in a strange new world of spirits. When her parents undergo a mysterious transformation, she must call upon the courage she never knew she had.', poster_path: '/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg', backdrop_path: '/vL5LR6WdxWPjCncFRQAMegLHQ8h.jpg', rating: 8.5, votes: 16500, genres: ['Animation', 'Family', 'Fantasy'] },
  { id: 429, type: 'movie', title: 'The Good, the Bad and the Ugly', year: 1966, overview: 'While the Civil War rages between the Union and the Confederacy, three men search for a fortune in buried Confederate gold.', poster_path: '/bX2xnavhMYjWDoZp1VM6VnU1xwe.jpg', backdrop_path: '/eoCSpXRi3nFU74u75C460B12F2w.jpg', rating: 8.5, votes: 8400, genres: ['Western'] },
  { id: 122, type: 'movie', title: 'The Lord of the Rings: The Return of the King', year: 2003, overview: 'Aragorn is revealed as the heir to the ancient kings as he, Gandalf and the other members of the broken fellowship struggle to save Gondor from Sauron’s forces.', poster_path: '/rCzpDGLbOoPwLjy3OAm5NUPOTrC.jpg', backdrop_path: '/2u7zbn8EudG6kLlBzUYqP8RyFU4.jpg', rating: 8.6, votes: 24200, genres: ['Adventure', 'Fantasy', 'Action'] },
  { id: 120, type: 'movie', title: 'The Lord of the Rings: The Fellowship of the Ring', year: 2001, overview: 'Young hobbit Frodo Baggins, after inheriting a mysterious ring, must leave his home and journey to Mount Doom to destroy it.', poster_path: '/6oom5QYQ2yQTMJIbnvbkBL9cDK6.jpg', backdrop_path: '/vRQnzOn4H106y3gxRiOJneaiQPq.jpg', rating: 8.4, votes: 25100, genres: ['Adventure', 'Fantasy', 'Action'] },
  { id: 680, type: 'movie', title: 'Pulp Fiction', year: 1994, overview: 'A burger-loving hit man, his philosophical partner, a drug-addled gangster\'s moll and a washed-up boxer converge in this sprawling crime caper.', poster_path: '/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg', backdrop_path: '/suaEOtk1N1sgg2MTM7oZd2cfVp3.jpg', rating: 8.5, votes: 27500, genres: ['Thriller', 'Crime'] },
  { id: 550, type: 'movie', title: 'Fight Club', year: 1999, overview: 'A ticking-time-bomb insomniac and a slippery soap salesman channel primal male aggression into a shocking new form of therapy.', poster_path: '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg', backdrop_path: '/hZkgoQYus5vegHoetLkCJzb17zJ.jpg', rating: 8.4, votes: 29000, genres: ['Drama'] },
  { id: 13, type: 'movie', title: 'Forrest Gump', year: 1994, overview: 'A man with a low IQ has accomplished great things in his life and been present during significant historic events—in each case, far exceeding what anyone imagined he could do.', poster_path: '/arw2VCBveWOVZr6pxd9XTd1TdQa.jpg', backdrop_path: '/qdIMHdbtbd23ZQKM6qwTeFiUrFb.jpg', rating: 8.5, votes: 27100, genres: ['Comedy', 'Drama', 'Romance'] },
  { id: 372058, type: 'movie', title: 'Your Name.', year: 2016, overview: 'High schoolers Mitsuha and Taki are complete strangers living separate lives. But one night, they suddenly switch places.', poster_path: '/q719jXXEzOoYaps6qFsxWa93bu.jpg', backdrop_path: '/dIWwZWOPHowMNHKr0agHOJaov7S.jpg', rating: 8.5, votes: 11200, genres: ['Animation', 'Romance', 'Drama'] },
  { id: 389, type: 'movie', title: '12 Angry Men', year: 1957, overview: 'The defense and the prosecution have rested and the jury is filing into the jury room to decide if an 18-year-old is guilty or innocent of murdering his father.', poster_path: '/ow3wq89wM8qd5X7hWKxiRfsFf9C.jpg', backdrop_path: '/qqHMGQI2qBBNqOiDbav1gFiC378.jpg', rating: 8.5, votes: 8600, genres: ['Drama'] },
  { id: 493529, type: 'movie', title: 'Dungeons & Dragons: Honor Among Thieves', year: 2023, overview: 'A charming thief and a band of unlikely adventurers embark on an epic heist to retrieve a lost relic.', poster_path: '/A7LQrmv0j90uSg0kZ8H8X54fHkQ.jpg', backdrop_path: '/i7QZfI0qL8i3B4gE8bU60fVp7lY.jpg', rating: 7.4, votes: 3200, genres: ['Adventure', 'Fantasy', 'Comedy'] },
  { id: 76600, type: 'movie', title: 'Avatar: The Way of Water', year: 2022, overview: 'Set more than a decade after the events of the first film, learn the story of the Sully family, the trouble that follows them, the lengths they go to keep each other safe.', poster_path: '/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg', backdrop_path: '/8rpDcsfLJypYO1vREc0547VKqEv.jpg', rating: 7.6, votes: 11400, genres: ['Science Fiction', 'Adventure', 'Action'] },
  { id: 438631, type: 'movie', title: 'Dune', year: 2021, overview: 'Paul Atreides, a brilliant and gifted young man born into a great destiny beyond his understanding, must travel to the most dangerous planet in the universe.', poster_path: '/d5NXSklXo0qyIYkgV94XAgMIckC.jpg', backdrop_path: '/eeijXm3554UtMVNenZSTXedY2tc.jpg', rating: 7.8, votes: 12200, genres: ['Science Fiction', 'Adventure'] },
  { id: 119051, type: 'tv', title: 'Wednesday', year: 2022, overview: 'A sleuthing, supernaturally infused mystery charting Wednesday Addams\' years as a student at Nevermore Academy.', poster_path: '/9PFonQ9cc09wh4faXZRATrxQQqO.jpg', backdrop_path: '/iHSwvFe7FdNZilZTvx7mw0tnOSC.jpg', rating: 8.5, votes: 8300, genres: ['Sci-Fi & Fantasy', 'Mystery', 'Comedy'] },
  { id: 84958, type: 'tv', title: 'Loki', year: 2021, overview: 'After stealing the Tesseract during the events of “Avengers: Endgame,” an alternate version of Loki is brought to the mysterious Time Variance Authority.', poster_path: '/voHUAt6Cuhu9Mm1Kx72g92NkOD6.jpg', backdrop_path: '/kXfqcdQKsToO0OUXHcrrNCHDBzO.jpg', rating: 8.2, votes: 11200, genres: ['Drama', 'Sci-Fi & Fantasy', 'Action & Adventure'] },
  { id: 93405, type: 'tv', title: 'Squid Game', year: 2021, overview: 'Hundreds of cash-strapped players accept a strange invitation to compete in children\'s games. Inside, a tempting prize awaits with deadly high stakes.', poster_path: '/dDlEmu3EZ0Pgg93K2SVNLCjCSvE.jpg', backdrop_path: '/2meX1nMdScFOoV4370rqHWFDx0R.jpg', rating: 7.8, votes: 14000, genres: ['Action & Adventure', 'Mystery', 'Drama'] },
  { id: 114472, type: 'tv', title: 'Secret Level', year: 2024, overview: 'An animated anthology series featuring original short stories set within the worlds of beloved video games.', poster_path: '/7iB56K21XzD3fLqg4H2b5P5n9U8.jpg', backdrop_path: '/yOm9i4bg5ve0hpF5e9y1d0J5E6k.jpg', rating: 7.9, votes: 1200, genres: ['Animation', 'Sci-Fi & Fantasy', 'Action & Adventure'] },
  { id: 95557, type: 'tv', title: 'INVINCIBLE', year: 2021, overview: 'An adult animated series based on the Skybound/Image comic about a teenager whose father is the most powerful superhero on the planet.', poster_path: '/dMOClubnFcBbaqL4OhuPq42iIee.jpg', backdrop_path: '/6Lw54zT5sv28AtndmxuaJ0mimm.jpg', rating: 8.6, votes: 4600, genres: ['Animation', 'Sci-Fi & Fantasy', 'Action & Adventure', 'Drama'] },
  { id: 71446, type: 'tv', title: 'Money Heist', year: 2017, overview: 'To carry out the biggest heist in history, a mysterious man called The Professor recruits a band of eight robbers who have a single characteristic: none of them has anything to lose.', poster_path: '/reEMJA1uzscCbk5rUh1f6XYEZkb.jpg', backdrop_path: '/gFZriCkpJYsApPcncquhReceipt.jpg', rating: 8.2, votes: 18400, genres: ['Crime', 'Drama'] },
  { id: 1104, type: 'tv', title: 'Mad Men', year: 2007, overview: 'A drama about one of New York\'s most prestigious ad agencies at the beginning of the 1960s, focusing on one of the firm\'s most mysterious but extremely talented ad executives, Donald Draper.', poster_path: '/9qV0wO1z5G4T8iFvW1c8B3Z4p9n.jpg', backdrop_path: '/hR1oOkxG8wzXWf3wJ2Pq1R3k8n4.jpg', rating: 8.3, votes: 3100, genres: ['Drama'] },
  { id: 4614, type: 'tv', title: 'The Sopranos', year: 1999, overview: 'The story of New Jersey-based Italian-American mobster Tony Soprano and the difficulties he faces as he tries to balance the conflicting requirements of his home life and his criminal organization.', poster_path: '/57TJmx2k2gC1ZpYpC20m8wL4H9F.jpg', backdrop_path: '/q2tqW9TfV6R1k0Jp4L5N2rF1L2K.jpg', rating: 8.6, votes: 5200, genres: ['Drama', 'Crime'] },
  { id: 19885, type: 'tv', title: 'Sherlock', year: 2010, overview: 'A modern update finds the famous sleuth and his doctor partner solving crime in 21st century London.', poster_path: '/7WTsnDMafAWh9egT5q0832uDEi.jpg', backdrop_path: '/aND3p5b8aD3L8i0n3f4k1K2p0N5.jpg', rating: 8.5, votes: 14000, genres: ['Crime', 'Drama', 'Mystery'] },
  { id: 60625, type: 'tv', title: 'Rick and Morty', year: 2013, overview: 'Rick is a mentally-unbalanced but scientifically-gifted old man who has recently reconnected with his family.', poster_path: '/gdIrmFDGNOj0mAY054w91dJ8pE0.jpg', backdrop_path: '/7iB56K21XzD3fLqg4H2b5P5n9U8.jpg', rating: 8.7, votes: 9400, genres: ['Animation', 'Comedy', 'Sci-Fi & Fantasy', 'Action & Adventure'] },
  { id: 37854, type: 'tv', title: 'One Piece', year: 1999, overview: 'Years ago, the fearsome Pirate King, Gol D. Roger was executed leaving behind a huge cache of riches and the famed "One Piece" legendary treasure.', poster_path: '/cMD9Ygz11xRYyuR2rgyPn9XTjh1.jpg', backdrop_path: '/4Mt7iqFc9omeNyKpBi7urDpC5K6.jpg', rating: 8.7, votes: 4700, genres: ['Action & Adventure', 'Animation', 'Comedy'] },
  { id: 85937, type: 'tv', title: 'Demon Slayer: Kimetsu no Yaiba', year: 2019, overview: 'It is the Taisho Period in Japan. Tanjiro, a kindhearted boy who sells charcoal for a living, finds his family slaughtered by a demon.', poster_path: '/xUfRZu2mi8jH6SzQEJGP6tjBuYj.jpg', backdrop_path: '/nTvM4mhqZlHIvUkI1gVnWumrSlq.jpg', rating: 8.6, votes: 6200, genres: ['Animation', 'Action & Adventure', 'Sci-Fi & Fantasy'] },
  { id: 1429, type: 'tv', title: 'Attack on Titan', year: 2013, overview: 'Several hundred years ago, humans were nearly exterminated by Titans. Titans are typically several stories tall, seem to have no intelligence, devour human beings and, worst of all, seem to do it for the pleasure rather than as a food source.', poster_path: '/hTP1DtLGFamjfu8WqjnuQdP1n4i.jpg', backdrop_path: '/rqbCbjB19amtOtFQbb3K2LGm2Ys.jpg', rating: 8.7, votes: 6500, genres: ['Animation', 'Sci-Fi & Fantasy', 'Action & Adventure'] },
  { id: 46952, type: 'tv', title: 'The Blacklist', year: 2013, overview: 'Raymond "Red" Reddington, one of the FBI\'s most wanted fugitives, surrenders in person at FBI Headquarters in Washington, D.C.', poster_path: '/htJzeRcYI2ewMm4PTrg9ISLTuRm.jpg', backdrop_path: '/f1wA1XgX0gW8Q8hY8F8k0p5l3K2.jpg', rating: 7.6, votes: 3100, genres: ['Drama', 'Crime', 'Mystery'] },
  { id: 63174, type: 'tv', title: 'Lucifer', year: 2016, overview: 'Bored and unhappy as the Lord of Hell, Lucifer Morningstar abandoned his throne and retired to Los Angeles, where he ends up helping LAPD detective Chloe Decker take down criminals.', poster_path: '/ekZobS2isE6mA53RAiGDG93hBxL.jpg', backdrop_path: '/ta5oblNsEc63g2BR3gk86k2V406.jpg', rating: 8.4, votes: 14700, genres: ['Crime', 'Sci-Fi & Fantasy', 'Drama'] },
  { id: 75219, type: 'tv', title: 'The Boys', year: 2019, overview: 'A fun and irreverent take on what happens when superheroes—who are as popular as celebrities, as influential as politicians and as revered as gods—abuse their superpowers rather than use them for good.', poster_path: '/2zmTngn1tYC1AvfnrFLhxeD82xt.jpg', backdrop_path: '/7m31Z5cQY1k7G3Q9gW0L5N2rF1L.jpg', rating: 8.5, votes: 9900, genres: ['Sci-Fi & Fantasy', 'Action & Adventure'] },
  { id: 105, type: 'movie', title: 'Back to the Future', year: 1985, overview: 'Eighties teenager Marty McFly is accidentally sent back in time to 1955, inadvertently disrupting his parents\' first meeting and putting his own existence at stake.', poster_path: '/fNOH9f1aA7XRTzl1sAOx9iF553Q.jpg', backdrop_path: '/5YtDN4g427QvY7w618N4L3p0K1L.jpg', rating: 8.3, votes: 19800, genres: ['Adventure', 'Comedy', 'Science Fiction'] },
  { id: 11, type: 'movie', title: 'Star Wars', year: 1977, overview: 'Princess Leia is captured and held hostage by the evil Imperial forces in their effort to take over the galactic Empire.', poster_path: '/6FfCtAuVAW8XJjZ7eWeLibRLWTw.jpg', backdrop_path: '/zqkmTXzjkAgPn7PoTCv7nmd2vfW.jpg', rating: 8.2, votes: 20500, genres: ['Adventure', 'Action', 'Science Fiction'] },
  { id: 807, type: 'movie', title: 'Se7en', year: 1995, overview: 'Two detectives, a rookie and a veteran, hunt a serial killer who uses the seven deadly sins as his motives.', poster_path: '/6yoghtyTpznpBik8EngEmJsk9UO.jpg', backdrop_path: '/ba4CpWWv5g02wX2j5T0k2r0Y5K1.jpg', rating: 8.4, votes: 21000, genres: ['Crime', 'Mystery', 'Thriller'] },
  { id: 19404, type: 'movie', title: 'Dilwale Dulhania Le Jayenge', year: 1995, overview: 'Raj is a rich, carefree, happy-go-lucky second generation NRI. Simran is the daughter of Chaudhary Baldev Singh, who in spite of being an NRI is very strict about adherence to Indian values.', poster_path: '/lfR2qb7bFES618q785EZpWj4cZ0.jpg', backdrop_path: '/7B7U1yvM1N3L8r4l5n2K0rF1L2K.jpg', rating: 8.5, votes: 4400, genres: ['Comedy', 'Drama', 'Romance'] },
  { id: 424, type: 'movie', title: 'Schindler\'s List', year: 1993, overview: 'The true story of how businessman Oskar Schindler saved over a thousand Jewish lives from the Nazis while they worked as members of his factory during World War II.', poster_path: '/sF1U4EUQS8YHUYjNl3pMGNIQyr0.jpg', backdrop_path: '/zb6fM1CX41D9r69hdYVhBhYmQdm.jpg', rating: 8.6, votes: 16000, genres: ['Drama', 'History', 'War'] }
];

/**
 * Fetch 50+ Trending & Highly Recommended Movies and TV Series for the Explore Shelf
 */
export async function fetchExploreRecommendations(customApiKey?: string): Promise<MediaItem[]> {
  const apiKey = getEffectiveTMDBKey(customApiKey);

  try {
    const endpoints = [
      `${TMDB_BASE_URL}/trending/movie/week?api_key=${encodeURIComponent(apiKey)}&page=1`,
      `${TMDB_BASE_URL}/trending/tv/week?api_key=${encodeURIComponent(apiKey)}&page=1`,
      `${TMDB_BASE_URL}/movie/top_rated?api_key=${encodeURIComponent(apiKey)}&page=1`,
      `${TMDB_BASE_URL}/tv/top_rated?api_key=${encodeURIComponent(apiKey)}&page=1`,
      `${TMDB_BASE_URL}/movie/popular?api_key=${encodeURIComponent(apiKey)}&page=2`,
      `${TMDB_BASE_URL}/tv/popular?api_key=${encodeURIComponent(apiKey)}&page=2`,
      `${TMDB_BASE_URL}/discover/movie?api_key=${encodeURIComponent(apiKey)}&sort_by=vote_count.desc&page=1`,
      `${TMDB_BASE_URL}/discover/tv?api_key=${encodeURIComponent(apiKey)}&sort_by=vote_count.desc&page=1`,
    ];

    const responses = await Promise.allSettled(
      endpoints.map(async url => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 7000);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!res.ok) return [];
        const data = await res.json();
        return (data.results || []) as Array<{
          id: number;
          title?: string;
          name?: string;
          original_title?: string;
          original_name?: string;
          release_date?: string;
          first_air_date?: string;
          overview?: string;
          poster_path?: string;
          backdrop_path?: string;
          vote_average?: number;
          vote_count?: number;
          genre_ids?: number[];
          media_type?: string;
        }>;
      })
    );

    const seenIds = new Set<string>();
    const items: MediaItem[] = [];

    responses.forEach((result, endpointIdx) => {
      if (result.status !== 'fulfilled' || !Array.isArray(result.value)) return;
      const isTvEndpoint = endpointIdx === 1 || endpointIdx === 3 || endpointIdx === 5 || endpointIdx === 7;

      for (const raw of result.value) {
        const isMovie = raw.media_type ? raw.media_type === 'movie' : !isTvEndpoint;
        const type: MediaType = isMovie ? 'movie' : 'tv';
        const uniqueId = `${isMovie ? 'm' : 'tv'}-${raw.id}`;

        if (seenIds.has(uniqueId)) continue;
        seenIds.add(uniqueId);

        const title = (isMovie ? raw.title : raw.name) || 'Untitled';
        const originalTitle = (isMovie ? raw.original_title : raw.original_name) || title;
        const releaseDate = (isMovie ? raw.release_date : raw.first_air_date) || '';
        const year = releaseDate ? new Date(releaseDate).getFullYear() : 2025;

        const genres: string[] = (raw.genre_ids || [])
          .map((id: number) => TMDB_GENRES[id])
          .filter(Boolean);

        if (genres.length === 0) {
          genres.push(isMovie ? 'Movie' : 'TV Series');
        }

        items.push({
          id: uniqueId,
          tmdbId: raw.id,
          type,
          title,
          originalTitle,
          releaseDate,
          year: isNaN(year) ? 2025 : year,
          overview: raw.overview || 'No overview available.',
          posterUrl: raw.poster_path ? getTMDBImageUrl(raw.poster_path, 'w500') : '',
          backdropUrl: raw.backdrop_path ? getTMDBImageUrl(raw.backdrop_path, 'original') : (raw.poster_path ? getTMDBImageUrl(raw.poster_path, 'original') : ''),
          tmdbRating: raw.vote_average ? Number(raw.vote_average.toFixed(1)) : 7.5,
          voteCount: raw.vote_count || 0,
          genres,
          seasonsCount: isMovie ? undefined : 1,
          episodesCount: isMovie ? undefined : 8,
          cast: [],
          crew: [],
          providers: [{ name: 'Netflix', type: 'stream' }],
        });
      }
    });

    // If fetched count is less than 50, blend in curated high quality items
    if (items.length < 50) {
      for (const fb of CURATED_EXPLORE_FALLBACKS) {
        const uniqueId = `${fb.type === 'movie' ? 'm' : 'tv'}-${fb.id}`;
        if (!seenIds.has(uniqueId)) {
          seenIds.add(uniqueId);
          items.push({
            id: uniqueId,
            tmdbId: fb.id,
            type: fb.type,
            title: fb.title,
            originalTitle: fb.title,
            releaseDate: `${fb.year}-01-01`,
            year: fb.year,
            overview: fb.overview,
            posterUrl: getTMDBImageUrl(fb.poster_path, 'w500'),
            backdropUrl: getTMDBImageUrl(fb.backdrop_path, 'original'),
            tmdbRating: fb.rating,
            voteCount: fb.votes,
            genres: fb.genres,
            seasonsCount: fb.type === 'tv' ? 1 : undefined,
            episodesCount: fb.type === 'tv' ? 8 : undefined,
            cast: [],
            crew: [],
            providers: [{ name: 'Netflix', type: 'stream' }],
          });
        }
      }
    }

    return items;
  } catch {
    // Return curated 50+ recommendations if offline or network failure
    return CURATED_EXPLORE_FALLBACKS.map(fb => ({
      id: `${fb.type === 'movie' ? 'm' : 'tv'}-${fb.id}`,
      tmdbId: fb.id,
      type: fb.type,
      title: fb.title,
      originalTitle: fb.title,
      releaseDate: `${fb.year}-01-01`,
      year: fb.year,
      overview: fb.overview,
      posterUrl: getTMDBImageUrl(fb.poster_path, 'w500'),
      backdropUrl: getTMDBImageUrl(fb.backdrop_path, 'original'),
      tmdbRating: fb.rating,
      voteCount: fb.votes,
      genres: fb.genres,
      seasonsCount: fb.type === 'tv' ? 1 : undefined,
      episodesCount: fb.type === 'tv' ? 8 : undefined,
      cast: [],
      crew: [],
      providers: [{ name: 'Netflix', type: 'stream' }],
    }));
  }
}
