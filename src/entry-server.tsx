// @refresh reload
import { createHandler, StartServer } from "@solidjs/start/server";
import { getRequestEvent } from "solid-js/web";
import { Show } from "solid-js";
import { SocialMeta } from "~/components/SocialMeta";
import type { SocialPreview } from "~/lib/socialPreview";

export default createHandler(() => (
  <StartServer
    document={({ assets, children, scripts }) => {
      const event = getRequestEvent() as
        | { locals?: { socialPreview?: SocialPreview; authed?: boolean } }
        | undefined;
      const socialPreview = event?.locals?.socialPreview;
      const authed = event?.locals?.authed === true;
      const preview =
        process.env.PREVIEW === "1" ||
        process.env.RAILWAY_ENVIRONMENT === "preview";
      return (
        <html
          lang="en"
          data-kb-theme="dark"
          data-preview={preview ? "true" : undefined}
          data-authed={authed ? "true" : undefined}
        >
          <head>
            <meta charset="utf-8" />
            <meta
              name="viewport"
              content="width=device-width, initial-scale=1, viewport-fit=cover"
            />
            <link rel="icon" type="image/png" sizes="64x64" href="/favicon.png" />
            <link rel="manifest" href="/manifest.webmanifest" />
            <meta name="theme-color" content="#0d1117" />
            <link
              rel="apple-touch-icon"
              sizes="180x180"
              href="/icons/apple-touch-icon.png"
            />
            <meta name="mobile-web-app-capable" content="yes" />
            <meta name="apple-mobile-web-app-capable" content="yes" />
            <meta name="apple-mobile-web-app-title" content="bbdsmlr" />
            <meta
              name="apple-mobile-web-app-status-bar-style"
              content="black-translucent"
            />
            <Show when={socialPreview}>
              <SocialMeta meta={socialPreview} />
            </Show>
            <Show when={preview}>
              <meta name="robots" content="noindex, nofollow" />
            </Show>
            <Show when={!preview}>
              <script
                defer
                src="https://umami-production-6edd.up.railway.app/script.js"
                data-website-id="19de5ccc-4af5-4220-85ff-b83209ffa29e"
                data-auto-pageview="false"
                data-do-not-track="true"
              ></script>
            </Show>
            {assets}
          </head>
          <body>
            <div id="app">{children}</div>
            {scripts}
          </body>
        </html>
      );
    }}
  />
));
