import { MediaItem } from '../types/movie';

export const ARTWORK_CACHE_NAME = 'ehsaan-movie-offline-images-v1';
const LEGACY_ARTWORK_CACHES = ['ehsaan-movie-artwork-v1', 'media-poster-cache', 'tmdb-artwork-cache'];
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

export interface ImageCacheStats {
  count: number;
  bytes: number;
  formattedSize: string;
}

export interface PreCacheResult {
  success: boolean;
  total: number;
  cached: number;
  alreadyCached: number;
  failed: number;
  message: string;
}

export interface CacheCheckResult {
  totalRequired: number;
  cachedCount: number;
  isFullyCached: boolean;
  missingUrls: string[];
}

// In-memory LRU Object URL cache to prevent memory leaks while providing instant offline access
const objectUrlMap = new Map<string, string>();
const MAX_OBJECT_URLS = 250;

/**
 * Normalizes any relative TMDB path or URL to a canonical absolute HTTPS URL
 */
export function resolveArtworkUrl(
  rawPath: string | null | undefined,
  size: 'w342' | 'w500' | 'w780' | 'original' = 'w500'
): string {
  if (!rawPath || typeof rawPath !== 'string') return '';
  const trimmed = rawPath.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return trimmed;
  }

  if (trimmed.startsWith('/')) {
    return `${TMDB_IMAGE_BASE}/${size}${trimmed}`;
  }

  return trimmed;
}

/**
 * Centralized Artwork Resolver
 * Every image component uses this function to resolve the display source.
 * In Online mode: returns the canonical TMDB URL.
 * In Offline mode: resolves strictly from Cache API without network fallback.
 */
export async function getArtworkDisplaySrc(
  rawPath: string | null | undefined,
  isOfflineMode: boolean,
  size: 'w342' | 'w500' | 'w780' | 'original' = 'w500'
): Promise<string | null> {
  const canonicalUrl = resolveArtworkUrl(rawPath, size);
  if (!canonicalUrl) return null;

  // If already in memory as object URL, return immediately
  if (objectUrlMap.has(canonicalUrl)) {
    return objectUrlMap.get(canonicalUrl)!;
  }

  const isActuallyOffline = isOfflineMode || (typeof navigator !== 'undefined' && !navigator.onLine);

  // Offline or cache-first lookup: Check Cache API across all size variants and legacy caches
  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      const cacheNames = [ARTWORK_CACHE_NAME, ...LEGACY_ARTWORK_CACHES];
      for (const cName of cacheNames) {
        const cache = await caches.open(cName);

        // 1. Try exact canonical URL match
        let match = await cache.match(canonicalUrl, { ignoreSearch: true, ignoreVary: true });

        // 2. Try alternate size variants (w500, w780, w342, original) if size differs
        if (!match && rawPath && (rawPath.startsWith('/') || rawPath.includes('image.tmdb.org'))) {
          const sizes: Array<'w500' | 'w780' | 'w342' | 'original'> = ['w500', 'w780', 'w342', 'original'];
          for (const s of sizes) {
            if (s === size) continue;
            const altUrl = resolveArtworkUrl(rawPath, s);
            match = await cache.match(altUrl, { ignoreSearch: true, ignoreVary: true });
            if (match) break;
          }
        }

        // 3. Fallback: Search keys for path suffix matching
        if (!match && rawPath) {
          const pathEnd = rawPath.includes('/') ? rawPath.substring(rawPath.lastIndexOf('/')) : rawPath;
          if (pathEnd && pathEnd.length > 3) {
            const keys = await cache.keys();
            const matchedKey = keys.find(k => k.url.includes(pathEnd));
            if (matchedKey) {
              match = await cache.match(matchedKey);
            }
          }
        }

        if (match) {
          const blob = await match.blob();
          if (blob && blob.size > 0) {
            const objectUrl = URL.createObjectURL(blob);

            if (objectUrlMap.size >= MAX_OBJECT_URLS) {
              const oldestKey = objectUrlMap.keys().next().value;
              if (oldestKey) {
                const oldUrl = objectUrlMap.get(oldestKey);
                if (oldUrl) URL.revokeObjectURL(oldUrl);
                objectUrlMap.delete(oldestKey);
              }
            }

            objectUrlMap.set(canonicalUrl, objectUrl);
            return objectUrl;
          }
        }
      }
    } catch (err) {
      console.warn('Cache API lookup failed for artwork:', err);
    }
  }

  // If online and not offline mode, return network URL directly
  if (!isActuallyOffline) {
    return canonicalUrl;
  }

  // In offline mode with no cache hit: return null (graceful placeholder)
  return null;
}

/**
 * Get accurate storage metrics for the artwork cache
 */
