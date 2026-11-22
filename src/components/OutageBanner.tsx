import { Show } from "solid-js";
import { AlertTriangle } from "lucide-solid";
import { features } from "~/lib/features";
import { DISCORD_URL } from "~/lib/links";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";

export default function OutageBanner() {
  return (
    <Show when={features.bdsmlrOutageBanner}>
      <Alert
        variant="warning"
        class="mx-auto w-full max-w-3xl rounded-none border-x-0 border-t-0"
        role="status"
      >
        <AlertTriangle class="size-4" />
        <AlertTitle>BDSMLR is having an outage.</AlertTitle>
        <AlertDescription>
          This site loads everything through BDSMLR, so feeds, posts, search,
          messages, and account actions will not work until BDSMLR is back.
          Updates are posted in the{" "}
          <a
            class="font-medium underline underline-offset-4"
            href={DISCORD_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Discord
          </a>
          .
        </AlertDescription>
      </Alert>
    </Show>
  );
}
