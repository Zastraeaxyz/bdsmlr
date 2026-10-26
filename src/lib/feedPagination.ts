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
