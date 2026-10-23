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

export function requestAppFullscreen(): Promise<void> | void {
  userWantsFullscreen = true;
  try {
    localStorage.setItem('ehsaan_fullscreen_preferred', 'true');
  } catch {}
  if (typeof document === 'undefined') return;
  const docEl = document.documentElement as any;
  if (!isFullscreenActive()) {
    if (docEl.requestFullscreen) {
      return docEl.requestFullscreen().catch(() => {});
    } else if (docEl.webkitRequestFullscreen) {
      return docEl.webkitRequestFullscreen();
    }
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
 * Reasserts fullscreen mode if the user previously enabled fullscreen and an OS-level
 * gesture (such as Android back button/gesture) triggered an unwanted browser exit.
 */
export function reassertFullscreen() {
  if (!userWantsFullscreen) return;
  if (typeof document === 'undefined') return;
  if (!isFullscreenActive()) {
    try {
      const docEl = document.documentElement as any;
      if (docEl.requestFullscreen) {
        docEl.requestFullscreen().catch(() => {});
      } else if (docEl.webkitRequestFullscreen) {
        docEl.webkitRequestFullscreen();
      }
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

      // If user enabled fullscreen but OS escaped it (e.g. via Android back gesture),
      // arm a one-time gesture listener to restore fullscreen on the next user interaction
      if (!active && userWantsFullscreen) {
        const restoreOnInteraction = () => {
          reassertFullscreen();
          window.removeEventListener('pointerdown', restoreOnInteraction, { capture: true });
          window.removeEventListener('touchstart', restoreOnInteraction, { capture: true });
        };
        window.addEventListener('pointerdown', restoreOnInteraction, { capture: true, once: true });
        window.addEventListener('touchstart', restoreOnInteraction, { capture: true, once: true });
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

