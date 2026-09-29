import { describe, expect, it } from 'vitest'
import { searchResultPosts, type Post, type SearchPostsByTagResponse } from './api'

const post = (id: number): Post => ({ id, blogName: `blog${id}` })

describe('searchResultPosts', () => {
  it('reads posts from resultUnits when present', () => {
    const data: SearchPostsByTagResponse = {
      resultUnits: [{ post: post(1) }, { post: post(2) }],
      posts: [post(1), post(2)],
    }
    expect(searchResultPosts(data).map((p) => p.id)).toEqual([1, 2])
  })

  it('uses the representative post for a reblog group', () => {
    const data: SearchPostsByTagResponse = {
      resultUnits: [
        { reblogGroup: { count: 3, posts: [post(10), post(11), post(12)] } },
        { post: post(20) },
      ],
    }
    expect(searchResultPosts(data).map((p) => p.id)).toEqual([10, 20])
  })

  it('drops null holes from a legacy posts response', () => {
    const data: SearchPostsByTagResponse = {
      posts: [post(1), null, post(3)],
    }
    expect(searchResultPosts(data).map((p) => p.id)).toEqual([1, 3])
  })

  it('prefers resultUnits over a stale posts array', () => {
    const data: SearchPostsByTagResponse = {
      resultUnits: [{ post: post(7) }],
      posts: [post(1), post(2)],
    }
    expect(searchResultPosts(data).map((p) => p.id)).toEqual([7])
  })

  it('returns an empty list for an empty response', () => {
    expect(searchResultPosts({})).toEqual([])
    expect(searchResultPosts({ resultUnits: [] })).toEqual([])
  })
})
