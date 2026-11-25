import { describe, expect, it } from 'vitest'
import { freshPosts, takeFreshPosts } from './feedPagination'
import type { Post } from './api'

function post(id: number): Post {
  return { id }
}

describe('freshPosts', () => {
  it('returns the whole first page', () => {
    expect(freshPosts([], [post(1), post(2)])).toEqual([post(1), post(2)])
  })

  it('returns nothing when a page repeats', () => {
    expect(freshPosts([post(1), post(2)], [post(1), post(2)])).toEqual([])
  })

  it('keeps only posts that were not already loaded', () => {
    expect(freshPosts([post(1), post(2)], [post(2), post(3)])).toEqual([
      post(3),
    ])
  })

  it('ignores duplicate ids inside the incoming page', () => {
    expect(freshPosts([], [post(1), post(1), post(2)])).toEqual([
      post(1),
      post(2),
    ])
  })
})

describe('takeFreshPosts', () => {
  it('takes only as many posts as the page shows and leaves the rest', () => {
    const incoming = [post(1), post(2), post(3), post(4)]
    const seen = new Set<number>()

    expect(takeFreshPosts(incoming, 2, seen)).toEqual([post(1), post(2)])
    expect(incoming).toEqual([post(3), post(4)])
    expect(takeFreshPosts(incoming, 2, seen)).toEqual([post(3), post(4)])
  })

  it('skips posts that were already shown', () => {
    const incoming = [post(1), post(2), post(3)]
    const seen = new Set<number>([1])

    expect(takeFreshPosts(incoming, 2, seen)).toEqual([post(2), post(3)])
    expect(incoming).toEqual([])
  })

  it('returns nothing when every buffered post is a repeat', () => {
    const incoming = [post(1), post(2)]
    const seen = new Set<number>([1, 2])

    expect(takeFreshPosts(incoming, 6, seen)).toEqual([])
    expect(incoming).toEqual([])
  })
})
