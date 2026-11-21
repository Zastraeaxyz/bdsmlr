import { createEffect, For, onCleanup, Show } from "solid-js";
import type { ReblogPhase } from "~/lib/reblog";
import {
  dismissReblogJob,
  reblogJobs,
  retryReblogJob,
  type ReblogJob,
} from "~/lib/reblogJobs";

const PHASE_LABEL: Record<ReblogPhase, string> = {
  preparing: "Preparing reblog…",
  submitting: "Submitting to BDSMLR…",
  confirming: "Confirming the reblog…",
};

function toastTitle(job: ReblogJob): string {
  if (job.status === "running") return PHASE_LABEL[job.phase];
  return job.mode === "queue"
    ? "Could not queue post"
    : "Could not reblog post";
}

function preventLeave(event: BeforeUnloadEvent): void {
  event.preventDefault();
  event.returnValue = "";
}

export function ReblogToasts() {
  createEffect(() => {
    const active = reblogJobs().some((job) => job.status === "running");
    if (typeof window === "undefined") return;
    window.removeEventListener("beforeunload", preventLeave);
    if (active) window.addEventListener("beforeunload", preventLeave);
  });

  onCleanup(() => {
    if (typeof window !== "undefined") {
      window.removeEventListener("beforeunload", preventLeave);
    }
  });

  return (
    <Show when={reblogJobs().length > 0}>
      <div class="reblog-toast-layer" aria-live="polite">
        <For each={reblogJobs()}>
          {(job) => (
            <div
              class={`reblog-toast reblog-toast-${job.status}`}
              role={job.status === "error" ? "alert" : undefined}
            >
              <div class="reblog-toast-main">
                <Show when={job.status === "running"}>
                  <span class="reblog-toast-spinner" aria-hidden="true" />
                </Show>
                <Show when={job.status === "error"}>
                  <span class="reblog-toast-error-icon" aria-hidden="true">
                    !
                  </span>
                </Show>
                <div class="reblog-toast-text">
                  <p class="reblog-toast-title">{toastTitle(job)}</p>
                  <Show when={job.status === "running"}>
                    <div class="reblog-toast-progress" aria-hidden="true">
                      <span />
                    </div>
                  </Show>
                  <Show when={job.status === "error"}>
                    <p class="reblog-toast-detail">{job.error}</p>
                  </Show>
                </div>
              </div>
              <Show when={job.status === "error"}>
                <div class="reblog-toast-actions">
                  <button
                    type="button"
                    class="btn-ghost"
                    onClick={() => retryReblogJob(job.id)}
                  >
                    Retry
                  </button>
                  <button
                    type="button"
                    class="btn-ghost"
                    onClick={() => dismissReblogJob(job.id)}
                  >
                    Dismiss
                  </button>
                </div>
              </Show>
            </div>
          )}
        </For>
      </div>
    </Show>
  );
}
