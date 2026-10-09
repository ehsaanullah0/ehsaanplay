import { useEffect, useState, useRef } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

// Module-level prompt capture singleton so beforeinstallprompt is never missed
let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;
const promptListeners = new Set<(prompt: BeforeInstallPromptEvent | null) => void>();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    globalDeferredPrompt = e as BeforeInstallPromptEvent;
    promptListeners.forEach(listener => listener(globalDeferredPrompt));
  });

  window.addEventListener('appinstalled', () => {
    globalDeferredPrompt = null;
    promptListeners.forEach(listener => listener(null));
  });
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    () => globalDeferredPrompt
  );
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Detect standalone mode (already installed)
    const isStandalone =
      typeof window !== 'undefined' &&
      (window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean })?.standalone === true);
    setIsInstalled(isStandalone);

    // Detect iOS devices
    if (typeof window !== 'undefined' && window.navigator) {
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
      setIsIOS(isIOSDevice);
    }

    const listener = (prompt: BeforeInstallPromptEvent | null) => {
      setDeferredPrompt(prompt);
      if (!prompt) {
        // App might have been installed
        const standaloneNow =
          window.matchMedia('(display-mode: standalone)').matches ||
          (window.navigator as unknown as { standalone?: boolean })?.standalone === true;
        if (standaloneNow) setIsInstalled(true);
      }
    };

    promptListeners.add(listener);

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      globalDeferredPrompt = null;
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      promptListeners.delete(listener);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async (): Promise<boolean> => {
    const activePrompt = deferredPrompt || globalDeferredPrompt;
    if (!activePrompt) {
      return false;
    }
    try {
      await activePrompt.prompt();
      const { outcome } = await activePrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
        globalDeferredPrompt = null;
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  return {
    isInstallable: !!(deferredPrompt || globalDeferredPrompt),
    isInstalled,
    isIOS,
    install,
  };
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

export interface PWAUpdateState {
  hasUpdate: boolean;
  isUpdating: boolean;
  isChecking: boolean;
  checkMessage: string | null;
  applyUpdate: () => void;
  dismissUpdate: () => void;
  checkForUpdate: () => Promise<void>;
}

export function usePWAUpdate(): PWAUpdateState {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [checkMessage, setCheckMessage] = useState<string | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const waitingWorkerRef = useRef<ServiceWorker | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    let refreshing = false;

    // Listen for controllerchange to execute page reload ONCE after new SW activates
    const handleControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    const onSWUpdate = (reg: ServiceWorkerRegistration) => {
      registrationRef.current = reg;

      // Check if a waiting worker already exists (and an existing worker was already controlling the page)
      if (reg.waiting && navigator.serviceWorker.controller) {
        waitingWorkerRef.current = reg.waiting;
        setHasUpdate(true);
      }

      // Listen for new installing workers
      reg.addEventListener('updatefound', () => {
        const installingWorker = reg.installing;
        if (!installingWorker) return;

        installingWorker.addEventListener('statechange', () => {
          if (
            installingWorker.state === 'installed' &&
            navigator.serviceWorker.controller &&
            navigator.onLine
          ) {
            waitingWorkerRef.current = installingWorker;
            setHasUpdate(true);
          }
        });
      });
    };

    // Register / retrieve existing registration
    navigator.serviceWorker
      .register('/sw.js')
      .then(reg => {
        onSWUpdate(reg);
      })
      .catch(() => {
        // Service worker registration optional in preview sandboxes
      });

    // Automatic update check when page returns to visibility or focus
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === 'visible' &&
        navigator.onLine &&
        registrationRef.current
      ) {
        registrationRef.current.update().catch(() => {});
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, []);

  const checkForUpdate = async () => {
    setIsChecking(true);
    setCheckMessage('Checking version...');

    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          registrationRef.current = reg;
          await reg.update();
        } else {
          const newReg = await navigator.serviceWorker.register('/sw.js');
          registrationRef.current = newReg;
          await newReg.update();
        }
      } catch (err) {
        console.warn('Update check failed:', err);
      }
    }

    setTimeout(() => {
      setIsChecking(false);
      if (!hasUpdate && !waitingWorkerRef.current) {
        setCheckMessage("You're on the latest version ✦");
        setTimeout(() => setCheckMessage(null), 3500);
      } else {
        setCheckMessage(null);
      }
    }, 1000);
  };

  const applyUpdate = () => {
    const worker = waitingWorkerRef.current;
    if (worker) {
      setIsUpdating(true);
      worker.postMessage({ type: 'SKIP_WAITING' });
    } else {
      window.location.reload();
    }
  };

  const dismissUpdate = () => {
    setIsDismissed(true);
  };

  return {
    hasUpdate: hasUpdate && !isDismissed,
    isUpdating,
    isChecking,
    checkMessage,
    applyUpdate,
    dismissUpdate,
    checkForUpdate,
  };
}
