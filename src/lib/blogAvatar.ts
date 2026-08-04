import { createSignal, createEffect, on, type Accessor } from 'solid-js'
import { getBlog } from './api'

const avatarCache = new Map<number, string>()
const inflight = new Map<number, Promise<string | null>>()

export function getCachedBlogAvatar(blogId: number): string | null {
  return avatarCache.get(blogId) ?? null
}

export function fetchBlogAvatar(blogId: number): Promise<string | null> {
  const cached = avatarCache.get(blogId)
  if (cached) return Promise.resolve(cached)
  const pending = inflight.get(blogId)
  if (pending) return pending
  const promise = getBlog(blogId)
    .then((res) => {
      const url = res.blog?.avatarUrl ?? null
      if (url) avatarCache.set(blogId, url)
      return url
    })
    .catch(() => null)
    .finally(() => inflight.delete(blogId))
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
