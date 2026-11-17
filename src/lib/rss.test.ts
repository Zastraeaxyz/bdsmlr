import { describe, expect, it } from 'vitest'
import { generateRss, ZASTRAEA_LINKS } from '~/lib/rss'
import { GIF_ORIGINAL_WITH_DEAD_MP4_ALTERNATES } from '~/lib/mediaFixtures'
import type { Blog, Post } from '~/lib/api'

const blog: Blog = { id: '163642', name: 'Thecagestore' }

const taggedPost: Post = {
  ...GIF_ORIGINAL_WITH_DEAD_MP4_ALTERNATES,
  tags: ['chastity', 'cage life'],
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
