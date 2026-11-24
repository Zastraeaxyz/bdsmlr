import { describe, expect, it } from 'vitest'
import { generateRss, ZASTRAEA_LINKS } from '~/lib/rss'
import { GIF_ORIGINAL_WITH_DEAD_MP4_ALTERNATES } from '~/lib/mediaFixtures'
import type { Blog, Post } from '~/lib/api'

const blog: Blog = { id: '163642', name: 'Thecagestore' }

const taggedPost: Post = {
  ...GIF_ORIGINAL_WITH_DEAD_MP4_ALTERNATES,
  tags: ['chastity', 'cage life'],
}

const textOnlyPost: Post = {
  id: 900000001,
  blogName: 'Thecagestore',
  content: { text: 'Just a few words' },
}

/** Post 858018067 stores its HTML as a JSON string literal. */
const escapedLinkPost: Post = {
  id: 900000004,
  blogName: 'Thecagestore',
  content: {
    html: JSON.stringify(
      '<p>gifs from <a href="https://kingnothing55.bdsmlr.com/">https://kingnothing55.bdsmlr.com/</a></p>',
    ).replace(/\//g, '\\/'),
  },
}

const videoOnlyPost: Post = {
  id: 900000002,
  blogName: 'Thecagestore',
  mediaRepresentation: {
    kind: 3,
    items: [
      {
        kind: 1,
        original: {
          mimeType: 'video/mp4',
          url: 'https://ocdn012.bdsmlr.com/uploads/videos/2026/05/170839/bdsmlr-170839-clip.mp4?e=1',
        },
        alternates: [],
      },
    ],
  },
}

const mixedPost: Post = {
  id: 900000003,
  blogName: 'Thecagestore',
  mediaRepresentation: {
    kind: 3,
    items: [
      {
        kind: 1,
        original: {
          mimeType: 'image/jpeg',
          url: 'https://ocdn012.bdsmlr.com/uploads/photos/2026/05/170839/bdsmlr-170839-still.jpg?e=1',
        },
        alternates: [],
      },
      {
        kind: 1,
        original: {
          mimeType: 'video/mp4',
          url: 'https://ocdn012.bdsmlr.com/uploads/videos/2026/05/170839/bdsmlr-170839-clip.mp4?e=1',
        },
        alternates: [],
      },
    ],
  },
}

describe('generateRss', () => {
  it('uses an image fallback instead of a dead video alternate', () => {
    const xml = generateRss({
      blog,
      posts: [GIF_ORIGINAL_WITH_DEAD_MP4_ALTERNATES],
      feedUrl: 'https://bdsmlr.zastraea.xyz/api/rss/Thecagestore',
    })

    expect(xml).toContain('bdsmlr-170839-3pjj815a2w.gif')
    expect(xml).toContain('type="image/gif"')
    expect(xml).not.toContain('bdsmlr-170839-3pjj815a2w.mp4')
  })

  it('adds the browser viewer script and the next link', () => {
    const xml = generateRss({
      blog,
      posts: [taggedPost],
      feedUrl: 'https://bbdsmlr.vercel.app/Thecagestore/rss?page=1',
      nextUrl: 'https://bbdsmlr.vercel.app/Thecagestore/rss?page=2',
    })

    expect(xml).toContain(
      '<script xmlns="http://www.w3.org/1999/xhtml" src="https://bbdsmlr.vercel.app/rss-viewer.js"/>',
    )
    expect(xml).toContain('href="https://bbdsmlr.vercel.app/Thecagestore/rss?page=2"')
    expect(xml).toContain('rel="next"')
  })

  it('keeps only image posts when images only is on', () => {
    const xml = generateRss({
      blog,
      posts: [taggedPost, videoOnlyPost, textOnlyPost],
      feedUrl: 'https://bbdsmlr.vercel.app/Thecagestore/rss?images_only=1',
      imagesOnly: true,
    })

    expect(xml).toContain(`https://bdsmlr.com/post/${taggedPost.id}`)
    expect(xml).not.toContain(`https://bdsmlr.com/post/${videoOnlyPost.id}`)
    expect(xml).not.toContain(`https://bdsmlr.com/post/${textOnlyPost.id}`)
  })

  it('strips video attachments from mixed posts when images only is on', () => {
    const feedUrl = 'https://bbdsmlr.vercel.app/Thecagestore/rss?images_only=1'
    const filtered = generateRss({
      blog,
      posts: [mixedPost],
      feedUrl,
      imagesOnly: true,
    })
    const unfiltered = generateRss({ blog, posts: [mixedPost], feedUrl })

    expect(filtered).toContain('bdsmlr-170839-still.jpg')
    expect(filtered).not.toContain('bdsmlr-170839-clip.mp4')
    expect(filtered).toContain(`https://bdsmlr.com/post/${mixedPost.id}`)
    expect(unfiltered).toContain('bdsmlr-170839-clip.mp4')
  })

  it('links to bdsmlr.com by default', () => {
    const xml = generateRss({
      blog,
      posts: [taggedPost],
      feedUrl: 'https://bbdsmlr.vercel.app/Thecagestore/rss',
    })

    expect(xml).toContain('https://bdsmlr.com/blog/Thecagestore')
    expect(xml).toContain(`https://bdsmlr.com/post/${taggedPost.id}`)
    expect(xml).toContain('https://bdsmlr.com/tagged/chastity')
    expect(xml).toContain('https://bdsmlr.com/tagged/cage%20life')
    expect(xml).not.toContain('bdsmlr.zastraea.xyz')
  })

  it('links to bdsmlr.zastraea.xyz when asked', () => {
    const xml = generateRss({
      blog,
      posts: [taggedPost],
      feedUrl: 'https://bbdsmlr.vercel.app/Thecagestore/rss?zastraea=true',
      links: ZASTRAEA_LINKS,
    })

    expect(xml).toContain('https://bdsmlr.zastraea.xyz/Thecagestore<')
    expect(xml).toContain(
      `https://bdsmlr.zastraea.xyz/Thecagestore/post/${taggedPost.id}`,
    )
    expect(xml).toContain(
      'https://bdsmlr.zastraea.xyz/home?tag_name=tag%3Achastity',
    )
    expect(xml).toContain(
      'https://bdsmlr.zastraea.xyz/home?tag_name=tag%3A%22cage%20life%22',
    )
    expect(xml).not.toContain('https://bdsmlr.com/blog/')
    expect(xml).not.toContain('https://bdsmlr.com/tagged/')
  })

  it('points post body links at the mirror when asked', () => {
    const feedUrl = 'https://bbdsmlr.vercel.app/Thecagestore/rss'
    const defaultXml = generateRss({
      blog,
      posts: [escapedLinkPost],
      feedUrl,
    })
    const mirrorXml = generateRss({
      blog,
      posts: [escapedLinkPost],
      feedUrl,
      links: ZASTRAEA_LINKS,
    })

    expect(defaultXml).toContain('https://kingnothing55.bdsmlr.com/')
    expect(defaultXml).not.toContain('bdsmlr.zastraea.xyz/kingnothing55')
    expect(mirrorXml).toContain('https://bdsmlr.zastraea.xyz/kingnothing55')
    expect(mirrorXml).not.toContain('kingnothing55.bdsmlr.com')
    expect(mirrorXml).not.toContain('\\/')
  })

  it('keeps the guid on bdsmlr.com in both modes', () => {
    const feedUrl = 'https://bbdsmlr.vercel.app/Thecagestore/rss'
    const defaultXml = generateRss({ blog, posts: [taggedPost], feedUrl })
    const mirrorXml = generateRss({
      blog,
      posts: [taggedPost],
      feedUrl,
      links: ZASTRAEA_LINKS,
    })

    const guid = `<guid isPermaLink="false">https://bdsmlr.com/post/${taggedPost.id}</guid>`
    expect(defaultXml).toContain(guid)
    expect(mirrorXml).toContain(guid)
  })
})
