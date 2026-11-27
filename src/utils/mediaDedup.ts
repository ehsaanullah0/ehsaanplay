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

interface MediaLookupIndex {
  byIdLower: Map<string, MediaItem[]>;
  byImdbLower: Map<string, MediaItem[]>;
  byTmdbLower: Map<string, MediaItem[]>;
  byTypeTitle: Map<string, MediaItem[]>;
}

const mediaLookupCache = new WeakMap<MediaItem[], MediaLookupIndex>();

function pushToBucket(map: Map<string, MediaItem[]>, key: string, item: MediaItem) {
  const existing = map.get(key);
  if (existing) {
    if (!existing.includes(item)) existing.push(item);
  } else {
    map.set(key, [item]);
  }
}

function getOrBuildMediaIndex(mediaList: MediaItem[]): MediaLookupIndex {
  const cached = mediaLookupCache.get(mediaList);
  if (cached) return cached;

  const byIdLower = new Map<string, MediaItem[]>();
  const byImdbLower = new Map<string, MediaItem[]>();
  const byTmdbLower = new Map<string, MediaItem[]>();
  const byTypeTitle = new Map<string, MediaItem[]>();

  for (let i = 0; i < mediaList.length; i++) {
    const m = mediaList[i];
    if (!m) continue;
    if (m.id) pushToBucket(byIdLower, m.id.toLowerCase(), m);
    if (m.imdbId) pushToBucket(byImdbLower, m.imdbId.toLowerCase(), m);
    if (m.tmdbId) pushToBucket(byTmdbLower, `tmdb-${m.type || 'movie'}-${m.tmdbId}`.toLowerCase(), m);
    const normTitle = normalizeMediaTitle(m.title);
    if (normTitle) {
      pushToBucket(byTypeTitle, `${m.type || 'movie'}:${normTitle}`, m);
    }
  }

  const index: MediaLookupIndex = { byIdLower, byImdbLower, byTmdbLower, byTypeTitle };
  mediaLookupCache.set(mediaList, index);
  return index;
}

