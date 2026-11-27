import { useState, useEffect, useCallback } from 'react';

// Singleton tracker for user preference
let userWantsFullscreen = false;
try {
  userWantsFullscreen = typeof localStorage !== 'undefined' && localStorage.getItem('ehsaan_fullscreen_preferred') === 'true';
} catch {}

const listeners = new Set<(isFullscreen: boolean) => void>();

export function isFullscreenActive(): boolean {
  if (typeof document === 'undefined') return false;
  return !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
}

export function isUserFullscreenPreferred(): boolean {
  return userWantsFullscreen;
}

function triggerRequestFullscreen() {
  if (typeof document === 'undefined') return;
  const docEl = document.documentElement as any;
  if (docEl.requestFullscreen) {
    try {
      return Promise.resolve(docEl.requestFullscreen({ navigationUI: 'hide' })).catch(() =>
        Promise.resolve(docEl.requestFullscreen()).catch(() => {})
      );
    } catch {
      return Promise.resolve(docEl.requestFullscreen()).catch(() => {});
    }
  } else if (docEl.webkitRequestFullscreen) {
    return docEl.webkitRequestFullscreen();
  }
}

export function requestAppFullscreen(): Promise<void> | void {
  userWantsFullscreen = true;
  try {
    localStorage.setItem('ehsaan_fullscreen_preferred', 'true');
  } catch {}
  if (!isFullscreenActive()) {
    return triggerRequestFullscreen();
  }
}

export function exitAppFullscreen(): Promise<void> | void {
  userWantsFullscreen = false;
  try {
    localStorage.removeItem('ehsaan_fullscreen_preferred');
  } catch {}
  if (typeof document === 'undefined') return;
  const doc = document as any;
  if (isFullscreenActive()) {
    if (doc.exitFullscreen) {
      return doc.exitFullscreen().catch(() => {});
    } else if (doc.webkitExitFullscreen) {
      return doc.webkitExitFullscreen();
    }
  }
}

/**
 * Explicit helper if needed without auto-retriggering browser toast loops on user taps.
 */
export function reassertFullscreen() {
  if (!userWantsFullscreen) return;
  if (typeof document === 'undefined') return;
  if (!isFullscreenActive()) {
    try {
      triggerRequestFullscreen();
    } catch {
      // ignore
    }
  }
}

export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(isFullscreenActive);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const active = isFullscreenActive();
      setIsFullscreen(active);
      listeners.forEach(fn => fn(active));
      if (!active && userWantsFullscreen) {
        userWantsFullscreen = false;
        try {
          localStorage.removeItem('ehsaan_fullscreen_preferred');
        } catch {}
      }
    };

    listeners.add(setIsFullscreen);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      listeners.delete(setIsFullscreen);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (isFullscreenActive()) {
      exitAppFullscreen();
    } else {
      requestAppFullscreen();
    }
  }, []);

  return { isFullscreen, toggleFullscreen };
}

