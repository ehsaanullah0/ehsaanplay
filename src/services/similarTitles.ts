import { MediaItem } from '../types/movie';
import { fetchTMDBSimilarTitles } from './tmdb';
import { areMediaItemsSame } from '../utils/mediaDedup';

const SIMILAR_CACHE = new Map<string, MediaItem[]>();

function normalizeGenre(genre: string): string {
  const g = genre.trim().toLowerCase();
  if (g === 'science fiction' || g === 'sci-fi & fantasy') return 'sci-fi';
  if (g === 'action & adventure') return 'action';
  if (g === 'war & politics') return 'war';
  return g;
}

function getCacheKey(item: MediaItem): string {
  return `${item.id}::${item.tmdbId || ''}::${item.imdbId || ''}`;
}

export function clearSimilarTitlesCache(): void {
  SIMILAR_CACHE.clear();
}

export function getCachedSimilarTitles(item: MediaItem): MediaItem[] | null {
  return SIMILAR_CACHE.get(getCacheKey(item)) || null;
}

/**
 * Pure taste-matching scorer across local library / cached items.
 * Ranks titles by shared genres, same media format (movie vs tv),
 * overlapping creators/directors/cast, era closeness, and audience rating.
 */
export function rankLocalSimilarTitles(
  currentItem: MediaItem,
  candidates: MediaItem[],
  limit: number = 14
): MediaItem[] {
  const targetGenres = new Set((currentItem.genres || []).map(normalizeGenre).filter(Boolean));
  const targetCrew = new Set(
    (currentItem.crew || []).map((c) => c.name.trim().toLowerCase()).filter(Boolean)
  );
  const targetCast = new Set(
    (currentItem.cast || []).slice(0, 8).map((c) => c.name.trim().toLowerCase()).filter(Boolean)
  );

  const scored: Array<{ item: MediaItem; score: number }> = [];

  for (const candidate of candidates) {
    if (!candidate || !candidate.title || !candidate.posterUrl) continue;
    if (areMediaItemsSame(candidate, currentItem)) continue;

    let score = 0;

    // Prefer same medium (movies with movies, series with series)
    if (candidate.type === currentItem.type) {
      score += 22;
    }

    // Genre overlap
    let sharedGenres = 0;
    for (const g of candidate.genres || []) {
      if (targetGenres.has(normalizeGenre(g))) {
        sharedGenres += 1;
      }
    }
    score += sharedGenres * 26;

    // Creative / talent taste match
    let sharedCrew = 0;
    for (const cr of candidate.crew || []) {
      if (targetCrew.has(cr.name.trim().toLowerCase())) {
        sharedCrew += 1;
      }
    }
    score += Math.min(2, sharedCrew) * 24;

    let sharedCast = 0;
    for (const ca of (candidate.cast || []).slice(0, 8)) {
      if (targetCast.has(ca.name.trim().toLowerCase())) {
        sharedCast += 1;
      }
    }
    score += Math.min(3, sharedCast) * 14;

    // Release era affinity
    if (currentItem.year && candidate.year) {
      const diff = Math.abs(currentItem.year - candidate.year);
      if (diff <= 5) score += 6;
      else if (diff <= 12) score += 3;
    }

    // Quality affinity
    const rating = candidate.imdbRating || candidate.tmdbRating || 0;
    if (rating > 0) {
      score += Math.min(8, rating);
    }

    // Must share at least same medium or a genre/person link when genres are available
    if (targetGenres.size > 0 && sharedGenres === 0 && sharedCrew === 0 && sharedCast === 0) {
      if (candidate.type !== currentItem.type) continue;
      score -= 12;
    }

    if (score > 10) {
      scored.push({ item: candidate, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);

  const deduped: MediaItem[] = [];
  for (const entry of scored) {
    if (deduped.some((existing) => areMediaItemsSame(existing, entry.item))) continue;
    deduped.push(entry.item);
    if (deduped.length >= limit) break;
  }

  return deduped;
}

/**
 * Fetches taste-matched Similar Titles from TMDB, blended cleanly with local library candidates
 * and cached in memory per opened title.
 */
export async function getSimilarTitlesForMedia(
  currentItem: MediaItem,
  localCandidates: MediaItem[] = [],
  customTmdbKey?: string,
  limit: number = 16
): Promise<MediaItem[]> {
  const key = getCacheKey(currentItem);
  const cached = SIMILAR_CACHE.get(key);
  if (cached && cached.length > 0) {
    return cached.slice(0, limit);
  }

  let tmdbResults: MediaItem[] = [];
  try {
    tmdbResults = await fetchTMDBSimilarTitles(currentItem, customTmdbKey, limit);
  } catch {
    tmdbResults = [];
  }

  const localRanked = rankLocalSimilarTitles(currentItem, localCandidates, limit);

  const merged: MediaItem[] = [];
  for (const item of [...tmdbResults, ...localRanked]) {
    if (areMediaItemsSame(item, currentItem)) continue;
    if (merged.some((existing) => areMediaItemsSame(existing, item))) continue;
    merged.push(item);
    if (merged.length >= limit) break;
  }

  if (merged.length > 0) {
    SIMILAR_CACHE.set(key, merged);
  }

  return merged;
}