export function findMediaItemByIdOrAlias(
  id: string,
  mediaList: MediaItem[]
): MediaItem | undefined {
  if (!id || !mediaList || mediaList.length === 0) return undefined;
  const index = getOrBuildMediaIndex(mediaList);
  const lower = id.toLowerCase();

  const byId = index.byIdLower.get(lower);
  if (byId && byId.length > 0) {
    const exact = byId.find(m => m.id === id);
    return exact || byId[0];
  }
  const byImdb = index.byImdbLower.get(lower);
  if (byImdb && byImdb.length > 0) return byImdb[0];

  const byTmdb = index.byTmdbLower.get(lower);
  if (byTmdb && byTmdb.length > 0) return byTmdb[0];

  return undefined;
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
    const index = getOrBuildMediaIndex(mediaList);
    const matched = new Set<MediaItem>();

    const checkBucket = (bucket?: MediaItem[]) => {
      if (!bucket) return;
      for (const m of bucket) matched.add(m);
    };

    if (item.id) {
      const idLower = item.id.toLowerCase();
      checkBucket(index.byIdLower.get(idLower));
      checkBucket(index.byImdbLower.get(idLower));
      checkBucket(index.byTmdbLower.get(idLower));
    }
    if (item.imdbId) {
      const imdbLower = item.imdbId.toLowerCase();
      checkBucket(index.byImdbLower.get(imdbLower));
      checkBucket(index.byIdLower.get(imdbLower));
    }
    if (item.tmdbId) {
      const tmdbLower = `tmdb-${item.type || 'movie'}-${item.tmdbId}`.toLowerCase();
      checkBucket(index.byTmdbLower.get(tmdbLower));
      checkBucket(index.byIdLower.get(tmdbLower));
    }
    const normTitle = normalizeMediaTitle(item.title);
    if (normTitle) {
      const titleBucket = index.byTypeTitle.get(`${item.type || 'movie'}:${normTitle}`);
      if (titleBucket) {
        for (const m of titleBucket) {
          if (!m.year || !item.year || Math.abs(m.year - item.year) <= 1) {
            matched.add(m);
          }
        }
      }
    }

    for (const m of matched) {
      pushKey(m.id);
      if (m.imdbId) pushKey(m.imdbId);
      if (m.tmdbId) pushKey(`tmdb-${m.type || 'movie'}-${m.tmdbId}`);
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

/**
 * O(N) hash-indexed deduplication of MediaItems, PersonalMediaStates, and CustomLists.
 * Preserves exact matching rules: exact ID, IMDb ID, TMDB ID+type, cross-ID, and normalized title+type with |yearA-yearB|<=1.
 */
export function deduplicateMediaItemsAndStates(
  rawMedia: MediaItem[],
  rawStates: Record<string, PersonalMediaState>,
  rawLists: CustomList[] = []
): { cleanMedia: MediaItem[]; cleanStates: Record<string, PersonalMediaState>; cleanLists: CustomList[] } {
  const canonicalList: MediaItem[] = [];
  const idToCanonical = new Map<string, string>();

  // O(1) lookup indices into canonicalList
  const indexById = new Map<string, number>();
  const indexByImdb = new Map<string, number>();
  const indexByTmdbKey = new Map<string, number>();
  const indicesByTypeTitle = new Map<string, number[]>();

  const registerAliases = (item: MediaItem, canonicalId: string, listIndex: number) => {
    idToCanonical.set(item.id, canonicalId);
    indexById.set(item.id, listIndex);

    if (item.imdbId && item.imdbId.startsWith('tt')) {
      idToCanonical.set(item.imdbId, canonicalId);
      if (!indexByImdb.has(item.imdbId)) indexByImdb.set(item.imdbId, listIndex);
    }
    if (item.tmdbId) {
      const tmdbKey = `tmdb-${item.type || 'movie'}-${item.tmdbId}`;
      idToCanonical.set(tmdbKey, canonicalId);
      if (!indexByTmdbKey.has(tmdbKey)) indexByTmdbKey.set(tmdbKey, listIndex);
    }
    const normTitle = normalizeMediaTitle(item.title);
    if (normTitle) {
      const titleKeyWithYear = `${item.type || 'movie'}-${normTitle}-${item.year}`;
      idToCanonical.set(titleKeyWithYear, canonicalId);
      const typeTitleKey = `${item.type || 'movie'}:${normTitle}`;
      const bucket = indicesByTypeTitle.get(typeTitleKey);
      if (bucket) {
        if (!bucket.includes(listIndex)) bucket.push(listIndex);
      } else {
        indicesByTypeTitle.set(typeTitleKey, [listIndex]);
      }
    }
  };

  const findExistingCanonicalIndex = (item: MediaItem): number => {
    if (item.id) {
      const byExactId = indexById.get(item.id);
      if (byExactId !== undefined) return byExactId;
      if (item.id.startsWith('tt')) {
        const byImdbCross = indexByImdb.get(item.id);
        if (byImdbCross !== undefined) return byImdbCross;
      }
      if (item.id.startsWith('tmdb-')) {
        const byTmdbCross = indexByTmdbKey.get(item.id);
        if (byTmdbCross !== undefined) return byTmdbCross;
      }
    }

    if (item.imdbId && item.imdbId.startsWith('tt')) {
      const byImdb = indexByImdb.get(item.imdbId);
      if (byImdb !== undefined) return byImdb;
      const byIdCross = indexById.get(item.imdbId);
      if (byIdCross !== undefined) return byIdCross;
    }

    if (item.tmdbId) {
      const tmdbKey = `tmdb-${item.type || 'movie'}-${item.tmdbId}`;
      const byTmdb = indexByTmdbKey.get(tmdbKey);
      if (byTmdb !== undefined) return byTmdb;
      const byIdCross = indexById.get(tmdbKey);
      if (byIdCross !== undefined) return byIdCross;
    }

    const normTitle = normalizeMediaTitle(item.title);
    if (normTitle) {
      const typeTitleKey = `${item.type || 'movie'}:${normTitle}`;
      const candidates = indicesByTypeTitle.get(typeTitleKey);
      if (candidates) {
        for (const idx of candidates) {
          const existing = canonicalList[idx];
          if (!existing.year || !item.year || Math.abs(existing.year - item.year) <= 1) {
            return idx;
          }
        }
      }
    }

    return -1;
  };

  // 1. Group and merge media items into canonical entries in O(N)
  for (const item of rawMedia) {
    if (!item || !item.id) continue;

    const existingIndex = findExistingCanonicalIndex(item);

    if (existingIndex === -1) {
      const canonicalId = (item.imdbId && item.imdbId.startsWith('tt'))
        ? item.imdbId
        : (item.tmdbId ? `tmdb-${item.type || 'movie'}-${item.tmdbId}` : item.id);

      const canonicalItem: MediaItem = {
        ...item,
        id: canonicalId,
      };

      const newIndex = canonicalList.length;
      canonicalList.push(canonicalItem);
      idToCanonical.set(canonicalId, canonicalId);
      indexById.set(canonicalId, newIndex);
      registerAliases(item, canonicalId, newIndex);
    } else {
      const existing = canonicalList[existingIndex];
      const canonicalId = existing.id;

      registerAliases(item, canonicalId, existingIndex);

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

  // 2. Consolidate PersonalMediaStates for all duplicate alias keys in O(1) per entry
  const cleanStates: Record<string, PersonalMediaState> = {};
  for (const [id, st] of Object.entries(rawStates)) {
    if (!st) continue;
    let canonicalId = idToCanonical.get(id);
    if (!canonicalId) {
      const matchedIdx =
        indexById.get(id) ??
        indexByImdb.get(id) ??
        indexByTmdbKey.get(id);
      canonicalId = matchedIdx !== undefined ? canonicalList[matchedIdx].id : id;
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
