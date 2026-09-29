"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

const DISMISSED_KEY = "install-prompt-dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

type Mode = "hidden" | "ios" | "android";

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  // iPadOS 13+ reports a desktop-Mac UA by default; touch support is what still gives it away.
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1)
  );
}

function readDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === "true";
  } catch {
    return false;
  }
}

function writeDismissed() {
  try {
    localStorage.setItem(DISMISSED_KEY, "true");
  } catch {
    // ignore — worst case the banner reappears next visit
  }
}

// beforeinstallprompt only fires on Chromium browsers, never on iOS Safari — detecting the platform
// up front (rather than waiting for that event) is the only way to show iOS its own, separate
// "Zum Home-Bildschirm" instructions instead of nothing at all.
function getMode(): Mode {
  try {
    if (isStandalone() || readDismissed()) return "hidden";
    return isIos() ? "ios" : "android";
  } catch {
    // matchMedia/navigator access failing means we can't tell if install even applies — fail closed.
    return "hidden";
  }
}

// None of the inputs to `getMode` change in a way worth re-rendering for — this only exists so
// `useSyncExternalStore` can read browser-only values without a server/client hydration mismatch.
function subscribeNever() {
  return () => {};
}

function getServerMode(): Mode {
  return "hidden";
}

export function InstallPrompt() {
  const mode = useSyncExternalStore(subscribeNever, getMode, getServerMode);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (mode !== "android") return;
    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    }
    // Fires regardless of how the user installed (this banner's button, the browser's own address-bar
    // icon or menu) — without this, the banner would keep offering to install an already-installed app.
    function handleAppInstalled() {
      writeDismissed();
      setDeferredPrompt(null);
      setDismissed(true);
    }
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [mode]);

  function dismiss() {
    writeDismissed();
    setDismissed(true);
  }

  async function install() {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      // Only remember a decline for the session (not permanently) — the user might install later via
      // the browser's own UI, or just want to be asked again next visit.
      if (outcome === "accepted") dismiss();
    } catch {
      // The captured prompt can only be used once; a stale/consumed event throws on re-use.
      setDeferredPrompt(null);
    }
  }

  if (dismissed || mode === "hidden" || (mode === "android" && !deferredPrompt)) return null;

  return (
    <div className="flex w-full items-start justify-between gap-3 bg-primary px-4 py-3 text-primary-foreground text-sm">
      <p className="flex-1">
        {deferredPrompt
          ? "App installieren für schnelleren Zugriff und Offline-Nutzung."
          : "App installieren: Teilen-Symbol tippen, dann “Zum Home-Bildschirm” wählen."}
      </p>
      <div className="flex shrink-0 gap-2">
        {deferredPrompt && (
          <Button size="sm" variant="secondary" onClick={install}>
            Installieren
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="text-primary-foreground"
          aria-label="Schließen"
          onClick={dismiss}
        >
          ✕
        </Button>
      </div>
    </div>
  );
}
