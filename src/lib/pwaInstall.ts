import { createSignal } from "solid-js";

/**
 * Chrome and Edge fire `beforeinstallprompt` when the app meets the install
 * criteria. The event has to be caught and stored early, before the user opens
 * Settings, or the chance to show our own install button is lost.
 */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
};

export type InstallOutcome = "accepted" | "dismissed" | "unavailable";

const [deferredPrompt, setDeferredPrompt] =
  createSignal<BeforeInstallPromptEvent | null>(null);
const [installed, setInstalled] = createSignal(false);

let initialized = false;

function runningStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const iosStandalone =
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
    true;
  return (
    window.matchMedia("(display-mode: standalone)").matches || iosStandalone
  );
}

/** Call once from the client entry before the app mounts. */
export function initPwaInstall(): void {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  setInstalled(runningStandalone());

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    setDeferredPrompt(event as BeforeInstallPromptEvent);
  });

  window.addEventListener("appinstalled", () => {
    setDeferredPrompt(null);
    setInstalled(true);
  });

  const displayMode = window.matchMedia("(display-mode: standalone)");
  if (typeof displayMode.addEventListener === "function") {
    displayMode.addEventListener("change", () =>
      setInstalled(runningStandalone()),
    );
  }
}

export function isInstalled(): boolean {
  return installed();
}

export function canInstall(): boolean {
  return deferredPrompt() !== null && !installed();
}

export function promptInstall(): Promise<InstallOutcome> {
  const event = deferredPrompt();
  if (!event) return Promise.resolve("unavailable");
  setDeferredPrompt(null);

  return event
    .prompt()
    .then(() => event.userChoice)
    .then((choice) =>
      choice.outcome === "accepted" ? "accepted" : "dismissed",
    )
    .catch(() => "dismissed" as const);
}

/** What to tell people when their browser will not show an install prompt. */
export function installHelpText(): string {
  if (typeof navigator === "undefined") return "";
  const ua = navigator.userAgent;
  const isIos =
    /iPad|iPhone|iPod/.test(ua) ||
    (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
  const isSafari =
    /Safari/.test(ua) &&
    !/Chrome|Chromium|CriOS|Edg|OPR|Firefox|FxiOS/.test(ua);

  if (isIos && isSafari) {
    return "Tap Share, then choose Add to Home Screen.";
  }
  if (isIos) {
    return "Open this site in Safari, then use Share > Add to Home Screen.";
  }
  if (/Android/i.test(ua)) {
    return "Open Chrome's menu and choose Install app or Add to Home screen.";
  }
  return "Use the install icon in your browser's address bar, or look for Install app in its menu.";
}
