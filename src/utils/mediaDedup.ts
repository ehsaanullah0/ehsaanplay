import { MediaItem, PersonalMediaState, CustomList } from '../types/movie';

export function normalizeMediaTitle(title?: string): string {
  return (title || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/[^a-z0-9]/g, '');
}

export function areMediaItemsSame(a?: MediaItem | null, b?: MediaItem | null): boolean {
  if (!a || !b) return false;
  // Exact ID match
  if (a.id && b.id && a.id === b.id) return true;
  // IMDb ID match
  if (a.imdbId && b.imdbId && a.imdbId.startsWith('tt') && a.imdbId === b.imdbId) return true;
  // TMDB ID match
  if (a.tmdbId && b.tmdbId && a.tmdbId === b.tmdbId && (a.type || 'movie') === (b.type || 'movie')) return true;
  // Cross ID check (e.g. a.id is tt... and b.imdbId is tt...)
  if (a.id && b.imdbId && a.id === b.imdbId) return true;
  if (b.id && a.imdbId && b.id === a.imdbId) return true;
  if (a.id && b.tmdbId && a.id === `tmdb-${b.type || 'movie'}-${b.tmdbId}`) return true;
  if (b.id && a.tmdbId && b.id === `tmdb-${a.type || 'movie'}-${a.tmdbId}`) return true;
  // Title & year match
  const normA = normalizeMediaTitle(a.title);
  const normB = normalizeMediaTitle(b.title);
  if (normA && normB && normA === normB) {
    const typeA = a.type || 'movie';
    const typeB = b.type || 'movie';
    if (typeA === typeB) {
      if (!a.year || !b.year || Math.abs(a.year - b.year) <= 1) {
        return true;
      }
    }
  }
  return false;
}

export function getCanonicalKeyForItem(item: MediaItem): string {
  if (item.imdbId && item.imdbId.startsWith('tt')) {
    return item.imdbId;
  }
  if (item.tmdbId) {
    return `tmdb-${item.type || 'movie'}-${item.tmdbId}`;
  }
  if (item.id && (item.id.startsWith('tt') || item.id.startsWith('tmdb-'))) {
    return item.id;
  }
  const cleanTitle = normalizeMediaTitle(item.title);
  if (cleanTitle && item.year) {
    return `${item.type || 'movie'}-${cleanTitle}-${item.year}`;
  }
  return item.id || `unknown-${Math.random()}`;
}

export function hasStateInteraction(s?: Partial<PersonalMediaState> | null): boolean {
  if (!s) return false;
  if (s.inWatchlist || s.isWatched || s.isFavorite) return true;
  if (s.progressPercent !== undefined && s.progressPercent > 0) return true;
  if (s.personalRating !== undefined && s.personalRating > 0) return true;
  if (s.ratingTag) return true;
  if (s.notes && s.notes.trim().length > 0) return true;
  if (s.tvProgress?.completedEpisodes && Object.values(s.tvProgress.completedEpisodes).some(Boolean)) {
    return true;
  }
  return false;
}

export function getStateTimestamp(s?: Partial<PersonalMediaState> | null): number {
  if (!s) return 0;
  const candidates = [s.updatedAt, s.lastWatchedAt, s.favoritedAt, s.addedAt];
  let maxMs = 0;
  for (const val of candidates) {
    if (!val) continue;
    const ms = new Date(val).getTime();
    if (!isNaN(ms) && ms > maxMs) {
      maxMs = ms;
    }
  }
  return maxMs;
}

export function findMediaItemByIdOrAlias(
  id: string,
  mediaList: MediaItem[]
): MediaItem | undefined {
  if (!id) return undefined;
  const exact = mediaList.find(m => m.id === id);
  if (exact) return exact;

  const lower = id.toLowerCase();
  return mediaList.find(m => {
    if (m.id?.toLowerCase() === lower) return true;
    if (m.imdbId && m.imdbId.toLowerCase() === lower) return true;
    if (m.tmdbId && `tmdb-${m.type || 'movie'}-${m.tmdbId}`.toLowerCase() === lower) return true;
    return false;
  });
}

