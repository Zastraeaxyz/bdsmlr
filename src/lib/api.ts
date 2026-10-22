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

export function blogFollowGraph(blogId: number, pageToken?: string) {
  return request<BlogFollowGraphResponse>(API_BASE, '/blog-follow-graph', {
    blogId: String(blogId),
    direction: 'following',
    ...(pageToken ? { pageToken } : {}),
  })
}

export class FetchError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function request<T>(base: string, path: string, body: unknown, v2session?: string): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (v2session) headers['Cookie'] = `v2_session=${v2session}`

  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    credentials: v2session ? 'omit' : 'include',
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(err.message || err.error || `HTTP ${res.status}`)
  }

  return res.json()
}

const inflightGet = new Map<string, Promise<unknown>>()

async function requestGet<T>(base: string, path: string, params: Record<string, string | number>): Promise<T> {
  const qs = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) qs.set(key, String(value))
  }
  const url = `${base}${path}?${qs.toString()}`

  const cached = inflightGet.get(url)
  if (cached) return cached as Promise<T>

  const promise = fetch(url, {
    method: 'GET',
    credentials: 'include',
  })
    .then(async (res) => {
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }))
        throw new Error(err.message || err.error || `HTTP ${res.status}`)
      }
      return res.json()
    })
    .finally(() => inflightGet.delete(url))

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
  timelineItems?: { type: number; post?: Post }[]
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
  return request<ReblogPostResponse>(API_BASE, '/internal-write/reblog', {
    postId,
    actingBlogId,
    mode: opts.mode ?? 'live',
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
