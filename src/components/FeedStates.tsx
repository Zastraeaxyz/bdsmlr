import { For, Show, type JSX } from "solid-js";
import { Card } from "./ui/card";
import { Skeleton } from "./ui/skeleton";

export function FeedSkeleton(props: { count?: number }) {
  return (
    <div class="flex flex-col gap-2 sm:gap-3">
      <For each={Array.from({ length: props.count ?? 3 })}>
        {() => (
          <Card class="gap-3 rounded-none border-x-0 bg-card p-3 shadow-none sm:rounded-xl sm:border-x">
            <div class="flex items-center gap-2">
              <Skeleton class="size-9 rounded-full" />
              <div class="flex-1 space-y-1.5">
                <Skeleton class="h-3.5 w-32" />
                <Skeleton class="h-3 w-20" />
              </div>
            </div>
            <div class="space-y-2">
              <Skeleton class="h-4 w-4/5" />
              <Skeleton class="h-4 w-full" />
              <Skeleton class="h-4 w-3/5" />
            </div>
            <Skeleton class="aspect-[4/3] w-full rounded-lg" />
          </Card>
        )}
      </For>
    </div>
  );
}

export function EmptyState(props: { children: JSX.Element; title?: string }) {
  return (
    <div class="flex flex-col items-center gap-1 px-4 py-16 text-center">
      <Show when={props.title}>
        <p class="text-base font-medium">{props.title}</p>
      </Show>
      <p class="text-sm text-muted-foreground">{props.children}</p>
    </div>
  );
}
