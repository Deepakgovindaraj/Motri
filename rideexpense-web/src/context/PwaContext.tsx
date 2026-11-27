import React, { createContext, useContext, useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface PwaContextValue {
  canInstall: boolean;
  isInstalled: boolean;
  isIosInstallable: boolean;
  updateReady: boolean;
  promptDismissed: boolean;
  installApp: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
  dismissPrompt: () => void;
  applyUpdate: () => void;
}

const PwaContext = createContext<PwaContextValue | undefined>(undefined);
const DISMISSED_KEY = 'vehixa_pwa_prompt_dismissed';

function isRunningStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    Boolean(nav.standalone)
  );
}

function isIosSafari(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  return isIos && isSafari;
}

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(() => isRunningStandalone());
  const [promptDismissed, setPromptDismissed] = useState<boolean>(
    () => localStorage.getItem(DISMISSED_KEY) === 'true',
  );
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    const media = window.matchMedia('(display-mode: standalone)');
    const handleDisplayChange = () => setIsInstalled(isRunningStandalone());

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);
    media.addEventListener('change', handleDisplayChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
      media.removeEventListener('change', handleDisplayChange);
    };
  }, []);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    let refreshing = false;
    const onControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        if (reg.waiting) {
          setWaitingWorker(reg.waiting);
        }
        reg.addEventListener('updatefound', () => {
          const installing = reg.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              setWaitingWorker(installing);
            }
          });
        });
      })
      .catch(() => {
        // Ignore service worker registration errors in unsupported contexts
      });

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);

  const installApp = async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    if (!deferredPrompt) return 'unavailable';
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsInstalled(true);
    }
    return choice.outcome;
  };

  const dismissPrompt = () => {
    localStorage.setItem(DISMISSED_KEY, 'true');
    setPromptDismissed(true);
  };

  const applyUpdate = () => {
    if (!waitingWorker) return;
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
  };

  return (
    <PwaContext.Provider
      value={{
        canInstall: Boolean(deferredPrompt) && !isInstalled,
        isInstalled,
        isIosInstallable: !isInstalled && isIosSafari(),
        updateReady: Boolean(waitingWorker),
        promptDismissed,
        installApp,
        dismissPrompt,
        applyUpdate,
      }}
    >
      {children}
    </PwaContext.Provider>
  );
}

export function usePwa(): PwaContextValue {
  const ctx = useContext(PwaContext);
  if (!ctx) throw new Error('usePwa must be used within PwaProvider');
  return ctx;
}
