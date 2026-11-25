import { createSignal, createEffect, on, type Accessor } from 'solid-js'
import { getBlog } from './api'

const avatarCache = new Map<number, string>()
const inflight = new Map<number, Promise<string | null>>()

/** Avatars are decoration, so never let them crowd out feed requests. */
const MAX_CONCURRENT = 4
let active = 0
const waiting: Array<() => void> = []

function acquire(): Promise<void> {
  if (active < MAX_CONCURRENT) {
    active += 1
    return Promise.resolve()
  }
  return new Promise((resolve) => waiting.push(resolve))
}

function release(): void {
  const next = waiting.shift()
  if (next) {
    next()
    return
  }
  active -= 1
}

export function getCachedBlogAvatar(blogId: number): string | null {
  return avatarCache.get(blogId) ?? null
}

/** Share an avatar we already received from another get-blog call. */
export function rememberBlogAvatar(
  blogId: number | null | undefined,
  url: string | null | undefined,
): void {
  if (!blogId || !url) return
  avatarCache.set(blogId, url)
}

export function fetchBlogAvatar(blogId: number): Promise<string | null> {
  const cached = avatarCache.get(blogId)
  if (cached) return Promise.resolve(cached)
  const pending = inflight.get(blogId)
  if (pending) return pending
  const promise = (async () => {
    await acquire()
    try {
      const already = avatarCache.get(blogId)
      if (already) return already
      const res = await getBlog(blogId)
      const url = res.blog?.avatarUrl ?? null
      if (url) avatarCache.set(blogId, url)
      return url
    } catch {
      return null
    } finally {
      release()
    }
  })().finally(() => inflight.delete(blogId))
  inflight.set(blogId, promise)
  return promise
}

export function useBlogAvatar(
  blogId: Accessor<number | null | undefined>,
): Accessor<string | null> {
  const [avatar, setAvatar] = createSignal<string | null>(null)

  createEffect(
    on(blogId, (id) => {
      setAvatar(null)
      if (!id) return
      const cached = getCachedBlogAvatar(id)
      if (cached) {
        setAvatar(cached)
        return
      }
      fetchBlogAvatar(id).then((url) => {
        if (url) setAvatar(url)
      })
    }),
  )

  return avatar
}
