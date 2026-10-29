# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Back-to-top button**: Feed pages now show a small floating button in the lower-left corner after you scroll down. Click it to return smoothly to the top of the feed.

### Fixed

- **Profiles load again and errors stay contained**: Profile pages now load the blog description instead of crashing with a fullscreen "BlogDescription is not defined" error. If a page or the profile header fails unexpectedly, the app shows a friendly retry panel and keeps the rest of the profile available, and navigating elsewhere clears the error.
- **Pagination stops when BDSMLR repeats a page**: With "Most popular" sorting, the API can return the same page again when you load more. The app now notices that a page has no new posts, stops paginating, and never appends duplicate cards.
- **Reblog works again**: BDSMLR now rejects the API reblog endpoint for signed-in browser sessions with a "session required" error, so the button did nothing. Reblogs now go through the same web-session reblog flow as the official site, including notes, tags, and queued reblogs, and the post appears on your blog again.
- **GIF posts with dead video alternates now display**: Some GIF posts expose a `video/mp4` alternate that 404s even though the original GIF is valid. Post cards and detail pages now try the next media candidate when a video or image fails, so these posts fall back to the GIF. Social previews also choose the first working image candidate.
- **RSS feeds skip dead video alternates**: Blog RSS feeds now use the image fallback for GIF posts instead of a dead `video/mp4` enclosure, so feed readers receive media that actually loads.
- **Sort dropdown matches what it shows** — Choosing "Most popular", "Least popular", or a "Most liked/commented/reblogged" option now highlights that same option and loads posts in the expected order. Previously the labels and the actual sort were reversed, so picking "Most popular" could display "Least popular" and return the wrong posts.
- **Conversations open on the newest message** — Opening a conversation now scrolls to the bottom so you see the most recent messages first, instead of starting at the top of the thread. Sending a reply keeps you at the bottom, while loading older messages keeps your place.
- **Profile pictures and blog covers display again** — BDSMLR's blog lookup started returning avatar and cover URLs with a broken media proxy prefix, so every profile picture fell back to a letter placeholder. The app now uses the working signed CDN URL from those responses.
- **Tag searches keep loading past the first page** — BDSMLR changed its search response to group repeated reblogs into a single "result unit" and to report a `hasMore` flag, leaving `null` gaps in the older `posts` list. The home feed now reads the grouped results, skips empty slots, and uses `hasMore` to know when to stop, so searches no longer stall after the first page or show blank cards. A freshly started search that is still "warming up" is retried briefly instead of being treated as having no results.
- **Profile and RSS feeds no longer get stuck repeating the same posts** — BDSMLR's `list-blog-activity` endpoint loops forever (returns the same page and token) when a request includes reblogs but not likes/comments. The app now requests the full activity set and filters out like/comment events internally, so feeds advance correctly and reblogs still show up. "Hide reblogs" continues to work.

### Changed

