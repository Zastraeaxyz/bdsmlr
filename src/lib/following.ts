import { blogFollowGraph, type FollowEdge } from "./api"

const KEY_PREFIX = "following_ids"
const LEGACY_KEY = "following_ids"

function keyFor(blogId: number): string {
  return `${KEY_PREFIX}:${blogId}`
}

export async function fetchAllFollowingIds(blogId: number): Promise<number[]> {
  const all: FollowEdge[] = []
  let pageToken: string | undefined
  while (true) {
    const graph = await blogFollowGraph(blogId, pageToken)
    all.push(...(graph.following || []))
    pageToken = graph.nextPageToken
    if (!pageToken) break
  }
  return all.map((f) => Number(f.blogId))
}

export function getCachedFollowingIds(blogId?: number | null): number[] {
  if (!blogId) return []
  try {
    const stored = localStorage.getItem(keyFor(blogId))
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

export function setCachedFollowingIds(ids: number[], blogId?: number | null): void {
  if (!blogId) return
  localStorage.setItem(keyFor(blogId), JSON.stringify(ids))
}

export function addCachedFollowingId(id: number, blogId?: number | null): void {
  if (!blogId) return
  const ids = new Set(getCachedFollowingIds(blogId))
  ids.add(id)
  setCachedFollowingIds([...ids], blogId)
}

export function removeCachedFollowingId(id: number, blogId?: number | null): void {
  if (!blogId) return
  setCachedFollowingIds(
    getCachedFollowingIds(blogId).filter((value) => value !== id),
    blogId,
  )
}

export function clearCachedFollowingIds(blogId?: number | null): void {
  if (typeof window === "undefined") return
  if (blogId) {
    localStorage.removeItem(keyFor(blogId))
    return
  }
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i)
    if (key === LEGACY_KEY || key?.startsWith(`${KEY_PREFIX}:`)) {
      localStorage.removeItem(key)
    }
  }
}
