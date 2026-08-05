# Rules

1. Never commit or push unless explicitly requested by the user.
2. Always use conventional commits style (e.g. `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, etc.).
3. This is a SolidJS repository, not a React repository. You may not do inline maps or inline IIFEs in JSX, as those break Solid's ability to track elements. Use `<For>` instead of `.map()` and `<Show>` instead of conditional IIFEs.
4. Every commit that introduces a user-facing change must update `CHANGELOG.md` before committing. For additions and non-breaking changes, write entries in UX language: describe what the user can now do, see, or experience. For fixes and breaking changes, you may explain why at a more technical level when relevant or useful to the consumer. Keep entries concise. Use existing entries in the file as examples.

# API quirks

If a new API quirk has been discovered, please document it here in #API Quirks section.

- Login response is **snake_case** (`blog_id`, `blog_name`, `user_id`).
- `resolveIdentifier` returns **camelCase** (`blogId`, `blogName`).
- `listBlogActivity` request fields are **snake_case**; pagination always uses `page: { page_size, page_token? }` (cursor-based, never `page` as an integer) and `page_size` is duplicated at the top level of the request; the search query is `q`.
- `listBlogActivity` `activity_kinds` **must include `"like"` or `"comment"`**. A request with only `['post', 'reblog']` makes the server switch to offset-based pagination — the token contains `result_offset` and the server echoes the same page/token forever (infinite loop). Including `like`/`comment` (e.g. `['post', 'reblog', 'like', 'comment']`) switches it to a dual-cursor token (`activity` + `posts`) that advances correctly. When both activity kinds are present, the response gains a `timelineItems` array: items with `type === 1` are the blog's own posts/reblogs (use `.post`), and items with `type === 2` are like/comment activity clusters to be filtered out. The server keeps echoing a non-null `nextPageToken` after the last page, so a feed must also stop when a page returns fewer than `page_size` type-1 items.
- `searchPostsByTag` request field is **snake_case** `tag_name` (same query syntax as `listBlogActivity`'s `q`). Pagination is **session-based, not cursor-based**: the first request sends `page: 1` (integer) with no `session`, the response returns a `sessionId`, and every subsequent request sends `page: 2, 3, …` (incrementing integer) plus `session: <previous response's sessionId>`. There are no page tokens for this endpoint. Stop paginating when a page returns fewer than `page_size` posts or the response has no `sessionId`.
- `getBlog` for a **private** blog when unauthenticated returns **HTTP 404** with `{"error":"blog not found"}` (not a 200 with an empty blog). The `rssApi` client surfaces this as a thrown `Error`, and callers must treat a failed/anonymous `getBlog` for a resolvable `blogId` as "private".
- `.gif` files may be served as `video/mp4`. Render each URL in a `.media-shell` (CSS grid overlapping) with both `<img>` and `<video muted controls>`. Each hides on `onError`. For `.gif`-as-video, the `<video>` gets `autoplay loop playsinline`; for other videos, `autoplay`/`loop`/`playsinline` are omitted so the video starts muted but does not autoplay.
