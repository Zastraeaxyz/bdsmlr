import RSS from 'rss'
import type { Blog, Post } from './api'
import { decodeEscapedHtml, getPostMediaItems } from './sanitize'
import { rewriteBdsmlrLinks } from './contentLinks'
import { mirrorBlogUrl, mirrorPostUrl, mirrorTagUrl } from './mirrorLinks'

/** Builds the page links a feed points at. */
export interface RssLinks {
  /** The blog's page. */
  blog(blogName: string): string
  /** A single post's page. */
  post(blogName: string, postId: string | number): string
  /** A tag search. */
  tag(tag: string): string
}

/** Links into bdsmlr.com, the default for every feed. */
export const BDSMLR_LINKS: RssLinks = {
  blog: (name) => `https://bdsmlr.com/blog/${name}`,
  post: (_name, id) => `https://bdsmlr.com/post/${id}`,
  tag: (tag) => `https://bdsmlr.com/tagged/${encodeURIComponent(tag)}`,
}

/**
 * Links into this app at bdsmlr.zastraea.xyz. The mirror serves the app's own
 * routes, so posts live under `/<blog>/post/<id>` and tags under `/home`.
 */
export const ZASTRAEA_LINKS: RssLinks = {
  blog: (name) => mirrorBlogUrl(name),
  post: (name, id) => mirrorPostUrl(name, id),
  tag: (tag) => mirrorTagUrl(tag),
}

/**
 * Script browsers run when they open a feed URL. Feed readers ignore it, so
 * this is how the feed tells a browser apart from a reader. See
 * `public/rss-viewer.js`.
 */
const RSS_VIEWER_PATH = '/rss-viewer.js'

function viewerScriptUrl(feedUrl: string): string {
  try {
    return new URL(RSS_VIEWER_PATH, feedUrl).href
  } catch {
    return RSS_VIEWER_PATH
  }
}

function getRssMedia(post: Post) {
  const seen = new Set<string>()
  return getPostMediaItems(post)
    .map((item) => {
      if (item.type === 'image') return item
      return item.fallbacks.find((fallback) => fallback.type === 'image') ?? item
    })
    .filter((item) => {
      if (seen.has(item.url)) return false
      seen.add(item.url)
      return true
    })
}

function getMimeType(url: string): string {
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'png':
      return 'image/png'
    case 'gif':
      return 'image/gif'
    case 'webp':
      return 'image/webp'
    case 'svg':
      return 'image/svg+xml'
    case 'bmp':
      return 'image/bmp'
    case 'tiff':
    case 'tif':
      return 'image/tiff'
    case 'ico':
      return 'image/x-icon'
    case 'mp4':
      return 'video/mp4'
    case 'webm':
      return 'video/webm'
    case 'ogg':
    case 'ogv':
      return 'video/ogg'
    case 'mov':
      return 'video/quicktime'
    case 'avi':
      return 'video/x-msvideo'
    case 'mkv':
      return 'video/x-matroska'
    default:
      return 'image/jpeg'
  }
}

function postDescription(post: Post, links: RssLinks): string {
  const parts: string[] = []

  const html = post.content?.html
    ? decodeEscapedHtml(post.content.html).replace(/<(?:img|video)\b[^>]*>/gi, '')
    : undefined

  if (html) {
    parts.push(html)
  } else if (post.content?.text) {
    parts.push(`<p>${decodeEscapedHtml(post.content.text)}</p>`)
  }

  const text = post.body
  if (text && !html) {
    parts.push(`<p>${decodeEscapedHtml(text)}</p>`)
  }

  if (post.variant === 2 && post.originBlogName) {
    parts.push(`<p><em>Reblogged from ${post.originBlogName}</em></p>`)
  }

  if (post.tags && post.tags.length > 0) {
    parts.push(
      '<p>' +
        post.tags
          .map((t) => `<a href="${links.tag(t)}">#${t}</a>`)
          .join(' ') +
        '</p>',
    )
  }

  const description = parts.join('\n')
  // The mirror feed should not send readers back to bdsmlr.com from a post body.
  return links === ZASTRAEA_LINKS
    ? rewriteBdsmlrLinks(description)
    : description
}

function postTitle(post: Post): string {
  if (post.title) return post.title
  const text = post.content?.text || post.body
  if (text) {
    const clean = decodeEscapedHtml(text)
    return clean.length > 80 ? clean.substring(0, 80) + '...' : clean
  }
  return `Post ${post.id}`
}

interface RssInput {
  blog: Blog
  posts: Post[]
  feedUrl: string
  nextUrl?: string
  links?: RssLinks
  /** Drop posts without an image and strip video attachments from the rest. */
  imagesOnly?: boolean
}

export function generateRss({
  blog,
  posts,
  feedUrl,
  nextUrl,
  links = BDSMLR_LINKS,
  imagesOnly = false,
}: RssInput): string {
  const feedElements: unknown[] = []
  if (nextUrl) {
    feedElements.push({ 'atom:link': { _attr: { href: nextUrl, rel: 'next' } } })
  }
  // The XHTML namespace is what makes browsers execute the script inside an
  // XML document. Readers ignore the element.
  feedElements.push({
    script: {
      _attr: {
        xmlns: 'http://www.w3.org/1999/xhtml',
        src: viewerScriptUrl(feedUrl),
      },
    },
  })

  const feed = new RSS({
    title: blog.title || blog.name,
    description: blog.description || '',
    feed_url: feedUrl,
    site_url: links.blog(blog.name),
    generator: 'bbdmslr',
    custom_namespaces: {
      media: 'http://search.yahoo.com/mrss/',
    },
    custom_elements: feedElements,
  })

  for (const post of posts) {
    const allMedia = getRssMedia(post)
    const media = imagesOnly
      ? allMedia.filter((entry) => entry.type === 'image')
      : allMedia

    // Images only means image posts, so text-only and video-only posts go.
    if (imagesOnly && media.length === 0) continue

    const itemOpts: RSS.ItemOptions = {
      title: postTitle(post),
      description: postDescription(post, links),
      url: links.post(post.blogName || blog.name, post.id),
      // The GUID identifies an item across feed URLs, so keep it on bdsmlr.com
      // even when links point at a mirror. Otherwise toggling the mirror flag
      // would make readers show every post as new.
      guid: `https://bdsmlr.com/post/${post.id}`,
      date: post.createdAtUnix ? new Date(post.createdAtUnix * 1000) : new Date(),
      author: post.blogName,
      categories: post.tags,
    }

    if (media.length > 0) {
      itemOpts.enclosure = {
        url: media[0].url,
        type: getMimeType(media[0].url),
      }

      itemOpts.custom_elements = media.map((entry) => ({
        'media:content': {
          _attr: {
            url: entry.url,
            type: getMimeType(entry.url),
            medium: entry.type === 'video' ? 'video' : 'image',
          },
        },
      }))
    }

    feed.item(itemOpts)
  }

  return feed.xml({ indent: true })
}