- **Expanded, privacy-conscious usage analytics**: The app now records coarse, anonymous events such as likes, reblogs, searches, comments, sign-ins, follows, and feed view changes, so the next round of work can follow how people actually use the app. Events never include post content, comments, messages, search text, tag names, blog names, emails, or passwords. Do Not Track is honored.
- **Landing page tone**: Removed comparisons that criticized the official BDSMLR frontend. The page now presents the app as a community effort and keeps the offer to work with the BDSMLR team in a professional capacity.
- **Landing AI spend section simplified**: The per-model breakdown is gone. The section now says that most work uses DeepSeek V4.1 Flash, above the total spend and session count.
- **Simpler About page**: The backend explanation is now a few short conversational paragraphs instead of two long lists.
- **Discord in the top bar**: Signed-in visitors now see a Discord link where the About link used to be. The About link still appears when signed out.
- **Profile tag links open in new tabs**: Top tags, the all-tags modal, and post tags on profile pages now use real links. Ctrl-clicking or middle-clicking opens the same tag filter in a new tab.
- **Softer landing page comparison**: The official frontend comparison now focuses on clutter and polish instead of calling it AI slop.
- **Post page cleanup**: Removed the duplicate "Liked by" and "Reblogged by" line. A chart icon now opens one combined likes-and-reblogs list. The post report button and the separator lines around the action row are gone. The "More like this" feed now sits outside the post card and keeps loading automatically.
- **Related tags removed, tag affinity added to search**: Profiles no longer show the Related tags row. Blog search now shows Tag affinity, based on the tags of posts you liked, with links that run the same tag search from the home feed.
- **For You is disabled by default**: The For You feed is behind a feature flag for now because it loads slowly and lacks pagination. The Following feed at `/home` remains the default way to browse.
- **Documentation cleanup**: Removed obsolete setup instructions from the README and simplified the disabled-feature messages.
- **Tag links and search pages**: Tag pills now run their search on the home feed instead of opening a separate tag page. The standalone `/search` page has been removed. Blog search is now `/blog-search` and lives in the avatar menu. Old `/search` URLs redirect to the new destinations.
- **Landing copy**: The hero now highlights the human-built, intuitive UI and contrasts it with the official frontend.
- **Logged-in visitors skip the landing page**: Opening `/` while signed in now renders the feed immediately and updates the URL to `/home`, so the landing page no longer flashes first. Search and pagination stay on `/home`.
- **Landing hero**: The hero now shows a real screenshot of the signed-in Following feed instead of a link card preview.
- **Profile search now matches the global search** — Searching on a profile runs the same tag search as the home feed, scoped to that blog with a `blog:<name>` prefix, instead of a separate filtered activity query. Results use the same sort options and session pagination, so paging through a profile search no longer risks duplicates or skipped pages. You can still clear the search to return to the blog's normal feed.
- **Profile navigation** — The Feed and Following links on profile pages are now tabs below the profile header, styled like Twitter/Bluesky, with the active tab highlighted by an underline. The BDSMLR and RSS icons are grouped together and right-aligned in the top-right corner of the profile header.

### Added

