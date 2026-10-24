import { describe, expect, it } from 'vitest'
import {
  linkifyDescription,
  truncateDescription,
} from '~/lib/blogDescription'

describe('linkifyDescription', () => {
  it('turns URLs into links without trailing punctuation', () => {
    expect(linkifyDescription('See https://example.com/page.')).toEqual([
      { type: 'text', value: 'See ' },
      {
        type: 'link',
        value: 'https://example.com/page',
        href: 'https://example.com/page',
      },
      { type: 'text', value: '.' },
    ])
  })

  it('adds https to www links', () => {
    expect(linkifyDescription('www.example.com')).toEqual([
      {
        type: 'link',
        value: 'www.example.com',
        href: 'https://www.example.com',
      },
    ])
  })

  it('keeps balanced parentheses in URLs', () => {
    expect(linkifyDescription('https://example.com/a_(b)')).toEqual([
      {
        type: 'link',
        value: 'https://example.com/a_(b)',
        href: 'https://example.com/a_(b)',
      },
    ])
  })
})

describe('truncateDescription', () => {
  it('does not truncate short text', () => {
    const result = truncateDescription(linkifyDescription('short'), 280)
    expect(result.truncated).toBe(false)
    expect(result.tokens).toEqual([{ type: 'text', value: 'short' }])
  })

  it('truncates long text', () => {
    const result = truncateDescription(linkifyDescription('a'.repeat(300)), 280)
    expect(result.truncated).toBe(true)
    expect(result.tokens.map((token) => token.value).join('')).toHaveLength(280)
  })

  it('does not split a URL at the limit', () => {
    const text = `${'a'.repeat(275)} https://example.com`
    const result = truncateDescription(linkifyDescription(text), 280)
    expect(result.truncated).toBe(true)
    expect(result.tokens.some((token) => token.type === 'link')).toBe(false)
  })
})
