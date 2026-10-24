import { createMemo, createSignal, For, Show } from "solid-js";
import {
  linkifyDescription,
  truncateDescription,
} from "~/lib/blogDescription";

const TWEET_LENGTH = 280;

export function BlogDescription(props: { text: string }) {
  const [expanded, setExpanded] = createSignal(false);
  const tokens = createMemo(() => linkifyDescription(props.text));
  const preview = createMemo(() => truncateDescription(tokens(), TWEET_LENGTH));
  const visible = () => (expanded() ? tokens() : preview().tokens);

  return (
    <>
      <p class="blog-description">
        <For each={visible()}>
          {(token) =>
            token.type === "link" ? (
              <a
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
        <button
          type="button"
          class="blog-description-toggle"
          onClick={() => setExpanded(!expanded())}
        >
          {expanded() ? "Show less" : "Show more"}
        </button>
      </Show>
    </>
  );
}
