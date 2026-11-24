import { describe, expect, it } from 'vitest'
import {
  decodeEscapedHtml,
  getMediaType,
  getPostMediaItems,
  getPostMediaUrls,
  sanitizeHtml,
  transformMediaUrl,
  unwrapMediaUrl,
  upgradeToLightbox,
} from '~/lib/sanitize'
import {
  GIF_ORIGINAL_WITH_MP4_ALTERNATES,
  GIF_ORIGINAL_WITH_DEAD_MP4_ALTERNATES,
  WEBP_ORIGINAL_WITH_DEAD_MP4_ALTERNATES,
} from '~/lib/mediaFixtures'

describe('getMediaType', () => {
  it('detects video extensions', () => {
    expect(getMediaType('https://cdn/x.mp4')).toBe('video')
    expect(getMediaType('https://cdn/x.webm')).toBe('video')
    expect(getMediaType('https://cdn/x.mov')).toBe('video')
    expect(getMediaType('https://cdn/x.mp4?e=1&t=2')).toBe('video')
  })

  it('treats everything else as an image', () => {
    expect(getMediaType('https://cdn/x.jpg')).toBe('image')
    expect(getMediaType('https://cdn/x.jpeg')).toBe('image')
    expect(getMediaType('https://cdn/x.png')).toBe('image')
    expect(getMediaType('https://cdn/x.webp')).toBe('image')
    expect(getMediaType('https://cdn/x.gif')).toBe('image')
    expect(getMediaType('https://cdn/x.jpg?e=1&t=2')).toBe('image')
  })

  it('defaults to image when there is no extension', () => {
    expect(getMediaType('https://cdn/x')).toBe('image')
  })
})

describe('getPostMediaUrls', () => {
  it('uses the original when it declares a mime type', () => {
    const post = {
      mediaRepresentation: {
        items: [
          {
            original: { mimeType: 'image/jpeg', url: 'https://cdn/a.jpg' },
            alternates: [{ mimeType: 'video/mp4', url: 'https://cdn/a.mp4' }],
          },
        ],
      },
    }
    expect(getPostMediaUrls(post)).toEqual(['https://cdn/a.jpg'])
  })

  it('prefers a mime-typed alternate for a gif original (gif may be served as video)', () => {
    expect(getPostMediaUrls(GIF_ORIGINAL_WITH_MP4_ALTERNATES)).toEqual([
      'https://ocdn012.bdsmlr.com/uploads/photos/2026/05/170839/bdsmlr-170839-nQ31xdXIZN.mp4?e=1&t=CCCC&cb=DDDD',
    ])
  })

  it('provides the gif original as a fallback when the mp4 alternate is dead', () => {
    expect(getPostMediaItems(GIF_ORIGINAL_WITH_DEAD_MP4_ALTERNATES)).toEqual([
      {
        url: 'https://ocdn012.bdsmlr.com/uploads/photos/2026/08/170839/bdsmlr-170839-3pjj815a2w.mp4?e=3&t=KKKK&cb=LLLL',
        type: 'video',
        fallbacks: [
          {
            url: 'https://ocdn012.bdsmlr.com/uploads/photos/2026/08/170839/bdsmlr-170839-3pjj815a2w.gif?e=3&t=IIII&cb=JJJJ',
            type: 'image',
          },
        ],
      },
    ])
  })

  it('keeps a static-image original even when it lacks a mime type and alternates exist', () => {
    expect(getPostMediaUrls(WEBP_ORIGINAL_WITH_DEAD_MP4_ALTERNATES)).toEqual([
      'https://ocdn012.bdsmlr.com/uploads/photos/2026/01/9644334/bdsmlr-9644334-dSJ8vYpcy6.webp?e=2&t=EEEE&cb=FFFF',
    ])
  })

  it('falls back to the original when there are no usable alternates', () => {
    const post = {
      mediaRepresentation: {
        items: [
          { original: { mimeType: null, url: 'https://cdn/x.gif' }, alternates: [] },
        ],
      },
    }
    expect(getPostMediaUrls(post)).toEqual(['https://cdn/x.gif'])
  })

  it('drops items with no URL at all', () => {
    const post = {
      mediaRepresentation: {
        items: [
          { original: { mimeType: null, url: undefined }, alternates: [] },
        ],
      },
    }
    expect(getPostMediaUrls(post)).toEqual([])
  })

  it('returns an empty array when there is no media representation', () => {
    expect(getPostMediaUrls({})).toEqual([])
    expect(getPostMediaUrls({ mediaRepresentation: { items: [] } })).toEqual([])
  })
})

