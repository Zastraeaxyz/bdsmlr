import { onCleanup, onMount } from "solid-js";
import { A } from "@solidjs/router";
import { DiscordInvite } from "~/components/DiscordInvite";
import { trackEvent } from "~/lib/analytics";

/** Only allow same-site paths, so `next` cannot become an open redirect. */
function safeNext(next: string | undefined): string | null {
  if (!next) return null;
  if (!next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

/**
 * Shown to signed-out visitors on pages that keep their public shell (profile
 * headers, shared post links). It deliberately has no dismiss control: no
 * close button, no backdrop click, and no Escape handler.
 */
export function LoginGateModal(props: { next?: string }) {
  let loginRef: HTMLAnchorElement | undefined;
  let previousOverflow = "";

  onMount(() => {
    if (typeof document === "undefined") return;
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    loginRef?.focus();
    onCleanup(() => {
      document.body.style.overflow = previousOverflow;
    });
  });

  const loginHref = () => {
    const next = safeNext(props.next);
    return next ? `/login?next=${encodeURIComponent(next)}` : "/login";
  };

  return (
    <div class="login-gate-backdrop">
      <div
        class="login-gate-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-gate-title"
        aria-describedby="login-gate-body"
      >
        <h2 id="login-gate-title">Sign in to keep browsing</h2>
        <p id="login-gate-body">
          Better BDSMLR is a signed-in experience. Log in with your BDSMLR
          account to see feeds, profiles, search, messages, and more.
        </p>
        <A
          ref={loginRef}
          href={loginHref()}
          class="landing-cta login-gate-cta"
          onClick={() =>
            trackEvent("cta-click", { target: "login", location: "gate" })
          }
        >
          Log in
        </A>
        <DiscordInvite location="gate" />
      </div>
    </div>
  );
}
