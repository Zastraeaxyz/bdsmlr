# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **RSS feeds for every profile** — Every profile page now has an RSS icon next to the BDSMLR/Feed/Following links. Clicking it opens `/<user>/rss` in a new tab: an XML feed of the blog's recent posts (with media enclosures) that you can paste straight into any RSS reader, such as imaglr.
- **RSS feeds for private blogs** — If a profile is private and you're signed in, the RSS icon automatically embeds your session token in the feed URL so the feed can pull protected content. A warning triangle next to the icon explains that the feed URL contains your session token and should not be shared, since it could let someone else take over your account. Saving the feed in an RSS reader you trust or using it with the imaglr importer is fine.
- **"Hide reblogs" reflected in RSS** — The RSS feed URL honors the profile's "Hide reblogs" setting: it sends `include_reblogs=1` when reblogs are shown and `include_reblogs=0` when they're hidden, so the feed matches what you see on the profile.

### Added

- **Infinite scroll on all feeds** — Feeds now automatically load the next page as you scroll toward the bottom. The **Load more** button still appears at the end as a fallback, so you can manually trigger another load if the auto-load fails or the API incorrectly reports there are no more posts.
- **Smarter API response caching** — Stable lookups like `resolve-identifier`, `get-blog`, `get-post-detail`, and `list-blog-top-tags` are now fetched as `GET` requests, so the browser caches them locally per its `Cache-Control` max-age (up to a day for identifier lookups, 30 minutes for blog metadata and top tags, 60 seconds for post details). Previously these were `POST` requests, which browsers never cache, forcing a slow round-trip to the backend on every navigation. `list-blog-activity` responses are explicitly `no-store` since they change constantly, and auth and signed-URL requests are never cached.
- **Following graph cached in localStorage** — When you log in, all blog IDs you follow are fetched (all pages) and cached locally. The home feed now uses this cache instead of re-fetching the graph, and the cache refreshes when you visit your own following page.
- **Permalink pages show the author's profile header** — The Permalink button now opens posts at `/blog/post/<id>` instead of `/post/<id>`. This new page renders the same post detail as before but also loads the author's profile header (avatar, title, description, and Feed/Following links) above it.

### Fixed

- **GIFs with no original mime type now render** — When a post's `mediaRepresentation` item has an `original` URL whose `mimeType` is missing (common for older GIFs served as `video/mp4`), the app now falls back to the item's `alternates` and renders the first one that declares a mime type instead of showing a broken image.
- **Vercel deployments now serve the app** — The build now emits a Vercel-compatible serverless output when built on Vercel (`VERCEL=1`), so deployments respond with the app instead of a `404 NOT_FOUND`. Docker and local builds are unchanged.
- **Lightbox close button now always visible** — The close button uses `position: fixed` instead of `position: absolute` so it stays pinned to the viewport's top-right corner, even when the image is taller than the screen.

- **Login session cookies now persist correctly** — The API proxy now strips the `Domain` attribute from `Set-Cookie` headers returned by BDSMLR's login endpoint. Previously, the cookie was rejected by the browser because its domain (`bdsmlr.com`) didn't match the app domain. You can now sign in and access protected blogs that require authentication.
- **Images and videos display again after API format change** — BDSMLR moved media URLs from `content.files` into a new `mediaRepresentation` field. Posts now read images and videos from the new structure, using the signed `original.url` directly instead of rewriting through a proxy that broke the signatures.
- **Cursor-based pagination on home feed** — The home page now uses page tokens (`nextPageToken`) for both tag search and following feed, matching the liked page behavior. Load more is no longer limited to the initial search page; the following feed also supports incremental loading.
- **Cursor-based pagination on profile pages** — Profile feeds now use page tokens for pagination like the home and liked pages, instead of numeric page offsets. Scrolling past the first page resumes exactly where the API left off, so no posts are skipped or duplicated when new content is posted while you browse.
- **Page token persisted in URL** — After loading a subsequent page, the next page token is stored as a `?page_token=` query parameter on the home feed and liked posts pages. Reloading or bookmarking resumes from that page. The first page leaves the URL clean.
- **Media URL routing** — Image and video URLs now route through the `media.bdsmlr.com` proxy instead of directly hitting CDN hosts. Feed pages use `/feed/` size, post detail and LightBox use `/lightbox/` for highest resolution, and GIFs/videos use `/raw/`.

### Added

- **Hide reblogs toggle on profile** — A gear icon next to the search bar now opens a settings dropdown with a "Hide reblogs" checkbox. When checked, only original posts from the creator are shown; reblogged content is hidden.

- **Windows desktop app** — A single-executable Windows app is now available. Run `BetterBDSMLR.exe` and it lives in the system tray. Right-click the tray icon to open the app in your browser or quit. No Docker or Node.js installation required.

- **HTTP request logging** — Docker container logs now show every incoming HTTP request (`--> GET /path`) and its response (`<-- GET /path 200 12ms`), making it easier to observe server activity and diagnose issues.

- **Search posts by tag now sends `post_types` and `variants`** — The tag search API request now includes the `post_types` array (defaulting to all post types) and a `variants` field, aligning with the API spec and improving result accuracy.

## [0.3.0] - 2026-06-15

### Added