describe('transformMediaUrl', () => {
  it('routes CDN image URLs through the media proxy', () => {
    expect(
      transformMediaUrl(
        'https://ocdn012.bdsmlr.com/uploads/photos/2026/05/170839/a.jpg?e=1',
        'feed',
      ),
    ).toBe(
      'https://media.bdsmlr.com/feed/s3://ocdn012.bdsmlr.com/uploads/photos/2026/05/170839/a.jpg?e=1',
    )
  })

  it('routes raw media (gif/video) through the raw proxy size', () => {
    expect(
      transformMediaUrl(
        'https://ocdn012.bdsmlr.com/uploads/photos/2026/05/170839/a.gif?e=1',
        'feed',
      ),
    ).toBe(
      'https://media.bdsmlr.com/raw/s3://ocdn012.bdsmlr.com/uploads/photos/2026/05/170839/a.gif?e=1',
    )
  })

  it('leaves non-CDN URLs untouched', () => {
    expect(transformMediaUrl('https://example.com/x.jpg', 'feed')).toBe(
      'https://example.com/x.jpg',
    )
  })
})

describe('unwrapMediaUrl', () => {
  const query = '?e=1792785666&t=8knlL6siS8_Ake0hOCT5v1-fz-OrTvRbQ60xAHBD9gs&cb=1792699266'

  it('unwraps a blog avatar URL to the signing CDN host', () => {
    expect(
      unwrapMediaUrl(
        `https://media.bdsmlr.com/gallery-grid/s3://ocdn012.bdsmlr.com/uploads/blogs/2021/07/10401079/avatar/10401079-sl9EHISBZl1.png${query}`,
      ),
    ).toBe(
      `https://ocdn012.bdsmlr.com/uploads/blogs/2021/07/10401079/avatar/10401079-sl9EHISBZl1.png${query}`,
    )
  })

  it('unwraps blog cover URLs', () => {
    expect(
      unwrapMediaUrl(
        'https://media.bdsmlr.com/gallery-grid/s3://ocdn012.bdsmlr.com/uploads/blogs/2017/03/5737/background/5737-98WN28Rne81.gif?e=1',
      ),
    ).toBe(
      'https://ocdn012.bdsmlr.com/uploads/blogs/2017/03/5737/background/5737-98WN28Rne81.gif?e=1',
    )
  })

  it('leaves CDN and external URLs untouched', () => {
    expect(unwrapMediaUrl('https://ocdn012.bdsmlr.com/uploads/a.jpg?e=1')).toBe(
      'https://ocdn012.bdsmlr.com/uploads/a.jpg?e=1',
    )
    expect(unwrapMediaUrl('https://example.com/x.jpg')).toBe('https://example.com/x.jpg')
  })
})

describe('upgradeToLightbox', () => {
  it('upgrades feed/masonry sizes to lightbox', () => {
    expect(
      upgradeToLightbox('https://media.bdsmlr.com/feed/s3://ocdn/x.jpg'),
    ).toBe('https://media.bdsmlr.com/lightbox/s3://ocdn/x.jpg')
    expect(
      upgradeToLightbox('https://media.bdsmlr.com/masonry/s3://ocdn/x.jpg'),
    ).toBe('https://media.bdsmlr.com/lightbox/s3://ocdn/x.jpg')
  })
})

describe('decodeEscapedHtml', () => {
  const html =
    '<p>got the gifs from <a href="https://kingnothing55.bdsmlr.com/">https://kingnothing55.bdsmlr.com/</a></p>'

  it('decodes a JSON string literal stored as post HTML', () => {
    const escaped = JSON.stringify(html).replace(/\//g, '\\/')
    expect(decodeEscapedHtml(escaped)).toBe(html)
  })

  it('unescapes slashes and quotes without wrapping quotes', () => {
    expect(decodeEscapedHtml('<a href=\\"https:\\/\\/a.bdsmlr.com\\/">x<\\/a>')).toBe(
      '<a href="https://a.bdsmlr.com/">x</a>',
    )
  })

  it('leaves ordinary HTML alone', () => {
    expect(decodeEscapedHtml(html)).toBe(html)
    expect(decodeEscapedHtml('')).toBe('')
  })

  it('is idempotent', () => {
    const escaped = JSON.stringify(html).replace(/\//g, '\\/')
    expect(decodeEscapedHtml(decodeEscapedHtml(escaped))).toBe(html)
  })

  it('decodes before sanitizing', () => {
    const escaped = JSON.stringify(
      '<p style="color:red">See <a href="https://bdsmlr.com/blog/x">x</a></p>',
    ).replace(/\//g, '\\/')
    expect(sanitizeHtml(escaped)).toBe(
      '<p>See <a href="https://bdsmlr.com/blog/x">x</a></p>',
    )
  })
})
