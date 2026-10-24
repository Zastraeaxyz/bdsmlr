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
})
