import React, { useState, useEffect, useRef } from 'react';
import { Film } from 'lucide-react';
import { getArtworkDisplaySrc, resolveArtworkUrl } from '../../services/imageStorage';
import { useOnlineStatus } from '../../hooks/usePWAInstall';

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackTitle?: string;
  containerClassName?: string;
  size?: 'w342' | 'w500' | 'w780' | 'original';
  forceOffline?: boolean;
}

export { resolveArtworkUrl as resolveImageUrl };

export const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt,
  fallbackTitle,
  className = '',
  containerClassName = '',
  style,
  size = 'w500',
  forceOffline = false,
  loading = 'eager',
  ...props
}) => {
  const isOnline = useOnlineStatus();
  const isOffline = forceOffline || !isOnline;

  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null);
  const [hasError, setHasError] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const currentReqRef = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const currentSrc = src;
    currentReqRef.current = currentSrc || null;

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
    // If online, attempt fallback to original or smaller resolution once
    if (!isOffline && src && size === 'w500') {
      const fallbackUrl = resolveArtworkUrl(src, 'original');
      if (fallbackUrl && fallbackUrl !== resolvedSrc) {
        setResolvedSrc(fallbackUrl);
        return;
      }
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