export function resolveStateForMediaItem(
  item: MediaItem,
  states: Record<string, PersonalMediaState>,
  mediaList?: MediaItem[]
): PersonalMediaState | undefined {
  if (!item || !states) return undefined;
  const candidateKeys: string[] = [];
  const pushKey = (k?: string) => {
    if (k && !candidateKeys.includes(k)) candidateKeys.push(k);
  };

  pushKey(item.id);
  if (item.imdbId) pushKey(item.imdbId);
  if (item.tmdbId) pushKey(`tmdb-${item.type || 'movie'}-${item.tmdbId}`);

  if (mediaList && mediaList.length > 0) {
    for (const m of mediaList) {
      if (areMediaItemsSame(m, item)) {
        pushKey(m.id);
        if (m.imdbId) pushKey(m.imdbId);
        if (m.tmdbId) pushKey(`tmdb-${m.type || 'movie'}-${m.tmdbId}`);
      }
    }
  }

  let best: PersonalMediaState | undefined;
  let bestTime = -1;
  let bestActive = false;

  for (const key of candidateKeys) {
    const candidate = states[key];
    if (!candidate) continue;
    const t = getStateTimestamp(candidate);
    const active = hasStateInteraction(candidate);
    if (!best || t > bestTime || (t === bestTime && active && !bestActive)) {
      best = candidate;
      bestTime = t;
      bestActive = active;
    }
  }

  return best;
}

