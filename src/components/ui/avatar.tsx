import { Show, splitProps, type ComponentProps } from "solid-js";
import { cx } from "@/lib/cva";

export type AvatarProps = ComponentProps<"span"> & {
  src?: string | null;
  alt?: string;
  fallback?: string;
};

export function Avatar(props: AvatarProps) {
  const [local, rest] = splitProps(props, ["class", "src", "alt", "fallback"]);
  const initials = () =>
    (local.fallback ?? "?")
      .split(/[\s_-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");

  return (
    <span
      data-slot="avatar"
      class={cx(
        "relative flex size-8 shrink-0 overflow-hidden rounded-full bg-muted text-muted-foreground",
        local.class,
      )}
      {...rest}
    >
      <Show
        when={local.src}
        fallback={
          <span class="flex size-full items-center justify-center text-xs font-medium">
            {initials()}
          </span>
        }
      >
        <img
          src={local.src!}
          alt={local.alt ?? ""}
          class="aspect-square size-full object-cover"
          loading="lazy"
        />
      </Show>
    </span>
  );
}
