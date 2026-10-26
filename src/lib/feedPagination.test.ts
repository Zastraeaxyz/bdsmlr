import { describe, expect, it } from 'vitest'
import { freshPosts } from './feedPagination'
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
