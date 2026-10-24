import RSS from 'rss'
import type { Blog, Post } from './api'
import { getPostMediaItems } from './sanitize'

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

function postDescription(post: Post): string {
  const parts: string[] = []

  const html = post.content?.html
    ? post.content.html.replace(/<(?:img|video)\b[^>]*>/gi, '')
    : undefined

  if (html) {
    parts.push(html)
  } else if (post.content?.text) {
    parts.push(`<p>${post.content.text}</p>`)
  }

  const text = post.body
  if (text && !html) {
    parts.push(`<p>${text}</p>`)
  }

  if (post.variant === 2 && post.originBlogName) {
    parts.push(`<p><em>Reblogged from ${post.originBlogName}</em></p>`)
  }

  if (post.tags && post.tags.length > 0) {
    parts.push(
      '<p>' +
        post.tags
          .map(
            (t) =>
              `<a href="https://bdsmlr.com/tagged/${encodeURIComponent(t)}">#${t}</a>`,
          )
          .join(' ') +
        '</p>',
    )
  }

  return parts.join('\n')
}

function postTitle(post: Post): string {
  if (post.title) return post.title
  const text = post.content?.text || post.body
  if (text) {
    return text.length > 80 ? text.substring(0, 80) + '...' : text
  }
  return `Post ${post.id}`
}

interface RssInput {
  blog: Blog
  posts: Post[]
  feedUrl: string
  nextUrl?: string
}

export function generateRss({ blog, posts, feedUrl, nextUrl }: RssInput): string {
  const feed = new RSS({
    title: blog.title || blog.name,
    description: blog.description || '',
    feed_url: feedUrl,
    site_url: `https://bdsmlr.com/blog/${blog.name}`,
    generator: 'bbdmslr',
    custom_namespaces: {
      media: 'http://search.yahoo.com/mrss/',
    },
    custom_elements: nextUrl
      ? [{ 'atom:link': { _attr: { href: nextUrl, rel: 'next' } } }]
      : [],
  })

  for (const post of posts) {
    const media = getRssMedia(post)

    const itemOpts: RSS.ItemOptions = {
      title: postTitle(post),
      description: postDescription(post),
      url: `https://bdsmlr.com/post/${post.id}`,
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
