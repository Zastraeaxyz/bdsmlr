import { createSignal } from "solid-js";
import type { Post } from "./api";
import { reblog } from "./postInteractions";
import type { ReblogPhase } from "./reblog";

export type ReblogMode = "live" | "queue";
export type ReblogJobStatus = "running" | "error" | "done";

export interface ReblogJob {
  id: number;
  post: Post;
  mode: ReblogMode;
  comment?: string;
  tags: string[];
  status: ReblogJobStatus;
  phase: ReblogPhase;
  error: string;
  createdAt: number;
}

export interface ReblogJobInput {
  post: Post;
  mode: ReblogMode;
  comment?: string;
  tags?: string[];
}

const DONE_DISMISS_MS = 4000;

const [jobs, setJobs] = createSignal<ReblogJob[]>([]);
const dismissTimers = new Map<number, ReturnType<typeof setTimeout>>();
let nextId = 1;

/** Reactive list of reblog jobs, newest first. */
export const reblogJobs = jobs;

function updateJob(id: number, patch: Partial<ReblogJob>): void {
  setJobs((prev) =>
    prev.map((job) => (job.id === id ? { ...job, ...patch } : job)),
  );
}

function clearDismissTimer(id: number): void {
  const timer = dismissTimers.get(id);
  if (timer) {
    clearTimeout(timer);
    dismissTimers.delete(id);
  }
}

async function runJob(id: number): Promise<void> {
  const job = jobs().find((item) => item.id === id);
  if (!job) return;

  clearDismissTimer(id);
  updateJob(id, { status: "running", phase: "preparing", error: "" });

  try {
    await reblog(job.post, {
      mode: job.mode,
      comment: job.comment,
      tags: job.tags,
      onProgress: (phase) => updateJob(id, { phase }),
    });
    updateJob(id, { status: "done" });
    const timer = setTimeout(() => dismissReblogJob(id), DONE_DISMISS_MS);
    dismissTimers.set(id, timer);
  } catch (err: unknown) {
    updateJob(id, {
      status: "error",
      error: (err as Error)?.message || "Could not reblog post",
    });
  }
}

/**
 * Starts a reblog without blocking the caller. The composer can close right
 * away and the user keeps browsing while the job runs in the toast layer.
 */
export function startReblogJob(input: ReblogJobInput): number {
  const running = jobs().find(
    (job) => job.status === "running" && job.post.id === input.post.id,
  );
  if (running) return running.id;

  const job: ReblogJob = {
    id: nextId++,
    post: input.post,
    mode: input.mode,
    comment: input.comment,
    tags: input.tags ?? [],
    status: "running",
    phase: "preparing",
    error: "",
    createdAt: Date.now(),
  };

  setJobs((prev) => [
    job,
    ...prev.filter(
      (item) => item.post.id !== job.post.id || item.status === "running",
    ),
  ]);
  void runJob(job.id);
  return job.id;
}

export function retryReblogJob(id: number): void {
  const job = jobs().find((item) => item.id === id);
  if (!job || job.status === "running") return;
  void runJob(id);
}

export function dismissReblogJob(id: number): void {
  const job = jobs().find((item) => item.id === id);
  if (!job || job.status === "running") return;
  clearDismissTimer(id);
  setJobs((prev) => prev.filter((item) => item.id !== id));
}
