import { DISCORD_URL } from "~/lib/links";
import { DiscordIcon } from "~/components/Icons";
import { trackEvent } from "~/lib/analytics";

/**
 * A small, always optional nudge to the community Discord. BDSMLR is invite
 * only, so the Discord is where people ask for one.
 */
export function DiscordInvite(props: { location: string }) {
  return (
    <p class="flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground">
      <DiscordIcon class="size-4" />
      <span>
        Need a BDSMLR invite?{" "}
        <a
          class="font-medium text-primary underline-offset-4 hover:underline"
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