- **Hide repeating images**: Some blogs, such as Rectrix, show the same images in nearly every post because BDSMLR repeats media entries in its feed response. A new **Hide repeating images** option in the profile settings menu compares the three most recent image posts and hides the images they share, while keeping each post's unique images. RSS feeds match the setting with `?hide_repeating_images=1` when it is enabled.
- **Profile favicons**: On a blog's pages, the browser tab now shows that blog's profile picture instead of the app icon, so profiles are easy to tell apart in open tabs.
- **Collapsed multi-media posts**: Feed cards with more than two images or media now show the first two and a Show more button, with Show less to collapse them again. The highlighted post on a post detail page still shows all of its media immediately.
- **Landing page AI spend tally**: The landing page now shows the total OpenCode spend for this repository, the number of sessions, and the share of sessions by model.
- **Expandable blog descriptions**: Long profile descriptions are now truncated to a tweet-length preview. A Show more button reveals the full text, Show less collapses it again, line breaks are preserved, and links are clickable.
- **Landing page contact**: The landing page now invites the BDSMLR team to reach out on Discord if they want help improving the official site.
- **Auto-loading pagination**: Every list with a Load more button now fetches the next page automatically when the button scrolls into view. This covers search results, For You, activity, follower feeds, comments, likes and reblogs, related posts, and blog search.
- **Age confirmation on the landing page**: First-time visitors now see a full-page 18+ confirmation dialog. Confirming stores the answer in the browser, and the dialog only runs on the landing page.
- **Feature flags for legacy features**: Compose, drafts, account changes, blog customization, and legacy queue/asks/submissions/settings links are now disabled by default until their BDSMLR backend behavior is verified. Each one has a `VITE_FEATURE_*` flag that stays disabled until its backend behavior is verified.
- **Account, blog customization, and drafts**: The settings page can now change your email, password, and blog name. A new customization page edits blog title, description, theme, fonts, colors, avatar, header images, display options, and interests. A new drafts page lists saved drafts with Publish, Publish to queue, and Delete actions.
- **Activity badge**: The Activity item in the profile menu now shows a count when new activity appears on your active blog since you last opened its activity feed.
- **Archive, related tags, settings, and blocked blogs**: Profiles now have an Archive tab with month and post-type filters, plus a Related tags row based on tag affinity. The new `/settings` page shows account and blog shortcuts, and `/blocked` lists blocked blogs with an Unblock button.
- **Discord community**: The landing page and the profile menu now link to the official Discord invite, opening in a new tab.
- **Compose posts**: The new `/compose` page can publish text, quote, link, chat, image, video, and audio posts to the active blog. Text, image, and video posts also support queue and draft modes. Queue management, drafts, asks, and settings remain linked to BDSMLR for now.
- **Landing page**: The root URL now opens a public landing page with a feature overview, share-preview examples, and a login button. The following feed moved to `/home`, and login remains at `/login`.
- **Social previews**: Links to the site, profiles, and posts now include Open Graph and Twitter preview data for Discord and other social apps. The home page uses a branded preview image, profiles show the blog avatar and description, and posts show the first image from the post.
- **About page**: A new `/about` page explains in plain language why the app needs a backend, what it does with your login and cookies, and what it does not store or control.
- **Approximate tag count warning**: When a profile tag search finishes and returns fewer posts than the tag's Top tags count, the page now explains that BDSMLR's tag counts are approximate and can be stale or broader than the blog search. Top tag counts also have a tooltip with the same clarification.
- **Messaging upgrades**: Messages can now include images, and the conversation header has Block/Unblock, Archive, and Clear actions. New messages show recipient suggestions as you type. Unread conversations add a count badge to the profile menu and the header.
- **For You and recommendations**: The new `/for-you` feed shows recommended posts and a row of recommended blogs. It is available from the profile menu.
- **Related posts**: Post detail pages now include a "More like this" section with pagination.
- **Engagement lists**: Post pages show "Liked by" and "Reblogged by" buttons that open paginated lists of the blogs behind those counts.
- **Search and tag pages**: The new `/search` page can search posts or blogs. Tags on post detail pages now open dedicated tag pages with their own post feed.
- **Activity and follower feeds**: Profiles now have Activity and Followers' feed tabs. Activity can be filtered to Posts, Reblogs, Likes, or Comments, and `/activity` opens your own activity.
- **Blog social actions**: Profiles now have Follow and Following buttons, plus tabs for Followers and Other blogs owned by the same user. The blog action menu can start a message, block or unblock the blog, and report it. Follow counts and the following cache update immediately.
- **Post controls**: Post detail pages can report a post or delete one you own. Reblogs now open a composer where you can add a note and tags, or queue the reblog instead of publishing it immediately.
- **Active blog switching**: If your account owns more than one blog, the profile menu now lets you choose the active blog. Likes, reblogs, comments, follows, blocks, reports, liked posts, and the home feed all use that blog.
- **Messages**: A new `/messages` page brings your BDSMLR inbox into the app. Browse and search conversations, read threads, see which messages you sent, and send replies from the conversation view. The **New message** button starts a conversation with any blog by name. Signing in now also starts the BDSMLR web session that messaging needs, and the Messages link is in your profile menu.
- **Comments** — Every post now has a comments view: click the comment count on a feed card to open it in a dialog, or scroll to the comments section on the post detail page. Comments show the author, time, and body, can be paginated, and signed-in users can post a new comment without leaving the page.
- **Likes and reblogs** — Posts on every feed and on post detail pages now have working Like and Reblog buttons. Click the heart to like or unlike a post, and click the reblog icon to reblog it to your primary blog. Buttons highlight when you have already liked or reblogged a post, and the counts update without reloading the page.
- **Search queries and pages live in the URL** — Searching on the home feed or a profile puts the query in the address bar (`?tag_name=…`), and the page number plus the search's session token are added as you load more (`&page=3&session=…`). Bookmark or share a search to reopen it later: opening the URL jumps straight back to that page with a single request. Changing the query or sort starts over from the first page, and you can still step back and forward through your past searches with the browser buttons.
- **RSS feeds advertise their next page** — Feed readers that support pagination can now fetch older posts by following the `<atom:link rel="next">` link in each feed page. The link only appears when more posts exist, and it keeps any `v2_session` or `include_reblogs` options from the original feed URL.
- **Generic post links redirect to the author's page** — Opening a shared link to `/post/<id>` now jumps straight to the author's profile at `/blog/post/<id>` when the blog still exists, so you immediately see their profile header and Feed/Following tabs. The post card animates smoothly into place on the new page instead of reloading, and posts you've already opened load instantly. If the blog has been deleted, the post stays fully readable with the "Blog gone" notice rather than redirecting.
- **Grid view for post lists** — Every feed (home, profiles, liked posts) now has a view toggle on the far right of the search bar. Click it to switch between a list and a grid layout: the grid packs posts into responsive columns with images up top and text clamped short. Your choice is remembered across visits.
- **Deleted blogs on permalink pages** — When you open a post whose blog has been deleted, the page now shows a "Blog gone" notice and a chip next to the post type. The author's name and avatar are no longer clickable, but the post itself stays fully readable.

