import type { APIEvent } from '@solidjs/start/server'
import { cachedResolveIdentifier, cachedGetBlog } from '~/lib/rssApi'

function cookieValue(cookie: string | null, name: string): string | null {
  if (!cookie) return null
  for (const part of cookie.split(';')) {
    const eq = part.indexOf('=')
    if (eq === -1) continue
    if (part.slice(0, eq).trim() === name) {
      return decodeURIComponent(part.slice(eq + 1).trim())
    }
  }
  return null
}

export async function GET(event: APIEvent) {
  const url = new URL(event.request.url)
  const username = url.searchParams.get('user')
  const v2session = cookieValue(event.request.headers.get('cookie'), 'v2_session')

  let privateBlog = false
  if (username) {
    try {
      // Anonymous probe: is this blog readable without a session?
      const resolved = await cachedResolveIdentifier(username)
      if (resolved.blogId) {
        let blogVisible = false
        try {
          const blogData = await cachedGetBlog(resolved.blogId)
          blogVisible = !!blogData.blog
        } catch {
          blogVisible = false
        }
        privateBlog = !blogVisible
      }
    } catch {}
  }

  return new Response(JSON.stringify({ private: privateBlog, v2session }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  })
}
