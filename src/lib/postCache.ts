import type { Post } from "~/lib/api";

const cache = new Map<number, Post>();

export function getCachedPost(postId: number): Post | undefined {
  return cache.get(postId);
}

export function setCachedPost(post: Post) {
  cache.set(post.id, post);
}
