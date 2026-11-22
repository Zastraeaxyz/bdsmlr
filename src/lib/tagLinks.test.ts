import { describe, expect, it } from 'vitest'
import { tagSearchHref } from '~/lib/tagLinks'

describe('tagSearchHref', () => {
  it('links simple tags to the home search', () => {
    expect(tagSearchHref('cuckold')).toBe('/home?tag_name=tag%3Acuckold')
  })

  it('quotes tags with spaces', () => {
    expect(tagSearchHref('fem dom')).toBe(
      '/home?tag_name=tag%3A%22fem%20dom%22',
    )
  })

  it('links tags to the blog search when a blog name is given', () => {
    expect(tagSearchHref('cuckold', 'AmateurCuckolding2')).toBe(
      '/AmateurCuckolding2?tag_name=tag%3Acuckold',
    )
  })

  it('quotes tags with spaces on blog searches too', () => {
    expect(tagSearchHref('fem dom', 'AmateurCuckolding2')).toBe(
      '/AmateurCuckolding2?tag_name=tag%3A%22fem%20dom%22',
    )
  })
})