export async function getImageCacheStats(): Promise<ImageCacheStats> {
  if (typeof window === 'undefined' || !('caches' in window)) {
    return { count: 0, bytes: 0, formattedSize: '0 KB' };
  }

  try {
    const cache = await caches.open(ARTWORK_CACHE_NAME);
    const keys = await cache.keys();
    let totalBytes = 0;

    for (const req of keys) {
      const res = await cache.match(req);
      if (res) {
        const blob = await res.blob();
        totalBytes += blob.size;
      }
    }

    let formattedSize = '0 KB';
    if (totalBytes > 1024 * 1024 * 1024) {
      formattedSize = `${(totalBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    } else if (totalBytes > 1024 * 1024) {
      formattedSize = `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`;
    } else if (totalBytes > 0) {
      formattedSize = `${Math.round(totalBytes / 1024)} KB`;
    }

    return {
      count: keys.length,
      bytes: totalBytes,
      formattedSize,
    };
  } catch {
    return { count: 0, bytes: 0, formattedSize: '0 KB' };
  }
}

/**
 * Check whether all required artwork for the library is cached before switching offline
 */
export async function checkLibraryCacheStatus(items: MediaItem[]): Promise<CacheCheckResult> {
  if (typeof window === 'undefined' || !('caches' in window)) {
    return { totalRequired: 0, cachedCount: 0, isFullyCached: false, missingUrls: [] };
  }

  try {
    const cache = await caches.open(ARTWORK_CACHE_NAME);
    const requiredUrls = new Set<string>();

    for (const item of items) {
      const poster = resolveArtworkUrl(item.posterUrl, 'w500');
      if (poster) requiredUrls.add(poster);
      const backdrop = resolveArtworkUrl(item.backdropUrl, 'w780');
      if (backdrop) requiredUrls.add(backdrop);
    }

    const missingUrls: string[] = [];
    let cachedCount = 0;

    for (const url of requiredUrls) {
      const match = await cache.match(url);
      if (match) {
        cachedCount++;
      } else {
        missingUrls.push(url);
      }
    }

    return {
      totalRequired: requiredUrls.size,
      cachedCount,
      isFullyCached: missingUrls.length === 0,
      missingUrls,
    };
  } catch {
    return { totalRequired: 0, cachedCount: 0, isFullyCached: false, missingUrls: [] };
  }
}

/**
 * Robust, concurrency-controlled Pre-cache system
 * Safely downloads missing artwork with validation and error isolation.
 */
export async function preCacheLibraryImages(
  items: MediaItem[],
  onProgress?: (done: number, total: number, cached: number, failed: number) => void
): Promise<PreCacheResult> {
  if (typeof window === 'undefined' || !('caches' in window)) {
    return {
      success: false,
      total: 0,
      cached: 0,
      alreadyCached: 0,
      failed: 0,
      message: 'Cache API is not supported in this browser.',
    };
  }

  try {
    const cache = await caches.open(ARTWORK_CACHE_NAME);

    // 1. Collect all unique canonical URLs
    const urlSet = new Set<string>();
    for (const item of items) {
      const poster = resolveArtworkUrl(item.posterUrl, 'w500');
      if (poster) urlSet.add(poster);
      const backdrop = resolveArtworkUrl(item.backdropUrl, 'w780');
      if (backdrop) urlSet.add(backdrop);
    }

    const allUrls = Array.from(urlSet);
    if (allUrls.length === 0) {
      return {
        success: true,
        total: 0,
        cached: 0,
        alreadyCached: 0,
        failed: 0,
        message: 'No artwork URLs found to cache.',
      };
    }

    // 2. Identify already cached vs missing
    const urlsToFetch: string[] = [];
    let alreadyCachedCount = 0;

    for (const url of allUrls) {
      const exists = await cache.match(url);
      if (exists) {
        alreadyCachedCount++;
      } else {
        urlsToFetch.push(url);
      }
    }

    let completed = alreadyCachedCount;
    let newlyCached = 0;
    let failedCount = 0;

    if (onProgress) {
      onProgress(completed, allUrls.length, newlyCached, failedCount);
    }

    // 3. Controlled concurrency queue (5 simultaneous workers)
    const CONCURRENCY = 5;
    const queue = [...urlsToFetch];

    const worker = async () => {
      while (queue.length > 0) {
        const url = queue.shift();
        if (!url) break;

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout

          const res = await fetch(url, {
            signal: controller.signal,
            referrerPolicy: 'no-referrer',
          });
          clearTimeout(timeoutId);

          if (res.ok && res.status === 200) {
            const clone = res.clone();
            const blob = await clone.blob();

            // Validate that we received an actual image
            if (blob.size > 500 && (blob.type.includes('image') || url.includes('.jpg') || url.includes('.png') || url.includes('.webp'))) {
              await cache.put(url, res);
              newlyCached++;
            } else {
              failedCount++;
            }
          } else {
            failedCount++;
          }
        } catch {
          // Individual image failure does NOT abort the operation
          failedCount++;
        } finally {
          completed++;
          if (onProgress) {
            onProgress(completed, allUrls.length, newlyCached, failedCount);
          }
        }
      }
    };

    // Run workers concurrently
    const workers = Array.from({ length: Math.min(CONCURRENCY, urlsToFetch.length) }, () => worker());
    await Promise.all(workers);

    return {
      success: true,
      total: allUrls.length,
      cached: newlyCached,
      alreadyCached: alreadyCachedCount,
      failed: failedCount,
      message: `Artwork caching complete. ${newlyCached + alreadyCachedCount} of ${allUrls.length} available offline.`,
    };
  } catch (err) {
    return {
      success: false,
      total: 0,
      cached: 0,
      alreadyCached: 0,
      failed: 0,
      message: err instanceof Error ? err.message : 'Unknown cache error occurred.',
    };
  }
}

/**
 * Safely clears all artwork storage and revokes active memory blobs
 */
export async function clearImageCache(): Promise<void> {
  // Revoke all in-memory Blob URLs
  for (const url of objectUrlMap.values()) {
    try {
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
  }
  objectUrlMap.clear();

  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      await caches.delete(ARTWORK_CACHE_NAME);
      // Clean up any legacy caches
      for (const legacy of LEGACY_ARTWORK_CACHES) {
        await caches.delete(legacy);
      }
    } catch (err) {
      console.error('Failed to clear artwork cache:', err);
    }
  }
}
