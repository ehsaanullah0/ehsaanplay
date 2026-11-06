import React, { useState, useEffect, useRef } from 'react';
import { Film } from 'lucide-react';
import { getArtworkDisplaySrc, resolveArtworkUrl } from '../../services/imageStorage';
import { loadUserSettings } from '../../services/storage';
import { useOnlineStatus } from '../../hooks/usePWAInstall';

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackTitle?: string;
  fallbackSrc?: string;
  containerClassName?: string;
  size?: 'w342' | 'w500' | 'w780' | 'original';
  forceOffline?: boolean;
}

export { resolveArtworkUrl as resolveImageUrl };

// Singleton storage state subscriber to avoid dozens of redundant window listeners and localStorage hits
let singletonStorageOffline: boolean | null = null;
const storageOfflineSubscribers = new Set<(isOffline: boolean) => void>();
let isStorageListenerAttached = false;

function getSingletonStorageOffline(): boolean {
  if (singletonStorageOffline !== null) return singletonStorageOffline;
  try {
    if (typeof window !== 'undefined') {
      const settings = loadUserSettings();
      if (settings?.imageStorageMode) {
        singletonStorageOffline = settings.imageStorageMode === 'offline';
        return singletonStorageOffline;
      }
      const raw = localStorage.getItem('ehsaan_user_settings_v1') || localStorage.getItem('ehsaan_movie_user_settings');
      if (raw) {
        singletonStorageOffline = JSON.parse(raw).imageStorageMode === 'offline';
        return singletonStorageOffline;
      }
    }
  } catch {
    // ignore
  }
  singletonStorageOffline = false;
  return false;
}

function ensureStorageListenerAttached() {
  if (isStorageListenerAttached || typeof window === 'undefined') return;
  isStorageListenerAttached = true;

  const update = () => {
    try {
      const settings = loadUserSettings();
      const newMode = settings?.imageStorageMode === 'offline';
      if (newMode !== singletonStorageOffline) {
        singletonStorageOffline = newMode;
        storageOfflineSubscribers.forEach(cb => cb(newMode));
      }
    } catch {
      // ignore
    }
  };

  window.addEventListener('ehsaan:settings-change', update, { passive: true });
  window.addEventListener('storage', update, { passive: true });
}

export const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt,
  fallbackTitle,
  fallbackSrc,
  className = '',
  containerClassName = '',
  style,
  size = 'w500',
  forceOffline = false,
  loading = 'lazy',
  ...props
}) => {
  const isOnline = useOnlineStatus();
  const triedFallbackRef = useRef<boolean>(false);
  const [isStorageOffline, setIsStorageOffline] = useState<boolean>(getSingletonStorageOffline);

  useEffect(() => {
    ensureStorageListenerAttached();
    const handleUpdate = (offline: boolean) => setIsStorageOffline(offline);
    storageOfflineSubscribers.add(handleUpdate);
    return () => {
      storageOfflineSubscribers.delete(handleUpdate);
    };
  }, []);

  const isOffline = forceOffline || !isOnline || isStorageOffline;

  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null);
  const [hasError, setHasError] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const currentReqRef = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const currentSrc = src;
    currentReqRef.current = currentSrc || null;

    triedFallbackRef.current = false;
    setHasError(false);
    setIsLoading(true);

    if (!currentSrc) {
      setResolvedSrc(null);
      setIsLoading(false);
      return;
    }

    getArtworkDisplaySrc(currentSrc, isOffline, size)
      .then(displayUrl => {
        if (isMounted && currentReqRef.current === currentSrc) {
          if (displayUrl) {
            setResolvedSrc(displayUrl);
            setHasError(false);
          } else {
            setResolvedSrc(null);
            setHasError(true);
            setIsLoading(false);
          }
        }
      })
      .catch(() => {
        if (isMounted && currentReqRef.current === currentSrc) {
          setResolvedSrc(null);
          setHasError(true);
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [src, isOffline, size]);

  const handleImageError = () => {
    // 1. If fallbackSrc is available and hasn't been tried yet, try it immediately
    if (fallbackSrc && !triedFallbackRef.current && fallbackSrc !== resolvedSrc && fallbackSrc.startsWith('http')) {
      triedFallbackRef.current = true;
      setResolvedSrc(fallbackSrc);
      setIsLoading(false);
      setHasError(false);
      return;
    }

    // 2. Attempt fallback from offline cache first if not already a blob URL
    if (src && !resolvedSrc?.startsWith('blob:')) {
      getArtworkDisplaySrc(src, true, size)
        .then(cachedBlobUrl => {
          if (cachedBlobUrl) {
            setResolvedSrc(cachedBlobUrl);
            setHasError(false);
            setIsLoading(false);
            return;
          }
          // If online, attempt fallback to original or smaller resolution once
          if (!isOffline && size === 'w500') {
            const fallbackUrl = resolveArtworkUrl(src, 'original');
            if (fallbackUrl && fallbackUrl !== resolvedSrc) {
              setResolvedSrc(fallbackUrl);
              return;
            }
          }
          setHasError(true);
          setIsLoading(false);
        })
        .catch(() => {
          setHasError(true);
          setIsLoading(false);
        });
      return;
    }

    setHasError(true);
    setIsLoading(false);
  };

  if (!resolvedSrc || hasError) {
    return (
      <div
        className={`w-full h-full flex flex-col items-center justify-center bg-[#EAE5D8] text-[#4E562F] p-3 text-center select-none ${containerClassName}`}
        style={style}
      >
        <Film className="w-8 h-8 opacity-40 mb-1.5 stroke-[1.5]" />
        {fallbackTitle && (
          <span className="text-xs font-bold leading-tight line-clamp-3 text-[#4E562F] opacity-90 px-1">
            {fallbackTitle}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={`relative w-full h-full overflow-hidden bg-[#EAE5D8] ${containerClassName}`}
      style={style}
    >
      {isLoading && (
        <div className="absolute inset-0 bg-[#EAE5D8] animate-pulse z-0" />
      )}
      <img
        src={resolvedSrc}
        alt={alt || fallbackTitle || 'Media artwork'}
        referrerPolicy="no-referrer"
        loading={loading}
        decoding="async"
        onLoad={() => setIsLoading(false)}
        onError={handleImageError}
        className={`w-full h-full object-cover transition-opacity duration-200 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        } ${className}`}
        {...props}
      />
    </div>
  );
};
