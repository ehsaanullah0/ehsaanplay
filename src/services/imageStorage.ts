import { MediaItem } from '../types/movie';

export const ARTWORK_CACHE_NAME = 'ehsaan-movie-offline-images-v1';
const LEGACY_ARTWORK_CACHES = ['ehsaan-movie-artwork-v1', 'media-poster-cache'];

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
 * Normalizes any artwork path or URL to a canonical absolute HTTPS URL
 */
export function resolveArtworkUrl(
  rawPath: string | null | undefined,
  _size: 'w342' | 'w500' | 'w780' | 'original' = 'w500'
): string {
  if (!rawPath || typeof rawPath !== 'string') return '';
  const trimmed = rawPath.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('data:') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  return trimmed;
}

/**
 * Centralized Artwork Resolver
 */
export async function getArtworkDisplaySrc(
  rawPath: string | null | undefined,
  isOfflineMode: boolean,
  size: 'w342' | 'w500' | 'w780' | 'original' = 'w500'
): Promise<string | null> {
  const canonicalUrl = resolveArtworkUrl(rawPath, size);
  if (!canonicalUrl) return null;

  if (objectUrlMap.has(canonicalUrl)) {
    return objectUrlMap.get(canonicalUrl)!;
  }

  const isActuallyOffline = isOfflineMode || (typeof navigator !== 'undefined' && !navigator.onLine);

  // Fast path: When online, return the canonical URL immediately without hitting CacheStorage
  if (!isActuallyOffline) {
    return canonicalUrl;
  }

  // Offline fallback: Lookup in CacheStorage for pre-cached offline artwork
  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      const cacheNames = [ARTWORK_CACHE_NAME, ...LEGACY_ARTWORK_CACHES];
      for (const cName of cacheNames) {
        const cache = await caches.open(cName);
        const match = await cache.match(canonicalUrl, { ignoreSearch: true, ignoreVary: true });

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

  return null;
}

/**
 * Storage metrics for the artwork cache
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
 * Pre-cache system
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

    const CONCURRENCY = 5;
    const queue = [...urlsToFetch];

    const worker = async () => {
      while (queue.length > 0) {
        const url = queue.shift();
        if (!url) break;

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 12000);

          const res = await fetch(url, { signal: controller.signal });
          clearTimeout(timeoutId);

          if (res.ok && res.status === 200) {
            const blob = await res.blob();
            if (blob.size > 200) {
              const cacheResponse = new Response(blob, {
                status: 200,
                statusText: 'OK',
                headers: {
                  'Content-Type': blob.type || 'image/jpeg',
                  'Content-Length': String(blob.size),
                  'Cache-Control': 'public, max-age=31536000, immutable',
                },
              });
              await cache.put(url, cacheResponse);
              newlyCached++;
            } else {
              failedCount++;
            }
          } else {
            failedCount++;
          }
        } catch {
          failedCount++;
        } finally {
          completed++;
          if (onProgress) {
            onProgress(completed, allUrls.length, newlyCached, failedCount);
          }
        }
      }
    };

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
 * Clears artwork storage
 */
export async function clearImageCache(): Promise<void> {
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
      for (const legacy of LEGACY_ARTWORK_CACHES) {
        await caches.delete(legacy);
      }
    } catch (err) {
      console.error('Failed to clear artwork cache:', err);
    }
  }
}
