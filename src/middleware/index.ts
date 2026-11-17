import { createMiddleware } from "@solidjs/start/middleware";
import { buildSocialPreview, isSocialBot } from "~/lib/socialPreview";
import type { SocialPreview } from "~/lib/socialPreview";
import { hasCookie } from "~/lib/cookies";
import { classifyRoute } from "~/lib/routeGate";

/** Where to send a signed-out visitor, so they come back after signing in. */
function loginRedirect(requestUrl: URL): Response {
  const next = `${requestUrl.pathname}${requestUrl.search}`;
  return new Response(null, {
    status: 302,
    headers: {
      Location: `/login?next=${encodeURIComponent(next)}`,
      "Cache-Control": "private, no-store",
      Vary: "Cookie",
    },
  });
}

export default createMiddleware({
  onRequest: async (event) => {
    const method = event.request.method;
    if (method !== "GET" && method !== "HEAD") return;

    const userAgent = event.request.headers.get("user-agent") ?? "";
    const socialBot = isSocialBot(userAgent);
    const requestUrl = new URL(event.request.url);
    const pathname = requestUrl.pathname;
    const gate = classifyRoute(pathname);

    const authed =
      !socialBot &&
      hasCookie(event.request.headers.get("cookie"), "v2_session");

    event.locals.authed = authed;
    event.locals.guest = !authed && !socialBot;

    // Social bots keep today's behaviour: they never log in, and they always
    // get rendered metadata rather than a redirect.
    if (socialBot) {
      if (
        pathname.startsWith("/_build/") ||
        pathname.startsWith("/assets/") ||
        pathname.startsWith("/api/") ||
        pathname.startsWith("/v2/")
      ) {
        return;
      }

      const proto =
        event.request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
        requestUrl.protocol.replace(":", "");
      const host = (
        event.request.headers.get("x-forwarded-host") ||
        event.request.headers.get("host") ||
        requestUrl.host
      )
        .split(",")[0]
        .trim();
      const url = new URL(
        `${pathname}${requestUrl.search}`,
        `${proto}://${host}`,
      );

      try {
        const preview = await buildSocialPreview(url);
        if (preview) {
          (event.locals as { socialPreview?: SocialPreview }).socialPreview =
            preview;
        }
      } catch (error) {
        console.error("[social-preview] failed:", error);
      }
      return;
    }

    // Profile HTML differs by session (signed-in renders the feed, signed-out
    // renders the login gate), so it must never be cached publicly.
    if (!authed && (gate === "gated" || gate === "profile")) {
      event.response.headers.set("Vary", "Cookie");
      event.response.headers.set("Cache-Control", "private, no-store");
    }

    if (!authed && gate === "gated") {
      return loginRedirect(requestUrl);
    }
  },
});
