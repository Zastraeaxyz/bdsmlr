import { createMemo, createSignal, For, Show } from "solid-js";
import {
  linkifyDescription,
  truncateDescription,
} from "~/lib/blogDescription";
import { Button } from "./ui/button";

const TWEET_LENGTH = 280;

export function BlogDescription(props: { text: string }) {
  const [expanded, setExpanded] = createSignal(false);
  const tokens = createMemo(() => linkifyDescription(props.text));
  const preview = createMemo(() => truncateDescription(tokens(), TWEET_LENGTH));
  const visible = () => (expanded() ? tokens() : preview().tokens);

  return (
    <>
      <p class="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
        <For each={visible()}>
          {(token) =>
            token.type === "link" ? (
              <a
                class="text-primary underline-offset-4 hover:underline"
                href={token.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                {token.value}
              </a>
            ) : (
              token.value
            )
          }
        </For>
      </p>
      <Show when={preview().truncated}>
        <Button
          type="button"
          variant="link"
          size="sm"
          class="h-auto p-0 text-xs"
          onClick={() => setExpanded(!expanded())}
        >
          {expanded() ? "Show less" : "Show more"}
        </Button>
      </Show>
    </>
  );
}
