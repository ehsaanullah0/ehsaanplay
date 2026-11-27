/**
 * Builds a safe URL to the official IMDb ratings page for a title.
 * Uses the exact IMDb title ID (`/title/tt.../ratings/`) when available,
 * and falls back to IMDb title search when an IMDb ID has not been hydrated yet.
 */
export function getImdbRatingPageUrl(item: {
  imdbId?: string;
  title?: string;
  year?: number | string;
}): string {
  const cleanId = item.imdbId?.trim();
  if (cleanId && /^tt\d+$/i.test(cleanId)) {
    return `https://www.imdb.com/title/${cleanId}/ratings/`;
  }
  const query = [item.title, item.year].filter(Boolean).join(' ').trim();
  if (query) {
    return `https://www.imdb.com/find/?q=${encodeURIComponent(query)}&s=tt`;
  }
  return 'https://www.imdb.com/';
}
