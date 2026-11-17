import type { APIEvent } from '@solidjs/start/server'
import { fetchBlogFeed, FetchError } from '~/lib/rssApi'
import { generateRss, ZASTRAEA_LINKS } from '~/lib/rss'

function cookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null
  for (const part of cookieHeader.split(';')) {
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
  const imagesOnly = url.searchParams.get('images_only') === '1'
  const v2session =
    url.searchParams.get('v2_session') ||
    cookieValue(event.request.headers.get('cookie'), 'v2_session') ||
    undefined

  try {
    const feed = await fetchBlogFeed({
      username: event.params.user,
      page: Number(url.searchParams.get('page')) || undefined,
      v2session,
      includeReblogs: url.searchParams.get('include_reblogs') === '1',
      hideRepeatingImages:
        url.searchParams.get('hide_repeating_images') === '1',
    })

    // Preserve the caller's query params (v2_session, include_reblogs,
    // hide_repeating_images, images_only, zastraea) so feed readers can follow
    // the next link with the same context.
    const nextUrl = feed.hasNext ? new URL(url.href) : null
    if (nextUrl) nextUrl.searchParams.set('page', String(feed.page + 1))

    const xml = generateRss({
      blog: feed.blog,
      posts: feed.posts,
      feedUrl: url.href,
      nextUrl: nextUrl?.href,
      imagesOnly,
      links:
        url.searchParams.get('zastraea') === 'true'
          ? ZASTRAEA_LINKS
          : undefined,
    })

    return new Response(xml, {
      // Browsers only parse (and run the viewer script in) XML documents.
      // application/rss+xml is shown as plain text by Chrome, so use text/xml
      // the same way imaglr and rss.style do. Feed readers accept it.
      headers: { 'Content-Type': 'text/xml; charset=utf-8' },
    })
  } catch (e) {
    // Throw (rather than return) so the 404 Response isn't treated as an
    // unhandled route by h3 and replaced with the framework 404 page.
    if (e instanceof FetchError) {
      throw new Response(e.message, { status: e.status })
    }
    console.error('[rss] error:', e)
    return new Response('Internal server error', { status: 500 })
  }
}
