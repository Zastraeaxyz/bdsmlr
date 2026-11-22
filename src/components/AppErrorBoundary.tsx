import { createEffect, ErrorBoundary, on, type JSX } from "solid-js";
import { A, useLocation } from "@solidjs/router";
import { AlertTriangle } from "lucide-solid";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Button } from "./ui/button";

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export function AppErrorBoundary(props: {
  children: JSX.Element;
  compact?: boolean;
}) {
  const location = useLocation();
  let resetBoundary: (() => void) | undefined;

  createEffect(
    on(
      () => [location.pathname, location.search],
      () => resetBoundary?.(),
      { defer: true },
    ),
  );

  return (
    <ErrorBoundary
      fallback={(error, reset) => {
        resetBoundary = reset;
        return (
          <Alert
            variant="destructive"
            class="mx-auto my-6 w-[calc(100%-2rem)] max-w-2xl"
            role="alert"
          >
            <AlertTriangle class="size-4" />
            <AlertTitle>
              {props.compact
                ? "Could not load this section"
                : "Something went wrong"}
            </AlertTitle>
            <AlertDescription class="flex flex-col items-start gap-3">
              <span>
                {props.compact
                  ? "The rest of the page is still available."
                  : "This page ran into a problem. Try again or head back to your feed."}
              </span>
              <div class="flex flex-wrap gap-2">
                <Button type="button" size="sm" onClick={() => reset()}>
                  Try again
                </Button>
                <Button as={A} href="/home" variant="outline" size="sm">
                  Go to feed
                </Button>
              </div>
              <details class="w-full text-xs text-muted-foreground">
                <summary class="cursor-pointer select-none">
                  Technical details
                </summary>
                <pre class="mt-2 overflow-x-auto rounded-md bg-background/60 p-3">
                  {errorMessage(error)}
                </pre>
              </details>
            </AlertDescription>
          </Alert>
        );
      }}
    >
      {props.children}
    </ErrorBoundary>
  );
}
