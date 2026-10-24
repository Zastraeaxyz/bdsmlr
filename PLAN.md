# BDSMLR parity roadmap

Goal: support everything the BDSMLR new web client does, plus the legacy authoring features it still links to, so this app can replace the site for daily use.

## Current coverage

- Login, following feed, blog pages, following list, post search, liked posts, post detail, media lightbox, reblog attribution, deleted-post handling
- Likes, reblogs, comments, text messaging
- RSS feeds and per-post RSS media

## Phase 1: social and safety (implemented, pending review)

- Active blog switching for every write action
- Follow and unfollow blogs, with follow state
- Followers and siblings tabs on profiles
- Block and unblock blogs
- Report blog and report post
- Delete your own posts
- Reblog composer with optional note, tags, and Queue mode

## Phase 2: discovery (implemented, pending review)

- For You feed
- Recommended blogs
- Related posts on post detail
- Search blogs and tags, plus tag pages
- Likes and reblogs lists on post detail
- Activity feed for a blog, with post/reblog/like/comment filters
- Your own activity feed
- Follower feed

## Phase 3: messaging upgrades (implemented, pending review)

- Image and media attachments
- Archive, clear, delete, and block thread actions
- Unread counts and badges
- Recipient autocomplete when starting a new message

## Phase 4: legacy authoring (composer implemented; remaining items below)

These are not in the v2 API. They require the legacy Laravel session and CSRF handling already used for messaging.

- Create posts: text, picture, quote, link, chat, audio, video
- Edit posts
- Drafts
- Queue management and scheduled posts
- Ask/questions inbox and answering asks
- Submissions
- Blog customization: avatar, header, title, description, theme, privacy
- Account settings and password changes

## Phase 5: remaining parity (implemented, pending review)

- Blog archive view with month/type filters
- Blog top tags and affinity display
- Notifications-style activity badge
- Blocked entities management screen
- User profile and blog settings views
- Any remaining legacy dashboard routes needed for full parity

## Endpoint notes discovered from the BDSMLR web client

- Follow state: `POST /v2/blog-follow-state` with `{ actingBlogId, targetBlogId }`
- Follow: `POST /v2/internal-write/follow` with `{ actingBlogId, targetBlogId }`
- Unfollow: `POST /v2/internal-write/unfollow` with `{ actingBlogId, targetBlogId }`
- Block: `POST /v2/internal-write/block` with `{ actingBlogId, targetBlogId }`
- Unblock: `POST /v2/internal-write/unblock` with `{ actingBlogId, targetBlogId }`
- Report blog: `POST /v2/internal-write/report-blog` with `{ actingBlogId, targetBlogId, reason }`
- Report post: `POST /v2/internal-write/report-post` with `{ actingBlogId, postId }`
- Delete post: `POST /v2/internal-write/delete` with `{ actingBlogId, postId }`
- Reblog: `POST /v2/internal-write/reblog` with `{ postId, actingBlogId, comment?, tags?, mode: "live" | "queue" }`
- For You: `POST /v2/for-you` with `{ perspective_blog_name, page_size, page_token? }`
- Related posts: `POST /v2/related-posts` with `{ seed_post_id, perspective_role, perspective_blog_name?, page_size?, page_token? }`
- Recommended blogs: `POST /v2/list-recommended-blogs` with `{ blog_name, limit }`
- Tag affinity: `POST /v2/blog-tag-affinity` with `{ blog_name }`
- Family blogs: `POST /v2/list-blog-family-blogs`
- Follow graph: `POST /v2/blog-follow-graph` with `{ blogId, direction: "followers" | "following" | "both", pageToken? }`
- Post likes: `POST /v2/list-post-likes` with `{ post_id, page: { page_size } }`
- Post reblogs: `POST /v2/list-post-reblogs` with `{ post_id, page: { page_size } }`

## Working rules

- Every user-facing change gets a CHANGELOG entry.
- Keep new API quirks documented in AGENTS.md.
- Do not commit until reviewed.
