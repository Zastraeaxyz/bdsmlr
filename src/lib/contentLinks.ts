import {
  mirrorBlogUrl,
  mirrorPostUrl,
  mirrorTagUrl,
} from "~/lib/mirrorLinks"

/**
 * Hosts under bdsmlr.com that serve infrastructure instead of blogs, plus the
 * main site's own route names. Links to these stay on bdsmlr.com.
 */
const INFRA_SUBDOMAINS = new Set([
  "www",
  "media",
  "static",
  "assets",
  "account",
  "api",
  "api-prod",
  "blog",
  "tagged",
  "post",
  "settings",
  "messages",
  "login",
  "dashboard",
])

const BDSMLR_URL_RE =
  /https?:\/\/(?:[a-z0-9-]+\.)*bdsmlr\.com(?::\d+)?(?:\/[^\s<>"'`&]*)?/gi

function splitTrailingPunctuation(raw: string): {
  url: string
  suffix: string
} {
  let url = raw
  let suffix = ""
  const match = url.match(/[.,;:!?]+$/)
  if (match) {
    suffix = match[0]
    url = url.slice(0, -suffix.length)
  }
  while (url.endsWith(")")) {
    const opens = url.match(/\(/g)?.length ?? 0
    const closes = url.match(/\)/g)?.length ?? 0
    if (closes <= opens) break
    url = url.slice(0, -1)
    suffix = ")" + suffix
  }
  return { url, suffix }
}

function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment)
  } catch {
    return segment
  }
}

/** Map one bdsmlr.com URL to the app's own route, or null to leave it alone. */
function mirroredUrl(url: URL): string | null {
  const host = url.hostname.toLowerCase()
  const path = url.pathname

  if (host === "bdsmlr.com" || host === "www.bdsmlr.com") {
    const blog = path.match(/^\/blog\/([^/]+)\/?$/i)
    if (blog) return mirrorBlogUrl(decodeSegment(blog[1]))

    const post = path.match(/^\/post\/(\d+)\/?$/i)
    if (post) return mirrorPostUrl(undefined, post[1])

    const tag = path.match(/^\/tagged\/([^/]+)\/?$/i)
    if (tag) return mirrorTagUrl(decodeSegment(tag[1]))

    return null
  }

  const sub = host.match(/^([a-z0-9-]+)\.bdsmlr\.com$/)
  if (!sub) return null

  const blogName = sub[1]
  if (INFRA_SUBDOMAINS.has(blogName) || /^(?:cdn|ocdn)\d+$/.test(blogName)) {
    return null
  }

  const post = path.match(/^\/post\/(\d+)\/?$/i)
  if (post) return mirrorPostUrl(blogName, post[1])

  if (path === "" || path === "/") return mirrorBlogUrl(blogName)

  return null
}

/**
 * Point bdsmlr.com blog, post, and tag URLs at this app. The rewrite runs over
 * the whole HTML string, so both `href` values and the visible link text (which
 * is usually the URL itself) change together.
 */
export function rewriteBdsmlrLinks(html: string): string {
  if (!html || !/bdsmlr\.com/i.test(html)) return html
  return html.replace(BDSMLR_URL_RE, (match) => {
    const { url, suffix } = splitTrailingPunctuation(match)
    let parsed: URL
    try {
      parsed = new URL(url)
    } catch {
      return match
    }
    const mirrored = mirroredUrl(parsed)
    return mirrored ? `${mirrored}${suffix}` : match
  })
}