- **Docker support** — The app can now be deployed with Docker. A multi-stage `Dockerfile` produces a lean production image, and `docker-compose.yml` wires it together with a persistent SQLite volume.
- **SQLite database infrastructure** — Added a SQLite database layer with Drizzle ORM, laying the groundwork for persisting server-side state such as download jobs.
- **Header view transition** — The header now animates smoothly during page navigations using the View Transitions API.
- **User dropdown in navbar** — The navbar now shows your avatar and username instead of a plain "Sign out" button. Clicking it opens a dropdown with a "Following" shortcut and a "Sign out" button. The dropdown closes on outside click or Escape.
- **Following page** — Visit `/:username/following` to see every blog a user follows, with each blog's avatar, title, description, creation date, and following count. The navbar has a `Following` shortcut for the current user.
- **Profile Following button** — Every user profile page now has a "Following" button next to the BDSMLR icon that links to the user's following list.
- **Following and Feed button bolding** — Active Feed/Following buttons are now bold on profile and following pages for clearer navigation state.
- **Shared layout for user routes** — User routes now share a persistent layout with a sticky blog-header, improving navigation consistency.

### Changed

- **Cache-control for API proxy** — Proxied API responses now include a 60-second `Cache-Control` header to reduce redundant requests.

### Fixed

- **Avatar refetch on navigation** — The header no longer re-fetches the current user's avatar on every page navigation; the result is cached for the session.
- **Null-safe avatar** — Fixed a guard against null `title` and `blogName` in the avatar placeholder. Blogs without avatars now correctly show a letter placeholder.
- **Pagination in blog-follow-graph** — The blog-follow-graph request now fetches all pages instead of stopping after the first page.
- **Dockerfile duplicate install** — Removed duplicate `pnpm install` from the Dockerfile final stage.
- **Server startup** — The Docker image now runs the built server directly instead of via `pnpm start`.
- **PORT environment** — The Docker Compose file explicitly sets `PORT=3000` to match the container's exposed port.

## [0.2.0] - 2026-06-15

### Added

- **Show all tags** — A "Show all (N)" button appears after the top 5 tags on user profiles. Clicking it opens a modal with every remaining tag. The modal closes when you click outside, click the X, or click a tag (which also adds it to the current filter).
- **Bulk downloads** — You can now download every post from a blog or all of your liked posts as a single ZIP archive. A progress panel in the header tracks each job and lets you download the ZIP once it is ready.
- **Resumable downloads** — Bulk downloads are persisted on the server using SQLite. If you navigate away or close the tab, the job continues in the background and you can resume it when you return.
- **Login disclaimer** — The login page now shows a legal disclaimer explaining that this is an alternative front-end to BDSMLR, that all content is user-provided and hosted by BDSMLR, and that you must be of legal age to view adult content. You must check an acknowledgement box before signing in, confirming that the developers own no displayed content and that you comply with BDSMLR's Terms of Service.
- **Profile search fix** — Searching on user profiles now uses the blog-specific search API again instead of the global tag search.
- **Sort readability** — Sort field and order values are now expressed as human-readable named constants (`SortField.Date`, `SortOrder.Descending`, etc.) throughout the codebase.
- **Sort label fix** — Sort dropdowns now correctly label `Date + Descending` as "Newest" and `Date + Ascending` as "Oldest", matching the actual API semantics.
- **Custom sort dropdown** — The sort selector is now a custom dropdown instead of a native browser `<select>`. It stays open when you click elsewhere on the page, and its selection persists when you submit a search or press Enter. Each page can configure which sort options are available.
- **Open on BDSMLR** — Every post card and profile page now has a button that opens the original post or blog on BDSMLR in a new tab.

### Fixed

- **Auth reactivity** — Extracted auth state into a shared `useAuth` hook with a context provider so the nav bar and every page reactively reflect the login state instead of each one duplicating `localStorage` reads and module-level variable checks. Login redirects and sign-out now work consistently across all routes.
- **Tags with spaces** — Tags containing spaces are now wrapped in quotes when added to the search filter (e.g. `tag:"hello world"` instead of `tag:hello world`), so the API correctly matches the full tag.
- **Liked posts bulk download authentication** — The liked-posts page and download-jobs panel now read the user from `localStorage` reactively instead of capturing it at module load time, so the bulk download button works reliably on direct page refreshes.
- **Cookie forwarding for download jobs** — All download-job API calls now explicitly send `credentials: 'include'`, ensuring the server can forward the authentication cookie to the BDSMLR API when discovering and downloading liked posts.
- **Two-phase bulk downloads** — Clicking "Download all" now starts a discovery phase that finds all posts without downloading anything. Once discovery is complete, the download panel shows a confirmation prompt: "You're about to download X images from Y posts." You must click "Start download" before any actual downloading begins. This makes large bulk downloads more predictable and easier to debug.

## [0.1.0] - 2026-06-15

### Added

- **Login** — Log in with your email/username and password. Your session stays active across browser tabs.
- **Read-only** — Browse and view content. Posting/liking/following new posts/users unsupported.
- **Compliant** — Complies with bdsmlr's openapi spec and does not use `internal-write` endpoints.
- **Home feed** — See posts from the people you follow right on the home page.
- **User profiles** — Visit any blog by name to see their posts, profile picture, description, and popular tags.
- **Search** — Find posts with powerful filters: by tag, blog name, post type, media type, or date. Includes search tips, and every tag is clickable to find more like it. Search from the beginning of the app's history.
- **Tag search** — Click any tag or search for one to discover all posts with that tag, with sorting options.
- **Post pages** — Click any post to see it in full detail with all media, tags, and engagement counts. Permalinks to share or revisit posts.
- **Liked posts** — Browse everything you've liked, with sorting options.
- **Download posts** — Each post has a download button that supports both single and multiple images, with the option to preserve order, as well as videos.
- **Full-screen media** — Tap any image or video to view it full-screen without losing quality.
- **Reblog tracking** — See who originally posted content and jump straight to the original post.
- **Fixed Media** — Using old source urls to allow images/gifs/videos to play like they once did.
- **Smooth media** — Images, GIFs, and videos display smoothly in your feed. Animated GIFs play automatically.
- **Deleted posts** — Posts from deleted authors now show a "DELETED" flair so you know why they can't be opened, and their permalinks are hidden.
