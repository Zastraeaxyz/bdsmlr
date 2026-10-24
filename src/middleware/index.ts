import { createMiddleware } from "@solidjs/start/middleware";
import { buildSocialPreview, isSocialBot } from "~/lib/socialPreview";
import type { SocialPreview } from "~/lib/socialPreview";

export default createMiddleware({
  onRequest: async (event) => {
    const method = event.request.method;
    if (method !== "GET" && method !== "HEAD") return;

    const userAgent = event.request.headers.get("user-agent") ?? "";
    if (!isSocialBot(userAgent)) return;

    const requestUrl = new URL(event.request.url);
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
