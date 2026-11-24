import { describe, expect, it } from 'vitest'
import { rewriteBdsmlrLinks } from '~/lib/contentLinks'
import { sanitizeHtml } from '~/lib/sanitize'

const RAW_HTML =
  '<p>got the gifs from <a href="https://kingnothing55.bdsmlr.com/">https://kingnothing55.bdsmlr.com/</a> and&nbsp;<a href="https://deepsteel.bdsmlr.com/">https://deepsteel.bdsmlr.com/</a></p>'

const MIRROR_HTML =
  '<p>got the gifs from <a href="https://bdsmlr.zastraea.xyz/kingnothing55">https://bdsmlr.zastraea.xyz/kingnothing55</a> and&nbsp;<a href="https://bdsmlr.zastraea.xyz/deepsteel">https://bdsmlr.zastraea.xyz/deepsteel</a></p>'

/** Post 858018067 stores its HTML as a JSON string literal. */
const ESCAPED_HTML = JSON.stringify(RAW_HTML).replace(/\//g, '\\/')

describe('rewriteBdsmlrLinks', () => {
  it('fixes the escaped post and points it at the mirror', () => {
    expect(rewriteBdsmlrLinks(sanitizeHtml(ESCAPED_HTML))).toBe(MIRROR_HTML)
  })

  it('maps blog, post, tag, and blog-subdomain URLs', () => {
    const cases: Array<[string, string]> = [
      [
        'https://bdsmlr.com/blog/Rectrix',
        'https://bdsmlr.zastraea.xyz/Rectrix',
      ],
      [
        'https://bdsmlr.com/post/858018067',
        'https://bdsmlr.zastraea.xyz/post/858018067',
      ],
      [
        'https://bdsmlr.com/tagged/chastity',
        'https://bdsmlr.zastraea.xyz/home?tag_name=tag%3Achastity',
      ],
      [
        'https://bdsmlr.com/tagged/cage%20life',
        'https://bdsmlr.zastraea.xyz/home?tag_name=tag%3A%22cage%20life%22',
      ],
      [
        'https://kingnothing55.bdsmlr.com/',
        'https://bdsmlr.zastraea.xyz/kingnothing55',
      ],
      [
        'https://kingnothing55.bdsmlr.com',
        'https://bdsmlr.zastraea.xyz/kingnothing55',
      ],
      [
        'https://kingnothing55.bdsmlr.com/post/42',
        'https://bdsmlr.zastraea.xyz/kingnothing55/post/42',
      ],
    ]

    for (const [input, expected] of cases) {
      expect(rewriteBdsmlrLinks(input)).toBe(expected)
    }
  })

  it('rewrites hrefs and the visible link text together', () => {
    expect(
      rewriteBdsmlrLinks(
        '<a href="https://bdsmlr.com/blog/Rectrix">https://bdsmlr.com/blog/Rectrix</a>',
      ),
    ).toBe(
      '<a href="https://bdsmlr.zastraea.xyz/Rectrix">https://bdsmlr.zastraea.xyz/Rectrix</a>',
    )
  })

  it('keeps trailing punctuation and entities outside the link', () => {
    expect(rewriteBdsmlrLinks('See https://bdsmlr.com/blog/Rectrix.')).toBe(
      'See https://bdsmlr.zastraea.xyz/Rectrix.',
    )
    expect(
      rewriteBdsmlrLinks('(https://bdsmlr.com/blog/Rectrix)'),
    ).toBe('(https://bdsmlr.zastraea.xyz/Rectrix)')
    expect(
      rewriteBdsmlrLinks(
        'https://kingnothing55.bdsmlr.com/&nbsp;https://deepsteel.bdsmlr.com/',
      ),
    ).toBe(
      'https://bdsmlr.zastraea.xyz/kingnothing55&nbsp;https://bdsmlr.zastraea.xyz/deepsteel',
    )
  })

  it('leaves infrastructure hosts and app URLs alone', () => {
    const untouched = [
      'https://media.bdsmlr.com/lightbox/s3://ocdn012.bdsmlr.com/x.jpg',
      'https://ocdn012.bdsmlr.com/uploads/photos/x.jpg',
      'https://account.bdsmlr.com/members/zastraeachastity/',
      'https://api-prod.bdsmlr.com/v2/api',
      'https://bdsmlr.com/settings',
      'https://bdsmlr.com/terms',
      'https://bdsmlr.zastraea.xyz/kingnothing55',
    ]

    for (const input of untouched) {
      expect(rewriteBdsmlrLinks(input)).toBe(input)
    }
  })
})
