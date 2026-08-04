# Rules

1. Never commit or push unless explicitly requested by the user.
2. Always use conventional commits style (e.g. `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, etc.).
3. This is a SolidJS repository, not a React repository. You may not do inline maps or inline IIFEs in JSX, as those break Solid's ability to track elements. Use `<For>` instead of `.map()` and `<Show>` instead of conditional IIFEs.
4. Every commit that introduces a user-facing change must update `CHANGELOG.md` before committing. For additions and non-breaking changes, write entries in UX language: describe what the user can now do, see, or experience. For fixes and breaking changes, you may explain why at a more technical level when relevant or useful to the consumer. Keep entries concise. Use existing entries in the file as examples.

# API quirks

If a new API quirk has been discovered, please document it here in #API Quirks section.

- Login response is **snake_case** (`blog_id`, `blog_name`, `user_id`).
- `resolveIdentifier` returns **camelCase** (`blogId`, `blogName`).
- `listBlogActivity` request fields are **snake_case**; pagination always uses `page: { page_size, page_token? }` (cursor-based, never `page` as an integer) and `page_size` is duplicated at the top level of the request; `activity_kinds` uses `['post', 'reblog']`; the search query is `q`.
- `searchPostsByTag` request field is **snake_case** `tag_name` (same query syntax as `listBlogActivity`'s `q`).
- `getBlog` for a **private** blog when unauthenticated returns **HTTP 404** with `{"error":"blog not found"}` (not a 200 with an empty blog). The `rssApi` client surfaces this as a thrown `Error`, and callers must treat a failed/anonymous `getBlog` for a resolvable `blogId` as "private".
- `.gif` files may be served as `video/mp4`. Render each URL in a `.media-shell` (CSS grid overlapping) with both `<img>` and `<video muted controls>`. Each hides on `onError`. For `.gif`-as-video, the `<video>` gets `autoplay loop playsinline`; for other videos, `autoplay`/`loop`/`playsinline` are omitted so the video starts muted but does not autoplay.
