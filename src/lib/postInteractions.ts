import { createSignal, type Accessor } from "solid-js";
import {
  batchGetLikeStates,
  batchGetReblogStates,
  likePost,
  reblogPost,
  requireUser,
  unlikePost,
  type Post,
} from "./api";
import { currentActorBlogId } from "./activeBlog";

export interface PostInteractionState {
  liked: boolean;
  likesCount: number;
  reblogged: boolean;
  actorReblogCount: number;
  reblogsCount: number;
}

type SignalPair = [
  Accessor<PostInteractionState>,
  (value: PostInteractionState) => PostInteractionState,
];

const signals = new Map<number, SignalPair>();
const loaded = new Set<number>();
const queuedIds = new Set<number>();
let flushTimer: ReturnType<typeof setTimeout> | undefined;

function initialState(post: Post): PostInteractionState {
  return {
    liked: false,
    likesCount: post.likesCount ?? 0,
    reblogged: false,
    actorReblogCount: 0,
    reblogsCount: post.reblogsCount ?? 0,
  };
}

function signalFor(post: Post): SignalPair {
  let pair = signals.get(post.id);
  if (!pair) {
    pair = createSignal(initialState(post));
    signals.set(post.id, pair);
  }
  return pair;
}

function schedule(postId: number) {
  if (!postId || loaded.has(postId) || queuedIds.has(postId)) return;
  queuedIds.add(postId);
  if (typeof window === "undefined") return;

  if (!flushTimer) {
    flushTimer = setTimeout(() => {
      flushTimer = undefined;
      void flush();
    }, 20);
  }
}

async function flush() {
  const ids = [...queuedIds];
  queuedIds.clear();
  if (ids.length === 0) return;

  let actorId: number | null = null;
  try {
    requireUser();
    actorId = currentActorBlogId();
  } catch {
    return;
  }
  if (!actorId) return;

  try {
    const [likeStates, reblogStates] = await Promise.all([
      batchGetLikeStates(ids, actorId),
      batchGetReblogStates(ids, actorId),
    ]);

    for (const id of ids) {
      loaded.add(id);
      const pair = signals.get(id);
      if (!pair) continue;
      const current = pair[0]();
      const like = likeStates.states?.find((s) => s.postId === id);
      const reblog = reblogStates.states?.find((s) => s.postId === id);
      pair[1]({
        ...current,
        liked: like?.liked ?? current.liked,
        reblogged: (reblog?.actorReblogCount ?? 0) > 0,
        actorReblogCount: reblog?.actorReblogCount ?? 0,
      });
    }
  } catch {
    for (const id of ids) loaded.add(id);
  }
}

export function usePostInteraction(post: Post) {
  const [state, setState] = signalFor(post);
  schedule(post.id);
  return state;
}

export async function toggleLike(post: Post): Promise<void> {
  requireUser();
  const actorId = currentActorBlogId();
  if (!actorId) throw new Error("Not authenticated");
  const [, setState] = signalFor(post);
  const prev = signalFor(post)[0]();
  const nextLiked = !prev.liked;

  setState({
    ...prev,
    liked: nextLiked,
    likesCount: Math.max(0, prev.likesCount + (nextLiked ? 1 : -1)),
  });

  try {
    const res = nextLiked
      ? await likePost(post.id, actorId)
      : await unlikePost(post.id, actorId);
    if (res.ok === false || res.error) {
      throw new Error(res.error?.message || "Could not update like");
    }
    const count = res.state?.likes_count ?? res.state?.likesCount;
    const current = signalFor(post)[0]();
    setState({
      ...current,
      liked: res.state?.liked ?? nextLiked,
      likesCount: count ?? current.likesCount,
    });
  } catch (err) {
    setState(prev);
    throw err;
  }
}

export async function reblog(
  post: Post,
  opts: { mode?: "live" | "queue"; comment?: string; tags?: string[] } = {},
): Promise<"live" | "queue"> {
  requireUser();
  const actorId = currentActorBlogId();
  if (!actorId) throw new Error("Not authenticated");
  const [, setState] = signalFor(post);
  const mode = opts.mode ?? "live";

  const res = await reblogPost(post.id, actorId, { ...opts, mode });
  if (res.ok === false || res.error) {
    throw new Error(res.error?.message || "Could not reblog post");
  }
  if (mode === "live") {
    const current = signalFor(post)[0]();
    setState({
      ...current,
      reblogged: true,
      actorReblogCount: current.actorReblogCount + 1,
      reblogsCount: current.reblogsCount + 1,
    });
  }
  return mode;
}

export function clearPostInteractions(): void {
  signals.clear();
  loaded.clear();
  queuedIds.clear();
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = undefined;
  }
}