export function deduplicateMediaItemsAndStates(
  rawMedia: MediaItem[],
  rawStates: Record<string, PersonalMediaState>,
  rawLists: CustomList[] = []
): { cleanMedia: MediaItem[]; cleanStates: Record<string, PersonalMediaState>; cleanLists: CustomList[] } {
  const canonicalList: MediaItem[] = [];
  const idToCanonical = new Map<string, string>();

  // 1. Group and merge media items into canonical entries
  for (const item of rawMedia) {
    if (!item || !item.id) continue;

    // Check if item matches any existing item in canonicalList
    const existingIndex = canonicalList.findIndex(existing => areMediaItemsSame(existing, item));

    if (existingIndex === -1) {
      // First time seeing this title: prefer IMDb ID (tt...) if present, then tmdb ID, then existing ID
      const canonicalId = (item.imdbId && item.imdbId.startsWith('tt'))
        ? item.imdbId
        : (item.tmdbId ? `tmdb-${item.type || 'movie'}-${item.tmdbId}` : item.id);

      const canonicalItem: MediaItem = {
        ...item,
        id: canonicalId,
      };

      canonicalList.push(canonicalItem);
      idToCanonical.set(item.id, canonicalId);
      if (item.imdbId) idToCanonical.set(item.imdbId, canonicalId);
      if (item.tmdbId) idToCanonical.set(`tmdb-${item.type || 'movie'}-${item.tmdbId}`, canonicalId);
      const titleKey = `${item.type || 'movie'}-${normalizeMediaTitle(item.title)}-${item.year}`;
      idToCanonical.set(titleKey, canonicalId);
    } else {
      // Duplicate found! Merge into existing canonical item
      const existing = canonicalList[existingIndex];
      const canonicalId = existing.id;

      // Register all aliases of this duplicate
      idToCanonical.set(item.id, canonicalId);
      if (item.imdbId) idToCanonical.set(item.imdbId, canonicalId);
      if (item.tmdbId) idToCanonical.set(`tmdb-${item.type || 'movie'}-${item.tmdbId}`, canonicalId);
      const titleKey = `${item.type || 'movie'}-${normalizeMediaTitle(item.title)}-${item.year}`;
      idToCanonical.set(titleKey, canonicalId);

      // Merge rich properties (prefer better poster, overview, cast, seasons)
      const merged: MediaItem = {
        ...existing,
        id: canonicalId,
        imdbId: existing.imdbId || item.imdbId,
        tmdbId: existing.tmdbId || item.tmdbId,
        posterUrl: (existing.posterUrl && !existing.posterUrl.includes('N/A') && existing.posterUrl.length > 5)
          ? existing.posterUrl
          : (item.posterUrl || existing.posterUrl),
        fallbackPosterUrl: existing.fallbackPosterUrl || item.fallbackPosterUrl,
        backdropUrl: (existing.backdropUrl && !existing.backdropUrl.includes('N/A') && existing.backdropUrl.length > 5)
          ? existing.backdropUrl
          : (item.backdropUrl || existing.backdropUrl),
        overview: existing.overview && existing.overview.length > 20
          ? existing.overview
          : (item.overview || existing.overview),
        genres: Array.from(new Set([...(existing.genres || []), ...(item.genres || [])])),
        cast: existing.cast && existing.cast.length > 0 ? existing.cast : (item.cast || []),
        crew: existing.crew && existing.crew.length > 0 ? existing.crew : (item.crew || []),
        providers: existing.providers && existing.providers.length > 0 ? existing.providers : (item.providers || []),
        seasonsCount: Math.max(existing.seasonsCount || 0, item.seasonsCount || 0) || undefined,
        episodesCount: Math.max(existing.episodesCount || 0, item.episodesCount || 0) || undefined,
        seasons: existing.seasons && existing.seasons.length > 0 ? existing.seasons : item.seasons,
      };

      canonicalList[existingIndex] = merged;
    }
  }

  // 2. Consolidate PersonalMediaStates for all duplicate alias keys
  const cleanStates: Record<string, PersonalMediaState> = {};
  for (const [id, st] of Object.entries(rawStates)) {
    if (!st) continue;
    let canonicalId = idToCanonical.get(id);
    if (!canonicalId) {
      const matched = canonicalList.find(m =>
        m.id === id ||
        (m.imdbId && m.imdbId === id) ||
        (m.tmdbId && `tmdb-${m.type || 'movie'}-${m.tmdbId}` === id) ||
        areMediaItemsSame(m, rawMedia.find(rm => rm.id === id))
      );
      canonicalId = matched ? matched.id : id;
    }

    const prevSt = cleanStates[canonicalId];
    if (!prevSt) {
      cleanStates[canonicalId] = { ...st, mediaId: canonicalId };
    } else {
      const prevTime = getStateTimestamp(prevSt);
      const nextTime = getStateTimestamp(st);
      const newerIsNext = nextTime > prevTime || (nextTime === prevTime && hasStateInteraction(st) && !hasStateInteraction(prevSt));
      const newer = newerIsNext ? st : prevSt;
      const older = newerIsNext ? prevSt : st;

      const mergedCompletedEpisodes = {
        ...(older.tvProgress?.completedEpisodes || {}),
        ...(newer.tvProgress?.completedEpisodes || {}),
      };

      const hasCompletedEpisodes = Object.keys(mergedCompletedEpisodes).length > 0;
      const currentSeason = Math.max(prevSt.tvProgress?.currentSeason || 1, st.tvProgress?.currentSeason || 1);
      const currentEpisode = Math.max(prevSt.tvProgress?.currentEpisode || 1, st.tvProgress?.currentEpisode || 1);

      const maxUpdatedMs = Math.max(prevTime, nextTime);
      const latestUpdatedAt = maxUpdatedMs > 0
        ? new Date(maxUpdatedMs).toISOString()
        : (newer.updatedAt || older.updatedAt);

      const useLastWatched = (prevSt.lastWatchedAt && st.lastWatchedAt)
        ? (prevSt.lastWatchedAt > st.lastWatchedAt ? prevSt.lastWatchedAt : st.lastWatchedAt)
        : (prevSt.lastWatchedAt || st.lastWatchedAt);

      cleanStates[canonicalId] = {
        mediaId: canonicalId,
        inWatchlist: newer.inWatchlist ?? older.inWatchlist,
        isWatched: newer.isWatched ?? older.isWatched,
        isFavorite: newer.isFavorite ?? older.isFavorite,
        progressPercent: newer.progressPercent ?? older.progressPercent ?? 0,
        personalRating: newer.personalRating ?? older.personalRating,
        ratingTag: newer.ratingTag ?? older.ratingTag,
        notes: newer.notes ?? older.notes,
        addedAt: prevSt.addedAt || st.addedAt,
        updatedAt: latestUpdatedAt,
        favoritedAt: (newer.isFavorite ?? older.isFavorite) ? (newer.favoritedAt || older.favoritedAt) : undefined,
        lastWatchedAt: useLastWatched,
        tvProgress: hasCompletedEpisodes ? {
          currentSeason,
          currentEpisode,
          completedEpisodes: mergedCompletedEpisodes,
        } : (newer.tvProgress || older.tvProgress),
      };
    }
  }

  // 3. Remap item IDs in Custom Lists
  const cleanLists = rawLists.map(list => {
    const remappedIds = list.itemIds.map(id => idToCanonical.get(id) || id);
    const uniqueIds = Array.from(new Set(remappedIds));
    return { ...list, itemIds: uniqueIds };
  });

  return { cleanMedia: canonicalList, cleanStates, cleanLists };
}
