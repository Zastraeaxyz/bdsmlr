import {
  FetchError,
  type Blog,
  type Post,
  type GetBlogResponse,
  type ListBlogActivityResponse,
  type ResolveIdentifierResponse,
} from './api'

export { FetchError } from './api'

const API_BASE = 'https://api-prod.bdsmlr.com/v2/api'

async function bdRequest<T>(
  path: string,
  body: unknown,
  v2session?: string,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (v2session) headers['Cookie'] = `v2_session=${v2session}`

  const start = Date.now()
  const auth = v2session ? '[auth]' : ''
  console.log(`[bd] --> POST ${path} ${JSON.stringify(body)} ${auth}`)

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })

    const duration = Date.now() - start
    console.log(`[bd] <-- POST ${path} ${res.status} ${duration}ms ${auth}`)

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }))
      throw new Error(err.message || err.error || `HTTP ${res.status}`)
    }

    return res.json()
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('HTTP ')) throw e
    const duration = Date.now() - start
    console.log(`[bd] <-- POST ${path} FAIL ${duration}ms ${auth}`)
    throw e
  }
}

export function resolveIdentifier(blogName: string, v2session?: string) {
  return bdRequest<ResolveIdentifierResponse>(
    '/resolve-identifier',
    { blog_name: blogName },
    v2session,
  )
}

export function getBlog(blogId: number, v2session?: string) {
  return bdRequest<GetBlogResponse>(
    '/get-blog',
    { blogId: String(blogId) },
    v2session,
  )
}

export function listBlogActivity(
  blogId: number,
  blogName: string,
  page: number,
  v2session?: string,
  includeReblogs = true,
  pageToken?: string,
) {
  const pageParam = pageToken ? { page_size: 20, page_token: pageToken } : page

  return bdRequest<ListBlogActivityResponse>(
    '/list-blog-activity',
    {
      blog_id: blogId,
      blog_name: blogName,
      sort_field: 1,
      order: 2,
      post_types: [1, 2, 3, 4, 5, 6, 7],
      activity_kinds: includeReblogs ? ['post', 'reblog'] : ['post'],
      page: pageParam,
      page_size: 20,
    },
    v2session,
  )
}

const RESOLVE_CACHE_TTL = Number(process.env.RESOLVE_CACHE_TTL) || 3600
const BLOG_CACHE_TTL = Number(process.env.BLOG_CACHE_TTL) || 86400
const PAGE_TOKEN_TTL = Number(process.env.PAGE_TOKEN_TTL) || 1800

const memoryCache = new Map<string, { value: string; createdAt: number }>()

function cacheGet<T>(key: string, ttlSeconds: number): T | null {
  const entry = memoryCache.get(key)
  if (!entry) return null
  if (Date.now() - entry.createdAt >= ttlSeconds * 1000) {
    memoryCache.delete(key)
    return null
  }
  try {
    return JSON.parse(entry.value) as T
  } catch {
    return null
  }
}

function cacheSet(key: string, value: unknown): void {
  memoryCache.set(key, { value: JSON.stringify(value), createdAt: Date.now() })
}

export async function cachedResolveIdentifier(
  blogName: string,
  v2session?: string,
): Promise<ResolveIdentifierResponse> {
  const key = blogName.trim().toLowerCase()

  const cached = cacheGet<ResolveIdentifierResponse>(
    `resolve:${key}`,
    RESOLVE_CACHE_TTL,
  )
  if (cached) return cached

  const result = await resolveIdentifier(blogName, v2session)

  cacheSet(`resolve:${key}`, result)

  return result
}

export async function cachedGetBlog(
  blogId: number,
  v2session?: string,
): Promise<GetBlogResponse> {
  // Key on auth state so a private-blog miss is not served to authenticated callers
  const authKey = v2session ? 'auth' : 'anon'
  const key = `blog:${blogId}:${authKey}`

  const cached = cacheGet<GetBlogResponse>(key, BLOG_CACHE_TTL)
  if (cached) return cached

  const result = await getBlog(blogId, v2session)

  cacheSet(key, result)

  return result
}

export async function getPageToken(
  blogId: number,
  page: number,
): Promise<string | null> {
  return cacheGet<string>(`token:${blogId}:${page}`, PAGE_TOKEN_TTL)
}

export async function setPageToken(
  blogId: number,
  page: number,
  token: string,
): Promise<void> {
  cacheSet(`token:${blogId}:${page}`, token)
}

export interface BlogFeed {
  blog: Blog
  posts: Post[]
  page: number
}

export async function fetchBlogFeed(params: {
  username: string
  page?: number
  v2session?: string
  includeReblogs?: boolean
}): Promise<BlogFeed> {
  const page = Math.max(1, params.page || 1)
  const v2session = params.v2session || undefined
  const includeReblogs = params.includeReblogs !== false

  const resolved = await cachedResolveIdentifier(params.username, v2session)
  if (!resolved.blogId) {
    throw new FetchError(
      `Blog "${params.username}" not found — check the spelling`,
      404,
    )
  }

  const blogId = resolved.blogId
  const pageToken =
    page > 1 ? ((await getPageToken(blogId, page)) ?? undefined) : undefined

  try {
    const [blogData, activity] = await Promise.all([
      cachedGetBlog(blogId, v2session),
      listBlogActivity(
        blogId,
        resolved.blogName || params.username,
        page,
        v2session,
        includeReblogs,
        pageToken,
      ),
    ])

    if (!blogData.blog) {
      throw new FetchError(
        `Blog "${params.username}" is private — add ?v2_session=<cookie> to the feed URL`,
        403,
      )
    }

    if (activity.page?.nextPageToken) {
      await setPageToken(blogId, page + 1, activity.page.nextPageToken)
    }

    return { blog: blogData.blog, posts: activity.posts || [], page }
  } catch (e) {
    if (e instanceof FetchError) throw e
    throw new FetchError(
      `Blog "${params.username}" is private — add ?v2_session=<cookie> to the feed URL`,
      403,
    )
  }
}
