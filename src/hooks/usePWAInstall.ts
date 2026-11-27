import { useEffect, useState, useRef } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

// Module-level prompt capture singleton so beforeinstallprompt is never missed
let globalDeferredPrompt: BeforeInstallPromptEvent | null =
  (typeof window !== 'undefined'
    ? ((window as unknown as { __pwaInstallPrompt?: BeforeInstallPromptEvent; deferredPrompt?: BeforeInstallPromptEvent }).__pwaInstallPrompt ||
       (window as unknown as { __pwaInstallPrompt?: BeforeInstallPromptEvent; deferredPrompt?: BeforeInstallPromptEvent }).deferredPrompt)
    : null) || null;

const promptListeners = new Set<(prompt: BeforeInstallPromptEvent | null) => void>();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    globalDeferredPrompt = e as BeforeInstallPromptEvent;
    (window as unknown as { __pwaInstallPrompt: BeforeInstallPromptEvent; deferredPrompt: BeforeInstallPromptEvent }).__pwaInstallPrompt = e as BeforeInstallPromptEvent;
    (window as unknown as { __pwaInstallPrompt: BeforeInstallPromptEvent; deferredPrompt: BeforeInstallPromptEvent }).deferredPrompt = e as BeforeInstallPromptEvent;
    promptListeners.forEach(listener => listener(globalDeferredPrompt));
  });

  window.addEventListener('appinstalled', () => {
    globalDeferredPrompt = null;
    if (typeof window !== 'undefined') {
      (window as unknown as { __pwaInstallPrompt: unknown; deferredPrompt: unknown }).__pwaInstallPrompt = null;
      (window as unknown as { __pwaInstallPrompt: unknown; deferredPrompt: unknown }).deferredPrompt = null;
    }
    promptListeners.forEach(listener => listener(null));
  });
}

export function checkIsInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  if (localStorage.getItem('ehsaan_pwa_installed') === 'true') return true;
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    (window.navigator as unknown as { standalone?: boolean })?.standalone === true ||
    document.referrer.includes('android-app://');
  if (isStandalone) {
    try {
      localStorage.setItem('ehsaan_pwa_installed', 'true');
    } catch {
      // ignore
    }
  }
  return isStandalone;
}

