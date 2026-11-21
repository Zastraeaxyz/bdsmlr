import { describe, expect, it } from 'vitest'
import {
  base64UrlDecode,
  base64UrlEncode,
  blogPostsBefore,
  recentActivityBefore,
} from '~/lib/activityCursor'

function decode(token: string): unknown {
  return JSON.parse(base64UrlDecode(token))
}

describe('base64UrlEncode', () => {
  it('round-trips through base64UrlDecode without padding', () => {
    const value = JSON.stringify({ hello: 'world' })
    const token = base64UrlEncode(value)
    expect(token).not.toContain('=')
    expect(token).not.toContain('+')
    expect(token).not.toContain('/')
    expect(base64UrlDecode(token)).toBe(value)
  })
})

describe('blogPostsBefore', () => {
  it('builds an exclusive newest-first cursor for the previous post', () => {
    expect(decode(blogPostsBefore(1775585374, 862636922))).toEqual({
      activity: null,
      posts: {
        search_after: [1775585374000, 862636922],
        sort_field: 'created_at',
        order: 'DESC',
      },
    })
  })
})

describe('recentActivityBefore', () => {
  it('builds the activity-feed cursor shape', () => {
    expect(decode(recentActivityBefore(1775585374, 862636922))).toEqual({
      sort: 1775585374000,
      id: 862636922,
    })
  })
})
