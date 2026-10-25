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
      return (
        <html lang="en" data-authed={authed ? "true" : undefined}>
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <link rel="icon" href="/favicon.ico" />
            <Show when={socialPreview}>
              <SocialMeta meta={socialPreview} />
            </Show>
            <script
              defer
              src="https://umami-production-6edd.up.railway.app/script.js"
              data-website-id="19de5ccc-4af5-4220-85ff-b83209ffa29e"
              data-auto-pageview="false"
            ></script>
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
