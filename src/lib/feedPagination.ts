import type { Post } from './api'

export function freshPosts(existing: Post[], incoming: Post[]): Post[] {
  const seen = new Set(existing.map((post) => post.id))
  const fresh: Post[] = []
  for (const post of incoming) {
    if (!post || seen.has(post.id)) continue
    seen.add(post.id)
    fresh.push(post)
  }
  return fresh
}

/**
 * Take up to `limit` posts from the front of `incoming`, skipping ids already
 * in `seen` and removing them from `incoming` as it goes. Used when an endpoint
 * returns more posts than the page should show at once.
 */
export function takeFreshPosts(
  incoming: Post[],
  limit: number,
  seen: Set<number>,
): Post[] {
  const taken: Post[] = []
  while (incoming.length > 0 && taken.length < limit) {
    const post = incoming.shift()
    if (!post || seen.has(post.id)) continue
    seen.add(post.id)
    taken.push(post)
  }
  return taken
}
