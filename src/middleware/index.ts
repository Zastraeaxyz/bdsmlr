import { createMiddleware } from "@solidjs/start/middleware";
import { buildSocialPreview, isSocialBot } from "~/lib/socialPreview";
import type { SocialPreview } from "~/lib/socialPreview";
import { hasCookie } from "~/lib/cookies";

export default createMiddleware({
  onRequest: async (event) => {
    const method = event.request.method;
    const isPreview =
      process.env.PREVIEW === "1" ||
      process.env.RAILWAY_ENVIRONMENT === "preview";
    if (isPreview) {
      event.response.headers.set("X-Robots-Tag", "noindex, nofollow");
    }
    if (method !== "GET" && method !== "HEAD") return;

    const userAgent = event.request.headers.get("user-agent") ?? "";
    const socialBot = isSocialBot(userAgent);
    const requestUrl = new URL(event.request.url);
    const isAuthPage =
      requestUrl.pathname === "/" || requestUrl.pathname === "/home";

    event.locals.authed =
      !socialBot &&
      hasCookie(event.request.headers.get("cookie"), "v2_session");

    if (isAuthPage) {
      event.response.headers.set("Vary", "Cookie");
      event.response.headers.set("Cache-Control", "private, no-store");
    }

    if (!socialBot) return;

    if (
      requestUrl.pathname.startsWith("/_build/") ||
      requestUrl.pathname.startsWith("/assets/") ||
      requestUrl.pathname.startsWith("/api/") ||
      requestUrl.pathname.startsWith("/v2/")
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
      `${requestUrl.pathname}${requestUrl.search}`,
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
  },
});
