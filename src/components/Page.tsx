import type { JSX } from "solid-js";
import { cx } from "@/lib/cva";
import Header from "./Header";

const WIDTHS = {
  sm: "max-w-xl",
  md: "max-w-2xl",
  lg: "max-w-4xl",
  xl: "max-w-6xl",
} as const;

export function Page(props: {
  info?: string;
  actions?: JSX.Element;
  children: JSX.Element;
  width?: keyof typeof WIDTHS;
  padded?: boolean;
  class?: string;
}) {
  return (
    <div class="flex min-h-dvh flex-col">
      <Header info={props.info}>{props.actions}</Header>
      <main
        class={cx(
          "mx-auto flex w-full flex-1 flex-col",
          WIDTHS[props.width ?? "md"],
          props.padded === false ? "" : "px-3 py-4 sm:px-4",
          props.class,
        )}
      >
        {props.children}
      </main>
    </div>
  );
}

export function PageHeader(props: {
  title: string;
  description?: string;
  actions?: JSX.Element;
}) {
  return (
    <div class="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0">
        <h1 class="text-xl font-semibold tracking-tight">{props.title}</h1>
        {props.description && (
          <p class="mt-1 text-sm text-muted-foreground">
            {props.description}
          </p>
        )}
      </div>
      {props.actions && (
        <div class="flex shrink-0 items-center gap-2">{props.actions}</div>
      )}
    </div>
  );
}
