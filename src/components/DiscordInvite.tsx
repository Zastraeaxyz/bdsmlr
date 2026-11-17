import { DISCORD_URL } from "~/lib/links";
import { DiscordIcon } from "~/components/Icons";
import { trackEvent } from "~/lib/analytics";

/**
 * A small, always optional nudge to the community Discord. BDSMLR is invite
 * only, so the Discord is where people ask for one.
 */
export function DiscordInvite(props: { location: string }) {
  return (
    <p class="discord-invite">
      <DiscordIcon class="icon" />
      <span>
        Need a BDSMLR invite?{" "}
        <a
          href={DISCORD_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() =>
            trackEvent("cta-click", {
              target: "discord",
              location: props.location,
            })
          }
        >
          Join the Discord
        </a>
      </span>
    </p>
  );
}
