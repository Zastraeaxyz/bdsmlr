import { unwrapMediaUrl } from './sanitize'
import { noteUpstreamRateLimit, noteUpstreamSuccess } from './upstreamLimit'

const API_BASE = '/v2/api'
const AUTH_BASE = '/v2/api/auth'

export interface AuthUser {
  user_id: number
  blog_id: number | null
  blog_name?: string | null
  username?: string | null
  blogs?: { id: number; name: string; user_id?: number }[]
  primary_blog_id?: number | null
  email?: string
}

let currentUser: AuthUser | null = null

export function getCurrentUser(): AuthUser | null {
  return currentUser
}

export function setCurrentUser(user: AuthUser | null) {
  currentUser = user
}

export function requireUser(): AuthUser {
  const user = currentUser || JSON.parse(localStorage.getItem('user') || 'null')
  if (!user) throw new Error('Not authenticated')
  currentUser = user
  return user
}

export interface ResolveIdentifierResponse {
  blogId?: number
  blogName?: string
  postId?: number | null
  userId?: number
  userName?: string | null
  error?: string
}

export interface RecentActivityItem {
  blogId?: number
  blogName?: string
  latestPostId?: number
  latestCreatedAtUnix?: number
}

export interface ListBlogsRecentActivityResponse {
  items?: RecentActivityItem[]
  posts?: Post[]
  page?: { nextPageToken?: string }
  error?: string
}

export interface FollowEdge {
  blogId: string
  blogName: string
  avatarUrl?: string
  title?: string
  description?: string
  createdAt?: string
  followersCount?: number
  postsCount?: number
  userId?: string
}

export interface BlogFollowGraphResponse {
  blogId?: string
  blogName?: string
  followers?: FollowEdge[]
  following?: FollowEdge[]
  followersCount?: number
  followingCount?: number
  nextPageToken?: string
  error?: string
}

export type FollowDirection = 'following' | 'followers' | 'both'

export function blogFollowGraph(
  blogId: number,
  pageToken?: string,
  direction: FollowDirection = 'following',
  pageSize = 200,
) {
  return request<BlogFollowGraphResponse>(API_BASE, '/blog-follow-graph', {
    blogId: String(blogId),
    direction,
    pageSize,
    ...(pageToken ? { pageToken } : {}),
  })
}

function responseErrorMessage(err: unknown, fallback: string): string {
  if (typeof err === 'string') return err
  if (err && typeof err === 'object') {
    const record = err as Record<string, unknown>
    if (typeof record.message === 'string') return record.message
    if (typeof record.error === 'string') return record.error
    const nested = record.error
    if (nested && typeof nested === 'object') {
      const nestedRecord = nested as Record<string, unknown>
      if (typeof nestedRecord.message === 'string') return nestedRecord.message
    }
  }
  return fallback
}