export function notifyPWAInstalled(): void {
  try {
    localStorage.setItem('ehsaan_pwa_installed', 'true');
  } catch {
    // ignore
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('pwa_installed_state_changed'));
  }
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    () =>
      globalDeferredPrompt ||
      (typeof window !== 'undefined'
        ? ((window as unknown as { __pwaInstallPrompt?: BeforeInstallPromptEvent; deferredPrompt?: BeforeInstallPromptEvent }).__pwaInstallPrompt ||
           (window as unknown as { __pwaInstallPrompt?: BeforeInstallPromptEvent; deferredPrompt?: BeforeInstallPromptEvent }).deferredPrompt ||
           null)
        : null)
  );
  const [isInstalled, setIsInstalled] = useState<boolean>(checkIsInstalled);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Detect standalone mode (already installed)
    setIsInstalled(checkIsInstalled());

    // Detect iOS devices
    if (typeof window !== 'undefined' && window.navigator) {
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
      setIsIOS(isIOSDevice);
    }

    // Check if prompt was captured globally while component was mounting
    if (!deferredPrompt) {
      const earlyPrompt =
        globalDeferredPrompt ||
        (typeof window !== 'undefined'
          ? ((window as unknown as { __pwaInstallPrompt?: BeforeInstallPromptEvent; deferredPrompt?: BeforeInstallPromptEvent }).__pwaInstallPrompt ||
             (window as unknown as { __pwaInstallPrompt?: BeforeInstallPromptEvent; deferredPrompt?: BeforeInstallPromptEvent }).deferredPrompt ||
             null)
          : null);
      if (earlyPrompt) {
        setDeferredPrompt(earlyPrompt);
      }
    }

    const listener = (prompt: BeforeInstallPromptEvent | null) => {
      setDeferredPrompt(prompt);
      if (!prompt) {
        if (checkIsInstalled()) setIsInstalled(true);
      }
    };

    promptListeners.add(listener);

    const handleAppInstalled = () => {
      notifyPWAInstalled();
      setIsInstalled(true);
      setDeferredPrompt(null);
      globalDeferredPrompt = null;
      if (typeof window !== 'undefined') {
        (window as unknown as { __pwaInstallPrompt: unknown; deferredPrompt: unknown }).__pwaInstallPrompt = null;
        (window as unknown as { __pwaInstallPrompt: unknown; deferredPrompt: unknown }).deferredPrompt = null;
      }
    };

    const handleStateChange = () => {
      setIsInstalled(checkIsInstalled());
    };

    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('pwa_installed_state_changed', handleStateChange);
    window.addEventListener('storage', handleStateChange);

    return () => {
      promptListeners.delete(listener);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('pwa_installed_state_changed', handleStateChange);
      window.removeEventListener('storage', handleStateChange);
    };
  }, []);

  const install = async (): Promise<boolean> => {
    let activePrompt =
      deferredPrompt ||
      globalDeferredPrompt ||
      (typeof window !== 'undefined'
        ? ((window as unknown as { __pwaInstallPrompt?: BeforeInstallPromptEvent; deferredPrompt?: BeforeInstallPromptEvent }).__pwaInstallPrompt ||
           (window as unknown as { __pwaInstallPrompt?: BeforeInstallPromptEvent; deferredPrompt?: BeforeInstallPromptEvent }).deferredPrompt ||
           null)
        : null);

    // If not immediately available, give a brief window to capture if prompt was firing
    if (!activePrompt && typeof window !== 'undefined') {
      try {
        activePrompt = await new Promise<BeforeInstallPromptEvent | null>((resolve) => {
          let resolved = false;
          const handler = (e: Event) => {
            if (!resolved) {
              resolved = true;
              window.removeEventListener('beforeinstallprompt', handler);
              resolve(e as BeforeInstallPromptEvent);
            }
          };
          window.addEventListener('beforeinstallprompt', handler);
          setTimeout(() => {
            if (!resolved) {
              resolved = true;
              window.removeEventListener('beforeinstallprompt', handler);
              const found =
                (window as unknown as { __pwaInstallPrompt?: BeforeInstallPromptEvent; deferredPrompt?: BeforeInstallPromptEvent }).__pwaInstallPrompt ||
                (window as unknown as { __pwaInstallPrompt?: BeforeInstallPromptEvent; deferredPrompt?: BeforeInstallPromptEvent }).deferredPrompt ||
                globalDeferredPrompt ||
                null;
              resolve(found);
            }
          }, 300);
        });
      } catch {
        // continue
      }
    }

    if (!activePrompt) {
      console.warn('Native install prompt is not currently available from browser');
      return false;
    }

    try {
      // Trigger the browser's native install window dialog immediately
      await activePrompt.prompt();
      const choice = await activePrompt.userChoice;
      if (choice && choice.outcome === 'accepted') {
        notifyPWAInstalled();
        setIsInstalled(true);
        setDeferredPrompt(null);
        globalDeferredPrompt = null;
        if (typeof window !== 'undefined') {
          (window as unknown as { __pwaInstallPrompt: unknown; deferredPrompt: unknown }).__pwaInstallPrompt = null;
          (window as unknown as { __pwaInstallPrompt: unknown; deferredPrompt: unknown }).deferredPrompt = null;
        }
      }
      return true; // The native browser install window was successfully awoken
    } catch (err) {
      console.warn('Native install prompt failed to awake:', err);
      return false;
    }
  };

  return {
    isInstallable: !!(
      deferredPrompt ||
      globalDeferredPrompt ||
      (typeof window !== 'undefined' &&
        ((window as unknown as { __pwaInstallPrompt?: BeforeInstallPromptEvent; deferredPrompt?: BeforeInstallPromptEvent }).__pwaInstallPrompt ||
         (window as unknown as { __pwaInstallPrompt?: BeforeInstallPromptEvent; deferredPrompt?: BeforeInstallPromptEvent }).deferredPrompt))
    ),
    isInstalled,
    isIOS,
    install,
  };
}

let singletonIsOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
const onlineSubscribers = new Set<(online: boolean) => void>();
let isOnlineListenerAttached = false;

function ensureOnlineListeners() {
  if (isOnlineListenerAttached || typeof window === 'undefined') return;
  isOnlineListenerAttached = true;

  const notify = (nextOnline: boolean) => {
    if (singletonIsOnline !== nextOnline) {
      singletonIsOnline = nextOnline;
      onlineSubscribers.forEach(cb => cb(nextOnline));
    }
  };

  window.addEventListener('online', () => notify(true), { passive: true });
  window.addEventListener('offline', () => notify(false), { passive: true });
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : singletonIsOnline
  );

  useEffect(() => {
    ensureOnlineListeners();
    const current = typeof navigator !== 'undefined' ? navigator.onLine : singletonIsOnline;
    singletonIsOnline = current;
    setIsOnline(current);

    const handleUpdate = (online: boolean) => setIsOnline(online);
    onlineSubscribers.add(handleUpdate);
    return () => {
      onlineSubscribers.delete(handleUpdate);
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
  const hasUpdateRef = useRef(false);
  const checkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    hasUpdateRef.current = hasUpdate;
  }, [hasUpdate]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (checkTimerRef.current) clearTimeout(checkTimerRef.current);
      if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
    };
  }, []);

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
        hasUpdateRef.current = true;
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
            hasUpdateRef.current = true;
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

    if (checkTimerRef.current) clearTimeout(checkTimerRef.current);
    checkTimerRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;
      setIsChecking(false);
      if (!hasUpdateRef.current && !waitingWorkerRef.current) {
        setCheckMessage("You're on the latest version ✦");
        if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
        messageTimerRef.current = setTimeout(() => {
          if (isMountedRef.current) setCheckMessage(null);
        }, 3500);
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
