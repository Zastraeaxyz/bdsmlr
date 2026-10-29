import { describe, expect, it } from 'vitest'
import type { Post } from '~/lib/api'
import {
  filterRepeatingMediaItems,
  findRepeatingImageIdentities,
  imageIdentity,
  postImageIdentities,
  removeRepeatingMediaFromPosts,
  stripRepeatingImagesFromHtml,
} from '~/lib/repeatingImages'
import { getPostMediaItems } from '~/lib/sanitize'

function imagePost(
  id: number,
  urls: string[],
  createdAtUnix: number,
  html?: string,
): Post {
  return {
    id,
    createdAtUnix,
    content: html ? { html } : undefined,
    mediaRepresentation: {
      items: urls.map((url) => ({
        original: { url, mimeType: 'image/jpeg' },
        alternates: [],
      })),
    },
  }
}

const base = 'https://ocdn012.bdsmlr.com/uploads/photos/2026/05/1'

describe('imageIdentity', () => {
  it('ignores signed query strings and file extensions', () => {
    expect(imageIdentity(`${base}/abc.jpg?e=1&t=one`)).toBe(`${base}/abc`)
    expect(imageIdentity(`${base}/abc.gif?e=2&t=two`)).toBe(`${base}/abc`)
  })

  it('unwraps the media proxy before comparing', () => {
    expect(
      imageIdentity(`https://media.bdsmlr.com/feed/s3://ocdn012.bdsmlr.com/uploads/photos/2026/05/1/abc.webp?e=1`),
    ).toBe(`${base}/abc`)
  })

  it('normalizes case', () => {
    expect(imageIdentity(`${base}/ABC.JPG`)).toBe(`${base}/abc`)
  })
})

describe('postImageIdentities', () => {
  it('collects media items and inline images', () => {
    const post = imagePost(
      1,
      [`${base}/media.jpg`],
      1,
      `<p>body</p><img src="${base}/inline.png?e=1" />`,
    )

    expect([...postImageIdentities(post)].sort()).toEqual([
      `${base}/inline`,
      `${base}/media`,
    ])
  })
})

describe('findRepeatingImageIdentities', () => {
  it('finds images shared across the three most recent image posts', () => {
    const posts = [
      imagePost(3, [`${base}/common.jpg`, `${base}/newest.jpg`], 3),
      imagePost(2, [`${base}/common.jpg`, `${base}/middle.jpg`], 2),
      imagePost(1, [`${base}/common.jpg`, `${base}/oldest.jpg`], 1),
    ]

    expect([...findRepeatingImageIdentities(posts)]).toEqual([
      `${base}/common`,
    ])
  })

  it('still finds repeats when the newest post is the correct exception', () => {
    const posts = [
      imagePost(3, [`${base}/newest.jpg`], 3),
      imagePost(2, [`${base}/common.jpg`, `${base}/middle.jpg`], 2),
      imagePost(
        1,
        [`${base}/common.jpg`, `${base}/oldest.jpg`],
        1,
      ),
    ]

    expect([...findRepeatingImageIdentities(posts)]).toEqual([
      `${base}/common`,
    ])
  })

  it('ignores posts without images and needs three image posts', () => {
    const posts = [
      imagePost(4, [], 4),
      imagePost(3, [`${base}/a.jpg`], 3),
      imagePost(2, [`${base}/a.jpg`], 2),
    ]

    expect([...findRepeatingImageIdentities(posts)]).toEqual([])
  })

  it('returns nothing when each image appears only once', () => {
    const posts = [
      imagePost(3, [`${base}/a.jpg`], 3),
      imagePost(2, [`${base}/b.jpg`], 2),
      imagePost(1, [`${base}/c.jpg`], 1),
    ]

    expect([...findRepeatingImageIdentities(posts)]).toEqual([])
  })

  it('uses only the most common set of repeated images', () => {
    const posts = [
      imagePost(
        3,
        [`${base}/common.jpg`, `${base}/almost.jpg`],
        3,
      ),
      imagePost(
        2,
        [`${base}/common.jpg`, `${base}/almost.jpg`],
        2,
      ),
      imagePost(1, [`${base}/common.jpg`, `${base}/oldest.jpg`], 1),
    ]

    expect([...findRepeatingImageIdentities(posts)]).toEqual([
      `${base}/common`,
    ])
  })
})

describe('filterRepeatingMediaItems', () => {
  it('removes media whose signature or extension differs', () => {
    const post = imagePost(
      1,
      [`${base}/keep.jpg`, `${base}/remove.jpg`],
      1,
    )
    const identities = new Set([`${base}/remove`])

    expect(
      filterRepeatingMediaItems(getPostMediaItems(post), identities).map(
        (item) => item.url,
      ),
    ).toEqual([`${base}/keep.jpg`])
  })
})

describe('stripRepeatingImagesFromHtml', () => {
  it('removes only images that match a repeating identity', () => {
    const html = `<p>body</p><img src="${base}/remove.jpg?e=1" /><img src="${base}/keep.jpg" />`

    expect(stripRepeatingImagesFromHtml(html, new Set([`${base}/remove`]))).toBe(
      `<p>body</p><img src="${base}/keep.jpg" />`,
    )
  })
})

describe('removeRepeatingMediaFromPosts', () => {
  it('strips repeating images from every post in the reference set', () => {
    const posts = [
      imagePost(3, [`${base}/common.jpg`, `${base}/newest.jpg`], 3),
      imagePost(2, [`${base}/common.jpg`, `${base}/middle.jpg`], 2),
      imagePost(1, [`${base}/common.jpg`, `${base}/oldest.jpg`], 1),
    ]

    const filtered = removeRepeatingMediaFromPosts(posts)

    expect(filtered.map((post) => getPostMediaItems(post).map((item) => item.url))).toEqual([
      [`${base}/newest.jpg`],
      [`${base}/middle.jpg`],
      [`${base}/oldest.jpg`],
    ])
    expect(posts[0].mediaRepresentation?.items).toHaveLength(2)
  })
})
