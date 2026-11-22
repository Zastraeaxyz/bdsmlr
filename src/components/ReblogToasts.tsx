import { createEffect, For, onCleanup, Show } from "solid-js";
import { AlertCircle, Loader2 } from "lucide-solid";
import type { ReblogPhase } from "~/lib/reblog";
import {
  dismissReblogJob,
  reblogJobs,
  retryReblogJob,
  type ReblogJob,
} from "~/lib/reblogJobs";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Progress } from "./ui/progress";

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
      <div
        class="fixed inset-x-3 bottom-20 z-50 flex flex-col gap-2 md:left-auto md:right-4 md:w-96"
        aria-live="polite"
      >
        <For each={reblogJobs()}>
          {(job) => (
            <Card
              class="shadow-xl"
              classList={{ "border-destructive": job.status === "error" }}
              role={job.status === "error" ? "alert" : undefined}
            >
              <CardContent class="flex flex-col gap-3 p-4">
                <div class="flex items-start gap-2">
                  <Show
                    when={job.status === "running"}
                    fallback={<AlertCircle class="mt-0.5 size-4 text-destructive" />}
                  >
                    <Loader2 class="mt-0.5 size-4 animate-spin text-primary" />
                  </Show>
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-medium">{toastTitle(job)}</p>
                    <Show when={job.status === "running"}>
                      <Progress class="mt-2 h-1 animate-pulse" value={65} />
                    </Show>
                    <Show when={job.status === "error"}>
                      <p class="mt-1 text-xs text-muted-foreground">{job.error}</p>
                    </Show>
                  </div>
                </div>
                <Show when={job.status === "error"}>
                  <div class="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => dismissReblogJob(job.id)}
                    >
                      Dismiss
                    </Button>
                    <Button size="sm" onClick={() => retryReblogJob(job.id)}>
                      Retry
                    </Button>
                  </div>
                </Show>
              </CardContent>
            </Card>
          )}
        </For>
      </div>
    </Show>
  );
}