### Removed

- **Download buttons removed** — The download-image button, its download modal, and the associated backend ZIP/download endpoint have been removed from all posts across the app.
- **Short videos loop automatically** — Videos shorter than 20 seconds now replay on a loop, so clips feel like GIFs. Longer videos still play once with normal controls.
- **Search history dropdown** — The home feed and every profile page now remember the searches you've run. Click the arrow on the right side of the search box to open a floating list of past queries; clicking an entry re-runs that search instantly. Each entry has an × to remove it — clicking the × once turns the row red as a delete confirmation, and clicking again deletes it. Home-feed searches and each profile's searches are kept separate.
- **Author avatars in feed cards** — Every post on the home feed, liked page, profile feeds, and post detail pages now shows the author's profile picture next to their name. Clicking the avatar jumps to that blog. Avatars without a profile picture fall back to a letter placeholder, and lookups are cached for the session so feeds scroll without repeated requests.
- **RSS feeds for every profile** — Every profile page now has an RSS icon next to the BDSMLR/Feed/Following links. Clicking it opens `/<user>/rss` in a new tab: an XML feed of the blog's recent posts (with media enclosures) that you can paste straight into any RSS reader, such as imaglr.
- **RSS feeds for private blogs** — If a profile is private and you're signed in, the RSS icon automatically embeds your session token in the feed URL so the feed can pull protected content. A warning triangle next to the icon explains that the feed URL contains your session token and should not be shared, since it could let someone else take over your account. Saving the feed in an RSS reader you trust or using it with the imaglr importer is fine.
- **"Hide reblogs" reflected in RSS** — The RSS feed URL honors the profile's "Hide reblogs" setting: it sends `include_reblogs=1` when reblogs are shown and `include_reblogs=0` when they're hidden, so the feed matches what you see on the profile.

### Added

- **Infinite scroll on all feeds** — Feeds now automatically load the next page as you scroll toward the bottom. The **Load more** button still appears at the end as a fallback, so you can manually trigger another load if the auto-load fails or the API incorrectly reports there are no more posts.
- **Smarter API response caching** — Stable lookups like `resolve-identifier`, `get-blog`, `get-post-detail`, and `list-blog-top-tags` are now fetched as `GET` requests, so the browser caches them locally per its `Cache-Control` max-age (up to a day for identifier lookups, 30 minutes for blog metadata and top tags, 60 seconds for post details). Previously these were `POST` requests, which browsers never cache, forcing a slow round-trip to the backend on every navigation. `list-blog-activity` responses are explicitly `no-store` since they change constantly, and auth and signed-URL requests are never cached.
- **Following graph cached in localStorage** — When you log in, all blog IDs you follow are fetched (all pages) and cached locally. The home feed now uses this cache instead of re-fetching the graph, and the cache refreshes when you visit your own following page.
- **Permalink pages show the author's profile header** — The Permalink button now opens posts at `/blog/post/<id>` instead of `/post/<id>`. This new page renders the same post detail as before but also loads the author's profile header (avatar, title, description, and Feed/Following links) above it.

### Fixed

