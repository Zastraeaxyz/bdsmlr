import { Show } from "solid-js";
import { A } from "@solidjs/router";
import { Repeat2 } from "lucide-solid";
import { PostVariant } from "../lib/api";

interface ReblogAttributionProps {
  originBlogName?: string;
  originPostId?: number;
  variant?: number;
}

export function ReblogAttribution(props: ReblogAttributionProps) {
  return (
    <Show
      when={
        props.variant === PostVariant.Reblog &&
        props.originBlogName &&
        props.originPostId
      }
    >
      <div class="flex items-center gap-1.5 pb-2.5 text-sm leading-relaxed text-muted-foreground">
        <Repeat2 class="size-4 shrink-0" />
        <span>reblogged from</span>
        <A
          class="font-medium text-foreground underline-offset-4 hover:underline"
          href={`/post/${props.originPostId}`}
        >
          {props.originBlogName}'s post
        </A>
      </div>
    </Show>
  );
}
