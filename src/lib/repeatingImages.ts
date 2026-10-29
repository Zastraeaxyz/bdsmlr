import type { MediaRepresentationItem, Post } from '~/lib/api'
import {
  getPostMediaItems,
  unwrapMediaUrl,
  type PostMediaItem,
} from '~/lib/sanitize'

/**
 * BDSMLR sometimes returns the same media entries for many posts on a blog.
 * For example, https://bdsmlr.com/blog/Rectrix shows three identical images in
 * nearly every post. The server repeats those images in the post media data,
 * so the author's real images are buried under the duplicate entries.
 *
 * Fix: compare the three most recent image posts. An image that appears in at
 * least two of them is treated as a repeating image and hidden from every post
 * in the feed. When the newest post is the one correct exception, this still
 * catches the duplicated images shared by the two older reference posts.
 *
 * URLs are compared without signed query strings, media proxy prefixes, or
 * file extensions, so an image still matches when its signature changes or
 * when one post exposes a GIF original and another exposes the MP4 alternate.
 */

const IMG_TAG_RE = /<img\b[^>]*>/gi
const IMG_SRC_RE = /\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)')/i

function imageSrc(tag: string): string | undefined {
  const match = tag.match(IMG_SRC_RE)
  return match?.[1] ?? match?.[2]
}

export function imageIdentity(url: string): string {
  if (!url) return ''
  const path = unwrapMediaUrl(url).split(/[?#]/, 1)[0]
  return path.replace(/\.[a-z0-9]{1,8}$/i, '').toLowerCase()
}

function addIdentity(identities: Set<string>, url: string | undefined): void {
  if (!url) return
  const identity = imageIdentity(url)
  if (identity) identities.add(identity)
}

export function postImageIdentities(post: Post): Set<string> {
  const identities = new Set<string>()

  for (const item of getPostMediaItems(post)) {
    for (const candidate of [item, ...item.fallbacks]) {
      if (candidate.type === 'image') addIdentity(identities, candidate.url)
    }
  }

  const html = post.content?.html
  if (html) {
    for (const match of html.matchAll(IMG_TAG_RE)) {
      addIdentity(identities, imageSrc(match[0]))
    }
  }

  return identities
}

export function findRepeatingImageIdentities(
  posts: Post[],
): Set<string> {
  const references = posts
    .map((post, index) => ({
      post,
      index,
      identities: postImageIdentities(post),
    }))
    .filter((entry) => entry.identities.size > 0)
    .sort((a, b) => {
      const aTime = a.post.createdAtUnix ?? 0
      const bTime = b.post.createdAtUnix ?? 0
      if (aTime !== bTime) return bTime - aTime
      return a.index - b.index
    })
    .slice(0, 3)

  if (references.length < 3) return new Set()

  const counts = new Map<string, number>()
  for (const { identities } of references) {
    for (const identity of identities) {
      counts.set(identity, (counts.get(identity) ?? 0) + 1)
    }
  }

  let maxCount = 0
  for (const count of counts.values()) {
    maxCount = Math.max(maxCount, count)
  }
  if (maxCount < 2) return new Set()

  const repeating = new Set<string>()
  for (const [identity, count] of counts) {
    if (count === maxCount) repeating.add(identity)
  }
  return repeating
}

function mediaItemMatches(
  item: PostMediaItem,
  identities: ReadonlySet<string>,
): boolean {
  return [item, ...item.fallbacks].some((candidate) =>
    identities.has(imageIdentity(candidate.url)),
  )
}

export function filterRepeatingMediaItems(
  items: PostMediaItem[],
  identities: ReadonlySet<string>,
): PostMediaItem[] {
  if (identities.size === 0) return items
  return items.filter((item) => !mediaItemMatches(item, identities))
}

export function stripRepeatingImagesFromHtml(
  html: string,
  identities: ReadonlySet<string>,
): string {
  if (identities.size === 0) return html
  return html.replace(IMG_TAG_RE, (tag) => {
    const src = imageSrc(tag)
    if (!src) return tag
    return identities.has(imageIdentity(src)) ? '' : tag
  })
}

function representationItemMatches(
  item: MediaRepresentationItem,
  identities: ReadonlySet<string>,
): boolean {
  const urls = [
    item.original?.url,
    ...(item.alternates ?? []).map((alternate) => alternate.url),
  ]
  return urls.some(
    (url) => url != null && identities.has(imageIdentity(url)),
  )
}

function removeRepeatingMedia(post: Post, identities: ReadonlySet<string>): Post {
  const items = post.mediaRepresentation?.items
  if (!items || items.length === 0) return post

  const filtered = items.filter(
    (item) => !representationItemMatches(item, identities),
  )
  if (filtered.length === items.length) return post

  return {
    ...post,
    mediaRepresentation: {
      ...post.mediaRepresentation,
      items: filtered,
    },
  }
}

export function removeRepeatingMediaFromPosts(posts: Post[]): Post[] {
  const identities = findRepeatingImageIdentities(posts)
  if (identities.size === 0) return posts
  return posts.map((post) => removeRepeatingMedia(post, identities))
}