- **Search pagination uses sessions** — BDSMLR replaced page tokens for tag searches with an opaque session ID, so the home-feed search now sends an incrementing page number and re-sends the session returned by the previous page. Search now keeps loading subsequent pages correctly instead of stalling after the first page.
- **Videos no longer open in the lightbox** — Clicking a video on the home feed, liked page, profiles, or post detail used to launch the full-screen lightbox, which just showed a small muted player. Videos now ignore those clicks and keep their native fullscreen button and controls instead; only images open the lightbox.
- **Home feed infinite scroll now works by default** — The home page's auto-load was set up before the auth-gated feed rendered, so scrolling never triggered the next page and you had to click **Load more** manually. The scroll watcher now attaches once you're signed in, so the feed loads pages automatically as you scroll toward the bottom.
- **GIFs with no original mime type now render** — When a post's `mediaRepresentation` item has an `original` URL whose `mimeType` is missing (common for older GIFs served as `video/mp4`), the app now falls back to the item's `alternates` and renders the first one that declares a mime type. If there are no usable alternates, it still renders the `original` URL, guessing the type from the file extension.
- **Static-image posts with dead video alternates now display** — When an `original` has no mime type but a static-image extension (e.g. `webp`), the original is now preferred over `video/mp4` alternates, which are sometimes dead links. GIF originals still defer to a mime-typed alternate, since they may be served as `video/mp4`.
- **Unit tests for media handling** — `pnpm test` runs Vitest coverage over the media URL selection logic (`getMediaType`, `getPostMediaUrls`, proxy rewriting) using real posts as fixtures. `docs/media-cases.md` lists the known weird `mediaRepresentation` shapes for manual spot-checks.
- **Vercel deployments now serve the app** — The build now emits a Vercel-compatible serverless output when built on Vercel (`VERCEL=1`), so deployments respond with the app instead of a `404 NOT_FOUND`. Local builds are unchanged.
- **Lightbox close button now always visible** — The close button uses `position: fixed` instead of `position: absolute` so it stays pinned to the viewport's top-right corner, even when the image is taller than the screen.

- **Login session cookies now persist correctly** — The API proxy now strips the `Domain` attribute from `Set-Cookie` headers returned by BDSMLR's login endpoint. Previously, the cookie was rejected by the browser because its domain (`bdsmlr.com`) didn't match the app domain. You can now sign in and access protected blogs that require authentication.
- **Images and videos display again after API format change** — BDSMLR moved media URLs from `content.files` into a new `mediaRepresentation` field. Posts now read images and videos from the new structure, using the signed `original.url` directly instead of rewriting through a proxy that broke the signatures.
- **Cursor-based pagination on home feed** — The home page now uses page tokens (`nextPageToken`) for both tag search and following feed, matching the liked page behavior. Load more is no longer limited to the initial search page; the following feed also supports incremental loading.
- **Cursor-based pagination on profile pages** — Profile feeds now use page tokens for pagination like the home and liked pages, instead of numeric page offsets. Scrolling past the first page resumes exactly where the API left off, so no posts are skipped or duplicated when new content is posted while you browse.
- **Page token persisted in URL** — After loading a subsequent page, the next page token is stored as a `?page_token=` query parameter on the home feed and liked posts pages. Reloading or bookmarking resumes from that page. The first page leaves the URL clean.
- **Media URL routing** — Image and video URLs now route through the `media.bdsmlr.com` proxy instead of directly hitting CDN hosts. Feed pages use `/feed/` size, post detail and LightBox use `/lightbox/` for highest resolution, and GIFs/videos use `/raw/`.

### Added

- **Hide reblogs toggle on profile** — A gear icon next to the search bar now opens a settings dropdown with a "Hide reblogs" checkbox. When checked, only original posts from the creator are shown; reblogged content is hidden.

- **Windows desktop app** — A single-executable Windows app is now available. Run `BetterBDSMLR.exe` and it lives in the system tray. Right-click the tray icon to open the app in your browser or quit. No extra installation required.

- **HTTP request logging** — Server logs now show every incoming HTTP request (`--> GET /path`) and its response (`<-- GET /path 200 12ms`), making it easier to observe server activity and diagnose issues.

- **Search posts by tag now sends `post_types` and `variants`** — The tag search API request now includes the `post_types` array (defaulting to all post types) and a `variants` field, aligning with the API spec and improving result accuracy.

## [0.3.0] - 2026-06-15

### Added

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
