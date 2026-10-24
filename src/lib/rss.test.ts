import { describe, expect, it } from 'vitest'
import { generateRss } from '~/lib/rss'
import { GIF_ORIGINAL_WITH_DEAD_MP4_ALTERNATES } from '~/lib/mediaFixtures'
import type { Blog } from '~/lib/api'

const blog: Blog = { id: '163642', name: 'Thecagestore' }

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
})