export class FetchError extends Error {
  status: number
  code?: string
  constructor(message: string, status: number, code?: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

export const NETWORK_ERROR_CODE = 'NETWORK_UNREACHABLE'

/**
 * Bump this whenever an error response may have been cached under the old
 * cache rules. It changes the URL, so browsers fetch fresh instead of serving
 * a stale 429 or 500 until its max-age runs out.
 */
const GET_CACHE_VERSION = '2'

/** Read-only endpoints that are safe to share between concurrent callers. */
const READ_PATHS = new Set([
  '/for-you',
  '/list-blog-activity',
  '/list-blogs-recent-activity',
  '/list-post-comments',
  '/list-post-likes',
  '/list-post-reblogs',
  '/related-posts',
  '/search-blogs',
  '/search-posts-by-tag',
])

async function throwForResponse(res: Response): Promise<void> {
  if (res.ok) {
    noteUpstreamSuccess()
    return
  }

  const payload = await res.json().catch(() => null)
  const record =
    payload && typeof payload === 'object'
      ? (payload as Record<string, unknown>)
      : null
  const code = typeof record?.code === 'string' ? record.code : undefined
  const message = responseErrorMessage(
    payload ?? res.statusText,
    `BDSMLR returned HTTP ${res.status}`,
  )

  if (res.status === 429 || code === 'UPSTREAM_RATE_LIMITED') {
    const retryAfter =
      Number(record?.retryAfterSeconds) ||
      Number(res.headers.get('retry-after')) ||
      undefined
    noteUpstreamRateLimit(retryAfter)
  }

  throw new FetchError(message, res.status, code)
}

async function sendRequest<T>(base: string, path: string, body: unknown, v2session?: string): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (v2session) headers['Cookie'] = `v2_session=${v2session}`

  let res: Response
  try {
    res = await fetch(`${base}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      credentials: v2session ? 'omit' : 'include',
    })
  } catch {
    throw new FetchError('Could not reach BDSMLR.', 0, NETWORK_ERROR_CODE)
  }

  await throwForResponse(res)
  return res.json().catch(() => {
    throw new FetchError('BDSMLR returned an unreadable response.', res.status)
  })
}

const inflightRead = new Map<string, Promise<unknown>>()

async function request<T>(base: string, path: string, body: unknown, v2session?: string): Promise<T> {
  if (v2session || !READ_PATHS.has(path)) {
    return sendRequest<T>(base, path, body, v2session)
  }

  // Profile pages ask for the same feed from several components at once, and
  // every extra request is another chance to be rate limited.
  const key = `${path}\u0000${JSON.stringify(body)}`
  const running = inflightRead.get(key)
  if (running) return running as Promise<T>

  const promise = sendRequest<T>(base, path, body).finally(() =>
    inflightRead.delete(key),
  )
  inflightRead.set(key, promise)
  return promise
}

const inflightGet = new Map<string, Promise<unknown>>()

async function requestGet<T>(base: string, path: string, params: Record<string, string | number>): Promise<T> {
  const qs = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) qs.set(key, String(value))
  }
  qs.set('v', GET_CACHE_VERSION)
  const url = `${base}${path}?${qs.toString()}`

  const cached = inflightGet.get(url)
  if (cached) return cached as Promise<T>

  const promise = (async () => {
    let res: Response
    try {
      res = await fetch(url, {
        method: 'GET',
        credentials: 'include',
      })
    } catch {
      throw new FetchError('Could not reach BDSMLR.', 0, NETWORK_ERROR_CODE)
    }
    await throwForResponse(res)
    return res.json().catch(() => {
      throw new FetchError('BDSMLR returned an unreadable response.', res.status)
    })
  })().finally(() => inflightGet.delete(url))

  inflightGet.set(url, promise)
  return promise as Promise<T>
}

export function login(login: string, password: string, remember = false) {
  return request<AuthUser>(AUTH_BASE, '/login', { login, password, remember })
}

export function resolveIdentifier(blogName: string) {
  return requestGet<ResolveIdentifierResponse>(API_BASE, '/resolve-identifier', { blog_name: blogName })
}

export function listBlogsRecentActivity(blogIds: number[], pageSize = 20, pageToken?: string) {
  return request<ListBlogsRecentActivityResponse>(API_BASE, '/list-blogs-recent-activity', {
    blog_ids: blogIds,
    global_merge: true,
    page: { page_size: pageSize, ...(pageToken ? { page_token: pageToken } : {}) },
  })
}

export const PostType = {
  Text: 1,
  Image: 2,
  Video: 3,
  Audio: 4,
  Link: 5,
  Chat: 6,
  Quote: 7,
} as const

export const PostVariant = {
  Unspecified: 0,
  Original: 1,
  Reblog: 2,
} as const

export const SortField = {
  Date: 1,
  Likes: 2,
  Comments: 3,
  Reblogs: 4,
  Popularity: 6,
} as const

export const SortOrder = {
  Ascending: 1,
  Descending: 2,
} as const

export interface PostContent {
  html?: string
  text?: string
  title?: string
  url?: string
  quoteText?: string
  quoteSource?: string
}

export interface MediaRepresentationItem {
  kind?: number
  original?: { url?: string; mimeType?: string | null }
  alternates?: { url?: string; mimeType?: string | null }[]
}

export interface MediaRepresentation {
  kind?: number
  items?: MediaRepresentationItem[]
}

export interface Post {
  id: number
  blogId?: number
  blogName?: string
  type?: number
  title?: string
  body?: string
  content?: PostContent
  mediaRepresentation?: MediaRepresentation
  tags?: string[]
  likesCount?: number
  commentsCount?: number
  reblogsCount?: number
  createdAtUnix?: number
  originPostId?: number
  originBlogId?: number
  originBlogName?: string
  variant?: number
  reblogVariants?: { id: number; blogName: string }[]
}

export interface ListBlogActivityRequest {
  blog_id: number
  blog_name?: string
  q?: string
  sort_field?: number
  order?: number
  post_types?: number[]
  activity_kinds?: string[]
  page?: number | { page_size?: number; page_token?: string }
  page_size?: number
}

export interface ListBlogActivityResponse {
  posts?: Post[]
  timelineItems?: {
    type: number
    post?: Post
    cluster?: { label?: string; interactions?: Post[] }
  }[]
  page?: { nextPageToken?: string }
  error?: string
}

export function listBlogActivity(req: ListBlogActivityRequest) {
  return request<ListBlogActivityResponse>(API_BASE, '/list-blog-activity', req)
}

export interface SearchPostsByTagRequest {
  tag_name: string
  sort_field?: number
  order?: number
  post_types?: number[]
  variants?: number[]
  page?: number
  page_size?: number
  session?: string
}

export interface SearchReblogGroup {
  count?: number
  label?: string
  originPostId?: number
  representativePostId?: number
  posts?: Post[]
}

export interface SearchResultUnit {
  post?: Post
  reblogGroup?: SearchReblogGroup
}

export interface SearchPostsByTagResponse {
  posts?: (Post | null)[]
  resultUnits?: SearchResultUnit[]
  sessionId?: string
  hasMore?: boolean
  pageNumber?: number
  pageSize?: number
  searchStatus?: string
  page?: { nextPageToken?: string }
  error?: string
}

export function searchPostsByTag(req: SearchPostsByTagRequest) {
  return request<SearchPostsByTagResponse>(API_BASE, '/search-posts-by-tag', req)
}

export function searchResultPosts(data: SearchPostsByTagResponse): Post[] {
  const units = data.resultUnits
  if (units && units.length > 0) {
    const posts: Post[] = []
    for (const unit of units) {
      if (unit?.post) {
        posts.push(unit.post)
      } else if (unit?.reblogGroup?.posts?.length) {
        posts.push(unit.reblogGroup.posts[0])
      }
    }
    return posts
  }
  return (data.posts ?? []).filter((post): post is Post => !!post)
}

export async function signUrl(url: string): Promise<string> {
  const data = await request<{ url?: string }>(API_BASE, '/sign-url', { url })
  return data.url || url
}

export interface GetPostDetailResponse {
  post?: Post
  error?: string
}

export function getPostDetail(postId: number) {
  return requestGet<GetPostDetailResponse>(API_BASE, '/get-post-detail', { post_id: postId })
}

export interface TopTag {
  name: string
  postsCount: number
}

export interface ListBlogTopTagsResponse {
  tags?: TopTag[]
  error?: string
}

export function listBlogTopTags(blogName: string, pageSize = 150) {
  return requestGet<ListBlogTopTagsResponse>(API_BASE, '/list-blog-top-tags', {
    blog_name: blogName,
    page_size: pageSize,
  })
}

export interface Blog {
  id: string
  name: string
  title?: string
  description?: string
  avatarUrl?: string
  coverUrl?: string
  followersCount?: string
  postsCount?: string
  createdAt?: string
}

export interface GetBlogResponse {
  blog?: Blog
  error?: string
}

export function getBlog(blogId: number) {
  return requestGet<GetBlogResponse>(API_BASE, '/get-blog', { blogId: String(blogId) })
    .then((res) => normalizeBlogMedia(res))
}

export function normalizeBlogMedia(res: GetBlogResponse): GetBlogResponse {
  if (!res.blog) return res
  return {
    ...res,
    blog: {
      ...res.blog,
      avatarUrl: res.blog.avatarUrl ? unwrapMediaUrl(res.blog.avatarUrl) : res.blog.avatarUrl,
      coverUrl: res.blog.coverUrl ? unwrapMediaUrl(res.blog.coverUrl) : res.blog.coverUrl,
    },
  }
}

export interface WriteError {
  code?: string
  message?: string
}

export interface LikeState {
  liked?: boolean
  likes_count?: number
  likesCount?: number
}

export interface LikePostResponse {
  ok?: boolean
  action?: string
  postId?: number
  actingBlogId?: number
  state?: LikeState
  error?: WriteError
}

export interface ReblogPostResponse {
  ok?: boolean
  action?: string
  postId?: number
  actingBlogId?: number
  createdReblogPostId?: number | null
  error?: WriteError
}

export interface BatchLikeStatesResponse {
  states?: { postId?: number; liked?: boolean }[]
}

export interface BatchReblogStatesResponse {
  states?: { postId?: number; actorReblogCount?: number }[]
}

export function likePost(postId: number, actingBlogId: number) {
  return request<LikePostResponse>(API_BASE, '/internal-write/like', {
    postId,
    actingBlogId,
  })
}

export function unlikePost(postId: number, actingBlogId: number) {
  return request<LikePostResponse>(API_BASE, '/internal-write/unlike', {
    postId,
    actingBlogId,
  })
}

export function reblogPost(
  postId: number,
  actingBlogId: number,
  opts: { mode?: 'live' | 'queue'; comment?: string; tags?: string[] } = {},
) {
  const mode = opts.mode ?? 'live'
  return request<ReblogPostResponse>(API_BASE, '/internal-write/reblog', {
    postId,
    actingBlogId,
    mode,
    typerb: mode === 'queue' ? 1 : 0,
    ...(opts.comment ? { comment: opts.comment } : {}),
    ...(opts.tags && opts.tags.length > 0 ? { tags: opts.tags } : {}),
  })
}

export function batchGetLikeStates(postIds: number[], actingBlogId: number) {
  return request<BatchLikeStatesResponse>(API_BASE, '/batch-get-like-states', {
    postIds,
    actingBlogId,
  })
}

export function batchGetReblogStates(postIds: number[], actingBlogId: number) {
  return request<BatchReblogStatesResponse>(
    API_BASE,
    '/batch-get-reblog-states',
    { postIds, actingBlogId },
  )
}

export interface BlogFollowStateResponse {
  isFollowed?: boolean
  is_followed?: boolean
  error?: string
}

export interface BlogWriteResponse {
  ok?: boolean
  error?: WriteError
}

export interface BlockedResponse {
  blocked_blog_ids?: (number | string)[]
  blockedBlogIds?: (number | string)[]
  blocked_user_ids?: (number | string)[]
  blockedUserIds?: (number | string)[]
  error?: string
}

export interface FamilyBlogsResponse {
  blogs?: Blog[]
  error?: string
}

export function getBlogFollowState(actingBlogId: number, targetBlogId: number) {
  return request<BlogFollowStateResponse>(API_BASE, '/blog-follow-state', {
    actingBlogId,
    targetBlogId,
  })
}

export function followBlog(actingBlogId: number, targetBlogId: number) {
  return request<BlogWriteResponse>(API_BASE, '/internal-write/follow', {
    actingBlogId,
    targetBlogId,
  })
}

export function unfollowBlog(actingBlogId: number, targetBlogId: number) {
  return request<BlogWriteResponse>(API_BASE, '/internal-write/unfollow', {
    actingBlogId,
    targetBlogId,
  })
}

export function getBlocked(userId: number) {
  return request<BlockedResponse>(API_BASE, '/get-blocked', {
    user_id: userId,
  })
}

export function blockBlog(actingBlogId: number, targetBlogId: number) {
  return request<BlogWriteResponse>(API_BASE, '/internal-write/block', {
    actingBlogId,
    targetBlogId,
  })
}

export function unblockBlog(actingBlogId: number, targetBlogId: number) {
  return request<BlogWriteResponse>(API_BASE, '/internal-write/unblock', {
    actingBlogId,
    targetBlogId,
  })
}

export function reportBlog(
  actingBlogId: number,
  targetBlogId: number,
  reason: string,
) {
  return request<BlogWriteResponse>(API_BASE, '/internal-write/report-blog', {
    actingBlogId,
    targetBlogId,
    reason,
  })
}

export function reportPost(actingBlogId: number, postId: number) {
  return request<BlogWriteResponse>(API_BASE, '/internal-write/report-post', {
    actingBlogId,
    postId,
  })
}

export function deletePost(actingBlogId: number, postId: number) {
  return request<BlogWriteResponse>(API_BASE, '/internal-write/delete', {
    actingBlogId,
    postId,
  })
}

export function listBlogFamilyBlogs(blogId: number) {
  return request<FamilyBlogsResponse>(API_BASE, '/list-blog-family-blogs', {
    blog_id: blogId,
  }).then((res) => ({
    ...res,
    blogs: (res.blogs ?? []).map((blog) => ({
      ...blog,
      avatarUrl: blog.avatarUrl ? unwrapMediaUrl(blog.avatarUrl) : blog.avatarUrl,
      coverUrl: blog.coverUrl ? unwrapMediaUrl(blog.coverUrl) : blog.coverUrl,
    })),
  }))
}




export interface PostComment {
  id?: number
  postId?: number
  userId?: number
  blogId?: number
  blogName?: string
  body?: string
  createdAtUnix?: number
}

export interface ListPostCommentsResponse {
  comments?: PostComment[]
  page?: { nextPageToken?: string }
  error?: string
}

export interface CommentPostResponse {
  ok?: boolean
  action?: string
  postId?: number
  actingBlogId?: number
  error?: WriteError
}

export function listPostComments(
  postId: number,
  pageSize = 20,
  pageToken?: string,
) {
  return request<ListPostCommentsResponse>(API_BASE, '/list-post-comments', {
    postId,
    page: {
      pageSize,
      ...(pageToken ? { pageToken } : {}),
    },
  })
}

export function commentPost(
  postId: number,
  comment: string,
  actingBlogId: number,
) {
  return request<CommentPostResponse>(API_BASE, '/internal-write/comment', {
    postId,
    comment,
    actingBlogId,
  })
}

export interface ForYouResponse {
  posts?: Post[]
  page?: { nextPageToken?: string }
  error?: string
}

export function forYou(
  perspectiveBlogName: string,
  pageSize = 20,
  pageToken?: string,
) {
  return request<ForYouResponse>(API_BASE, '/for-you', {
    perspective_blog_name: perspectiveBlogName,
    page_size: pageSize,
    ...(pageToken ? { page_token: pageToken } : {}),
  })
}

export interface RecommendedBlogsResponse {
  blogs?: Blog[]
  error?: string
}

export function listRecommendedBlogs(blogName: string, limit = 12) {
  return request<RecommendedBlogsResponse>(API_BASE, '/list-recommended-blogs', {
    blog_name: blogName,
    limit,
  }).then((res) => ({
    ...res,
    blogs: (res.blogs ?? []).map((blog) => ({
      ...blog,
      avatarUrl: blog.avatarUrl ? unwrapMediaUrl(blog.avatarUrl) : blog.avatarUrl,
      coverUrl: blog.coverUrl ? unwrapMediaUrl(blog.coverUrl) : blog.coverUrl,
    })),
  }))
}

export function relatedPosts(
  seedPostId: number,
  perspectiveBlogName?: string,
  pageSize = 12,
  pageToken?: string,
) {
  return request<ForYouResponse>(API_BASE, '/related-posts', {
    seed_post_id: String(seedPostId),
    perspective_role: 'viewer',
    ...(perspectiveBlogName
      ? { perspective_blog_name: perspectiveBlogName }
      : {}),
    page_size: pageSize,
    ...(pageToken ? { page_token: pageToken } : {}),
  })
}

export interface SearchBlogsResponse {
  blogs?: Blog[]
  page?: { nextPageToken?: string }
  error?: string
}

export function searchBlogs(
  query: string,
  pageSize = 20,
  pageToken?: string,
) {
  return request<SearchBlogsResponse>(API_BASE, '/search-blogs', {
    query,
    page: {
      page_size: pageSize,
      ...(pageToken ? { page_token: pageToken } : {}),
    },
  }).then((res) => ({
    ...res,
    blogs: (res.blogs ?? []).map((blog) => ({
      ...blog,
      avatarUrl: blog.avatarUrl ? unwrapMediaUrl(blog.avatarUrl) : blog.avatarUrl,
      coverUrl: blog.coverUrl ? unwrapMediaUrl(blog.coverUrl) : blog.coverUrl,
    })),
  }))
}

export interface PostLikesResponse {
  likes?: {
    id?: number
    postId?: number
    userId?: number
    blogId?: number
    blogName?: string
    createdAtUnix?: number
  }[]
  page?: { nextPageToken?: string }
  error?: string
}

export interface PostReblogsResponse {
  reblogs?: {
    id?: number
    postId?: number
    blogId?: number
    blogName?: string
    createdAtUnix?: number
  }[]
  page?: { nextPageToken?: string }
  error?: string
}

export function listPostLikes(
  postId: number,
  pageSize = 20,
  pageToken?: string,
) {
  return request<PostLikesResponse>(API_BASE, '/list-post-likes', {
    post_id: postId,
    page: {
      page_size: pageSize,
      ...(pageToken ? { page_token: pageToken } : {}),
    },
  })
}

export function listPostReblogs(
  postId: number,
  pageSize = 20,
  pageToken?: string,
) {
  return request<PostReblogsResponse>(API_BASE, '/list-post-reblogs', {
    post_id: postId,
    page: {
      page_size: pageSize,
      ...(pageToken ? { page_token: pageToken } : {}),
    },
  })
}

export function resolveIdentifierById(blogId: number) {
  return request<ResolveIdentifierResponse>(API_BASE, '/resolve-identifier', {
    blog_id: blogId,
  })
}

export function resolveUserById(userId: number) {
  return request<ResolveIdentifierResponse>(API_BASE, '/resolve-identifier', {
    user_id: userId,
  })
}

export interface TagAffinityItem {
  count?: number
  tag?: string
}

export interface TagAffinityResponse {
  blogId?: number
  blogName?: string
  tagAffinity?: {
    all?: {
      both?: TagAffinityItem[]
      likes?: TagAffinityItem[]
      reblogs?: TagAffinityItem[]
    }
    recent?: {
      both?: TagAffinityItem[]
      likes?: TagAffinityItem[]
      reblogs?: TagAffinityItem[]
    }
  }
  error?: string
}

export function blogTagAffinity(blogName: string) {
  return request<TagAffinityResponse>(API_BASE, '/blog-tag-affinity', {
    blog_name: blogName,
  })
}
