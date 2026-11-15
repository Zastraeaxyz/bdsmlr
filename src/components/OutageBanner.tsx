import { Show } from "solid-js";
import { features } from "~/lib/features";
import { DISCORD_URL } from "~/lib/links";

export default function OutageBanner() {
  return (
    <Show when={features.bdsmlrOutageBanner}>
      <div class="outage-banner" role="status">
        <strong>BDSMLR is having an outage.</strong>
        <span>
          This site loads everything through BDSMLR, so feeds, posts, search,
          messages, and account actions will not work until BDSMLR is back.
          Updates are posted in the{" "}
          <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer">
            Discord
          </a>
          .
        </span>
      </div>
    </Show>
  );
}
