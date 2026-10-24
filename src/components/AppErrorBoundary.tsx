import { createEffect, ErrorBoundary, on, type JSX } from "solid-js";
import { A, useLocation } from "@solidjs/router";

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
          <section
            class={
              props.compact
                ? "error-boundary error-boundary-compact"
                : "error-boundary"
            }
            role="alert"
          >
            <h2>
              {props.compact
                ? "Could not load this section"
                : "Something went wrong"}
            </h2>
            <p>
              {props.compact
                ? "The rest of the page is still available."
                : "This page ran into a problem. Try again or head back to your feed."}
            </p>
            <div class="error-boundary-actions">
              <button type="button" onClick={() => reset()}>
                Try again
              </button>
              <A href="/home" class="btn-ghost">
                Go to feed
              </A>
            </div>
            <details class="error-boundary-details">
              <summary>Technical details</summary>
              <pre>{errorMessage(error)}</pre>
            </details>
          </section>
        );
      }}
    >
      {props.children}
    </ErrorBoundary>
  );
}
