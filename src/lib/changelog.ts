export type ChangelogKind = "Added" | "Improved" | "Fixed" | "Removed";

export interface ChangelogEntry {
  /** What kind of change this was, shown as a tag next to the title. */
  kind: ChangelogKind;
  /**
   * Stable identity, used to remember which entries a visitor has read. It
   * defaults to a slug of the title, so most entries do not need one. Set it
   * when a title changes but the entry should stay the same entry.
   */
  id?: string;
  /** Short headline for the change. */
  title: string;
  /** One or two sentences of detail, written for people using the app. */
  body: string;
}

export interface ChangelogDay {
  /** Day the change went live, as `YYYY-MM-DD`. */
  date: string;
  /** Optional line under the date, used for context on the earliest group. */
  note?: string;
  changes: ChangelogEntry[];
}

/**
 * The app changelog. This file is the source of truth for user-facing changes.
 *
 * Add new work to the top of today's `changes` list, creating today's day
 * group if it does not exist yet. Days run newest first, and entries within a
 * day run newest first too. Write for people using the app, not for
 * developers: say what they can now do or what stopped being broken.
 */
export const changelog: ChangelogDay[] = [
  {
    date: "2026-11-27",
    changes: [
      {
        kind: "Fixed",
        title: "The load more button goes away at the end of a feed",
        body: "The following, profile, and liked feeds kept showing a load more button after the last page, and clicking it did nothing. It now disappears once there is nothing older to fetch, and if a page fails to load it can be clicked again to retry instead of staying dead until you reload.",
      },
      {
        kind: "Fixed",
        title: "Clearer notice on private blogs",
        body: "When you are signed in and a blog is private, the page no longer tells you to follow it first. Private blogs stay hidden until the owner adds you, so the notice now just says the blog is not visible to you.",
      },
      {
        kind: "Fixed",
        title: "Sorting a profile no longer claims the feed is empty",
        body: "Changing the sort order cleared the feed and showed \"No posts in feed\" while the new order was still loading. You now see the loading placeholders until the sorted posts arrive, and switching sort quickly can no longer leave posts in the old order.",
      },
      {
        kind: "Improved",
        title: "Less jumping while images load",
        body: "Post images and videos now hold a placeholder height until they have loaded, so the feed and post pages no longer shove everything below them down mid-scroll. Lazy loading is unchanged, it just shows a grey block instead of an empty gap.",
      },
    ],
  },
  {
    date: "2026-11-25",
    changes: [
      {
        kind: "Fixed",
        title: "Image drafts open in the editor",
        body: "Editing a draft with an image now loads its caption, tags, and post type instead of showing \"Could not load the draft\". Text drafts were already working; image drafts use a different editor layout that the app did not recognise.",
      },
    ],
  },
  {
    date: "2026-11-24",
    changes: [
      {
        kind: "Improved",
        title: "New app icon",
        body: "The app icon, home screen icon, and browser tab icon are now a pair of steel handcuffs instead of the purple bolt.",
      },
      {
        kind: "Fixed",
        title: "Post pages stop flooding BDSMLR with requests",
        body: "Related posts used to render every post the API sent, sometimes more than 200 at once, and each card asked BDSMLR for its author's profile just to draw an avatar. Pages now show a normal batch, load more when you ask for it, and fetch an avatar only when it is about to appear on screen.",
      },
      {
        kind: "Improved",
        title: "Fewer background refreshes",
        body: "The header no longer refetches the message and activity badges every time you move between pages or refocus the tab, and the block list is reused for a few minutes. That leaves more of BDSMLR's request budget for the page you are actually reading.",
      },
    ],
  },
  {
    date: "2026-11-23",
    changes: [
      {
        kind: "Improved",
        title: "Post links stay in the app",
        body: "Blog, post, and tag links inside post descriptions now open here instead of bdsmlr.com. A credit like `https://kingnothing55.bdsmlr.com/` becomes `bdsmlr.zastraea.xyz/kingnothing55`, and the link text updates with it. The BDSMLR button in the post header still takes you to the original post.",
      },
      {
        kind: "Fixed",
        title: "Escaped post descriptions render cleanly",
        body: "Some blogs, like john-mirror-captions, save their description as escaped HTML. Those posts now show their text and links normally instead of raw backslashes and broken markup.",
      },
      {
        kind: "Improved",
        title: "Originals button on profile feeds",
        body: "The Hide reblogs setting is gone. A new Originals button in the profile feed settings puts `blog:<username>` into the search field and reloads the feed with that blog's original posts, which avoids the empty feeds the old filter sometimes produced. If the search already has that blog, the button does nothing.",
      },
      {
        kind: "Improved",
        title: "Reblog sources link to the author",
        body: "Clicking \"reblogged from\" now opens the original post at the author's own address instead of a post-only link. If the original post has been deleted, you still land on the author's blog rather than a dead end. Older post-only links keep working.",
      },
    ],
  },
  {
    date: "2026-11-22",
    changes: [
      {
        kind: "Added",
        title: "Install it like an app",
        body: "On Android, Chrome can now install Better BDSMLR with its own icon on your home screen. It opens in its own window, without the browser bars. Settings shows an Install app button when your browser offers one, and on iPhone Safari you can add it from the Share menu. It still needs a connection, since posts and images come from BDSMLR.",
      },
      {
        kind: "Improved",
        title: "A cleaner interface for small screens",
        body: "Buttons, cards, dialogs, menus, and forms now look and behave the same across the app. Post pages, feeds, messages, the composer, and account screens were rebuilt for phones, with larger tap targets, clearer spacing, and dialogs that slide up from the bottom.",
      },
      {
        kind: "Improved",
        title: "Messages in the main navigation",
        body: "Messages now has a home in the top navigation on desktop and the bottom bar on phones, with its unread count. Activity moved into the menu, and the Discord invite is back in the header on both.",
      },
      {
        kind: "Improved",
        title: "Feed settings open with a tap",
        body: "The gear in a profile feed opens right away on a normal tap, and the panel stays open while you turn reblogs or repeating images on or off.",
      },
      {
        kind: "Improved",
        title: "Bigger media viewer",
        body: "Full-screen images now use all the space between the close and gallery buttons, so they stay as large as possible without being cut off.",
      },
      {
        kind: "Fixed",
        title: "Reblog credit is easier to read",
        body: "The \"reblogged from\" line is larger and has room to breathe before the post.",
      },
      {
        kind: "Improved",
        title: "Deleted posts now say they were deleted",
        body: "Opening a deleted post used to show BDSMLR's one-word status, \"gone\". The page now explains that the post was deleted and can no longer be shown, and gives you a way back into the feed.",
      },
      {
        kind: "Fixed",
        title: "Rate limits now say so instead of looking like a broken blog",
        body: "When BDSMLR starts refusing requests, the app used to show a bare \"Too Many Requests\" or a generic failure, which made it look like this site, or the blog you were reading, was broken. Failed sections now explain that BDSMLR is limiting requests, that nothing is wrong with the blog, and that waiting a minute or two fixes it. A banner at the top of the page counts down while the limit is active.",
      },
      {
        kind: "Fixed",
        title: "Failed requests are no longer cached",
        body: "A single rate limit or server hiccup could be cached by the browser and keep failing for that page for up to a day. Failed responses are never cached now, and existing stale entries are skipped so they heal immediately.",
      },
      {
        kind: "Improved",
        title: "Fewer requests to BDSMLR when browsing",
        body: "Repeated feed requests from the same page are combined, and identical feed requests made within a few seconds reuse the same answer. This makes it much less likely that BDSMLR starts limiting you in the first place.",
      },
    ],
  },
  {
    date: "2026-11-21",
    changes: [
      {
        kind: "Improved",
        title: "Tags on a post search that blog",
        body: "Clicking a tag on a post page now searches the tag on the blog that posted it, so a #cuckold tag on an AmateurCuckolding2 post opens that blog's posts with the tag instead of the site-wide home search. The same goes for tags in the post page's More from the blog tab. Tags on posts from deleted blogs still use the site-wide search."
      },
      {
        kind: "Added",
        title: "More posts from the same blog on post pages",
        body: "Post pages now have two tabs: More like this, which shows related posts from other blogs as before, and More from the blog, which shows older posts from that blog starting at the post you are reading."
      },
      {
        kind: "Improved",
        title: "Reblog progress sits at the top of the screen",
        body: "The reblog progress toast no longer covers the middle of the page, so you can keep reading while a reblog runs. A successful reblog now clears its toast right away instead of lingering for a few seconds, and only failures stay on screen with Retry and Dismiss."
      }
    ]
  },
  {
    date: "2026-11-19",
    changes: [
      {
        kind: "Fixed",
        title: "Connecting the account site checks the pasted cookie",
        body: "The connect form now stops with a clear message unless you paste the whole wordpress_logged_in_...=... cookie line, so a stray value or a different cookie no longer fails later with a confusing error. You still do not need to fill in the account-site username, and an unexpected server response now shows an error instead of a blank screen."
      },
      {
        kind: "Added",
        title: "Invitations page",
        body: "Send invitations, review pending and accepted invites, resend or cancel them, and see who accepted with links to their profiles. Invitations live on BDSMLR's separate account site, so you connect that session once from the new Invitations page."
      }
    ]
  },
  {
    date: "2026-11-18",
    changes: [
      {
        kind: "Improved",
        title: "Browse without an account again",
        body: "Profiles, shared post links, comments, related posts, and blog search are readable without signing in again. Areas that genuinely need your account, such as your home feed, messages, and composing, still send you to the sign-in page."
      }
    ]
  },
  {
    date: "2026-11-17",
    changes: [
      {
        kind: "Added",
        title: "Changelog in the navigation",
        body: "The changelog now has a link in the top navigation. When something ships after your last visit, the link shows how many changes are waiting for you. Entries you have not read yet are marked new on the changelog page, and the counter clears once you open it."
      },
      {
        kind: "Improved",
        title: "Change tags say Added instead of New",
        body: "The tag for brand new features used to say New, which was easy to mix up with the new marker for changes you have not read yet. It now says Added, so the two always mean different things."
      },
      {
        kind: "Added",
        title: "RSS feeds have a settings page",
        body: "Opening a profile's RSS feed in a browser now shows a readable page instead of raw XML. Turn reblogs, repeating-image removal, images-only, and app links on or off, then copy the finished feed URL. Feed readers still get the usual XML. A private blog's feed URL includes your session token so readers can sign in, and the page warns you never to share that URL."
      },
      {
        kind: "Added",
        title: "RSS feeds can point at the zastraea mirror",
        body: "Add `?zastraea=true` to a profile's RSS feed URL and its blog, post, and tag links point at bdsmlr.zastraea.xyz instead of bdsmlr.com. Entry IDs stay the same, so your feed reader will not show old posts as new."
      },
      {
        kind: "Improved",
        title: "Changelog grouped by day",
        body: "This page now lists changes under the day they went live instead of version numbers. Every entry carries an Added, Improved, Fixed, or Removed tag, so it reads as a simple history of the app."
      },
      {
        kind: "Improved",
        title: "Sign in to use the app",
        body: "Browsing now requires a BDSMLR account. Feeds, search, messages, and every other part of the app send you to the sign-in page and return you to where you were afterwards. Two things stay open without an account: a shared post link still shows the post itself, and a profile URL still shows the blog's avatar, title, description, and counts before the sign-in prompt appears."
      },
      {
        kind: "Improved",
        title: "Discord invite on the sign-in screen",
        body: "The sign-in page and the sign-in prompt now link to the community Discord, which is where people ask for a BDSMLR invite. Joining is optional."
      }
    ]
  },
  {
    date: "2026-11-16",
    changes: [
      {
        kind: "Fixed",
        title: "Private blogs ask you to sign in",
        body: "BDSMLR reports a private blog's activity as a missing route, so profiles used to show the raw \"Cannot find any route matching\" error. Profiles and the activity tab now explain that the blog is private and offer a Sign in button instead."
      }
    ]
  },
  {
    date: "2026-11-15",
    changes: [
      {
        kind: "Added",
        title: "Lightbox keyboard navigation",
        body: "Click any image to open the lightbox, then use Left and Right to move through every image and video in that post, including media hidden behind Show more and inline images in text posts. Up and Down jump to the previous or next post in the feed. Escape still closes."
      },
      {
        kind: "Added",
        title: "Open source repository",
        body: "Better BDSMLR is open source again. The landing page, the About page, the footer, and the signed-out navigation now link to `github.com/Zastraeaxyz/bdsmlr`, where the full code is public and issues and pull requests are welcome."
      }
    ]
  },
  {
    date: "2026-11-13",
    changes: [
      {
        kind: "Added",
        title: "Automatic infinite scroll",
        body: "Feeds, search results, comments, related posts, activity, and message history now load the next page as you scroll. The load-more buttons remain as a fallback if automatic loading does not trigger."
      },
      {
        kind: "Added",
        title: "About page FAQ",
        body: "The `/about` page now has a FAQ section. Every question has its own link, so you can send someone straight to an answer, such as `/about#why-are-some-gifs-now-mp4s`."
      }
    ]
  },
  {
    date: "2026-11-10",
    changes: [
      {
        kind: "Improved",
        title: "Reblogs continue in the background",
        body: "Pressing Reblog or Queue now closes the composer right away and shows a centered progress toast while BDSMLR finishes. You can keep browsing, and if the reblog fails the toast offers a Retry button. Closing or reloading the tab while a reblog is still running asks for confirmation first."
      },
      {
        kind: "Improved",
        title: "Videos play when scrolled into view",
        body: "Videos in feeds and post pages now start playing when they scroll into view and pause when they leave, including GIFs that fall back to a video. Clips under 20 seconds loop without a play bar, while longer videos keep the full player controls. Pressing play or pause yourself leaves playback alone, and the full-screen viewer always shows controls."
      }
    ]
  },
  {
    date: "2026-11-04",
    changes: [
      {
        kind: "Added",
        title: "Outage banner",
        body: "When BDSMLR is down, the app can show a banner under the navigation bar explaining that feeds, posts, search, messages, and account actions will not work until BDSMLR is back. It is switched on with the `VITE_BDSMLR_OUTAGE_BANNER` environment variable."
      }
    ]
  },
  {
    date: "2026-10-29",
    note: "Everything that shipped before this page started tracking daily changes.",
    changes: [
      {
        kind: "Added",
        title: "Changelog page",
        body: "`/changelog` now lists every change to the app, newest first. Open it from the avatar menu to catch up on what shipped."
      },
      {
        kind: "Added",
        title: "Queue page",
        body: "`/queue` now lists scheduled posts with their time and blog. You can publish a post now, edit it, remove it, or reschedule it. Queue settings control pause, posting hours, interval, random order, and timezone."
      },
      {
        kind: "Added",
        title: "Draft editing",
        body: "Drafts now have an Edit action that opens the composer with the saved title, body, and tags, then saves back to BDSMLR."
      },
      {
        kind: "Added",
        title: "Post editing",
        body: "Your own posts now show an Edit action that opens the composer with the existing title, body, tags, and link details."
      },
      {
        kind: "Added",
        title: "Back-to-top button",
        body: "Feed pages now show a small floating button in the lower-left corner after you scroll down. Click it to return smoothly to the top of the feed."
      },
      {
        kind: "Added",
        title: "Upload previews",
        body: "Image, video, and audio posts now have a drop zone in the composer. Choose a file or drag it in and you see a preview right away: a thumbnail for images (click to enlarge), a player for video and audio, the file name and size, and a button to remove it before publishing."
      },
      {
        kind: "Added",
        title: "Hide repeating images",
        body: "Some blogs, such as Rectrix, show the same images in nearly every post because BDSMLR repeats media entries in its feed response. A new **Hide repeating images** option in the profile settings menu compares the three most recent image posts and hides the images they share, while keeping each post's unique images. RSS feeds match the setting with `?hide_repeating_images=1` when it is enabled."
      },
      {
        kind: "Added",
        title: "Profile favicons",
        body: "On a blog's pages, the browser tab now shows that blog's profile picture instead of the app icon, so profiles are easy to tell apart in open tabs."
      },
      {
        kind: "Added",
        title: "Collapsed multi-media posts",
        body: "Feed cards with more than two images or media now show the first two and a Show more button, with Show less to collapse them again. The highlighted post on a post detail page still shows all of its media immediately."
      },
      {
        kind: "Added",
        title: "Landing page AI spend tally",
        body: "The landing page now shows the total OpenCode spend for this repository, the number of sessions, and the share of sessions by model."
      },
      {
        kind: "Added",
        title: "Expandable blog descriptions",
        body: "Long profile descriptions are now truncated to a tweet-length preview. A Show more button reveals the full text, Show less collapses it again, line breaks are preserved, and links are clickable."
      },
      {
        kind: "Added",
        title: "Landing page contact",
        body: "The landing page now invites the BDSMLR team to reach out on Discord if they want help improving the official site."
      },
      {
        kind: "Added",
        title: "Auto-loading pagination",
        body: "Every list with a Load more button now fetches the next page automatically when the button scrolls into view. This covers search results, For You, activity, follower feeds, comments, likes and reblogs, related posts, and blog search."
      },
      {
        kind: "Added",
        title: "Age confirmation on the landing page",
        body: "First-time visitors now see a full-page 18+ confirmation dialog. Confirming stores the answer in the browser, and the dialog only runs on the landing page."
      },
      {
        kind: "Added",
        title: "Feature flags for legacy features",
        body: "Compose, drafts, account changes, blog customization, and legacy queue/asks/submissions/settings links are now disabled by default until their BDSMLR backend behavior is verified. Each one has a `VITE_FEATURE_*` flag that stays disabled until its backend behavior is verified."
      },
      {
        kind: "Added",
        title: "Account, blog customization, and drafts",
        body: "The settings page can now change your email, password, and blog name. A new customization page edits blog title, description, theme, fonts, colors, avatar, header images, display options, and interests. A new drafts page lists saved drafts with Publish, Publish to queue, and Delete actions."
      },
      {
        kind: "Added",
        title: "Activity badge",
        body: "The Activity item in the profile menu now shows a count when new activity appears on your active blog since you last opened its activity feed."
      },
      {
        kind: "Added",
        title: "Archive, related tags, settings, and blocked blogs",
        body: "Profiles now have an Archive tab with month and post-type filters, plus a Related tags row based on tag affinity. The new `/settings` page shows account and blog shortcuts, and `/blocked` lists blocked blogs with an Unblock button."
      },
      {
        kind: "Added",
        title: "Discord community",
        body: "The landing page and the profile menu now link to the official Discord invite, opening in a new tab."
      },
      {
        kind: "Added",
        title: "Compose posts",
        body: "The new `/compose` page can publish text, quote, link, chat, image, video, and audio posts to the active blog. Text, image, and video posts also support queue and draft modes. Queue management, drafts, asks, and settings remain linked to BDSMLR for now."
      },
      {
        kind: "Added",
        title: "Landing page",
        body: "The root URL now opens a public landing page with a feature overview, share-preview examples, and a login button. The following feed moved to `/home`, and login remains at `/login`."
      },
      {
        kind: "Added",
        title: "Social previews",
        body: "Links to the site, profiles, and posts now include Open Graph and Twitter preview data for Discord and other social apps. The home page uses a branded preview image, profiles show the blog avatar and description, and posts show the first image from the post."
      },
      {
        kind: "Added",
        title: "About page",
        body: "A new `/about` page explains in plain language why the app needs a backend, what it does with your login and cookies, and what it does not store or control."
      },
      {
        kind: "Added",
        title: "Approximate tag count warning",
        body: "When a profile tag search finishes and returns fewer posts than the tag's Top tags count, the page now explains that BDSMLR's tag counts are approximate and can be stale or broader than the blog search. Top tag counts also have a tooltip with the same clarification."
      },
      {
        kind: "Added",
        title: "Messaging upgrades",
        body: "Messages can now include images, and the conversation header has Block/Unblock, Archive, and Clear actions. New messages show recipient suggestions as you type. Unread conversations add a count badge to the profile menu and the header."
      },
      {
        kind: "Added",
        title: "For You and recommendations",
        body: "The new `/for-you` feed shows recommended posts and a row of recommended blogs. It is available from the profile menu."
      },
      {
        kind: "Added",
        title: "Related posts",
        body: "Post detail pages now include a \"More like this\" section with pagination."
      },
      {
        kind: "Added",
        title: "Engagement lists",
        body: "Post pages show \"Liked by\" and \"Reblogged by\" buttons that open paginated lists of the blogs behind those counts."
      },
      {
        kind: "Added",
        title: "Search and tag pages",
        body: "The new `/search` page can search posts or blogs. Tags on post detail pages now open dedicated tag pages with their own post feed."
      },
      {
        kind: "Added",
        title: "Activity and follower feeds",
        body: "Profiles now have Activity and Followers' feed tabs. Activity can be filtered to Posts, Reblogs, Likes, or Comments, and `/activity` opens your own activity."
      },
      {
        kind: "Added",
        title: "Blog social actions",
        body: "Profiles now have Follow and Following buttons, plus tabs for Followers and Other blogs owned by the same user. The blog action menu can start a message, block or unblock the blog, and report it. Follow counts and the following cache update immediately."
      },
      {
        kind: "Added",
        title: "Post controls",
        body: "Post detail pages can report a post or delete one you own. Reblogs now open a composer where you can add a note and tags, or queue the reblog instead of publishing it immediately."
      },
      {
        kind: "Added",
        title: "Active blog switching",
        body: "If your account owns more than one blog, the profile menu now lets you choose the active blog. Likes, reblogs, comments, follows, blocks, reports, liked posts, and the home feed all use that blog."
      },
      {
        kind: "Added",
        title: "Messages",
        body: "A new `/messages` page brings your BDSMLR inbox into the app. Browse and search conversations, read threads, see which messages you sent, and send replies from the conversation view. The **New message** button starts a conversation with any blog by name. Signing in now also starts the BDSMLR web session that messaging needs, and the Messages link is in your profile menu."
      },
      {
        kind: "Added",
        title: "Comments",
        body: "Every post now has a comments view: click the comment count on a feed card to open it in a dialog, or scroll to the comments section on the post detail page. Comments show the author, time, and body, can be paginated, and signed-in users can post a new comment without leaving the page."
      },
      {
        kind: "Added",
        title: "Likes and reblogs",
        body: "Posts on every feed and on post detail pages now have working Like and Reblog buttons. Click the heart to like or unlike a post, and click the reblog icon to reblog it to your primary blog. Buttons highlight when you have already liked or reblogged a post, and the counts update without reloading the page."
      },
      {
        kind: "Added",
        title: "Search queries and pages live in the URL",
        body: "Searching on the home feed or a profile puts the query in the address bar (`?tag_name=…`), and the page number plus the search's session token are added as you load more (`&page=3&session=…`). Bookmark or share a search to reopen it later: opening the URL jumps straight back to that page with a single request. Changing the query or sort starts over from the first page, and you can still step back and forward through your past searches with the browser buttons."
      },
      {
        kind: "Added",
        title: "RSS feeds advertise their next page",
        body: "Feed readers that support pagination can now fetch older posts by following the `<atom:link rel=\"next\">` link in each feed page. The link only appears when more posts exist, and it keeps any `v2_session` or `include_reblogs` options from the original feed URL."
      },
      {
        kind: "Added",
        title: "Generic post links redirect to the author's page",
        body: "Opening a shared link to `/post/<id>` now jumps straight to the author's profile at `/blog/post/<id>` when the blog still exists, so you immediately see their profile header and Feed/Following tabs. The post card animates smoothly into place on the new page instead of reloading, and posts you've already opened load instantly. If the blog has been deleted, the post stays fully readable with the \"Blog gone\" notice rather than redirecting."
      },
      {
        kind: "Added",
        title: "Grid view for post lists",
        body: "Every feed (home, profiles, liked posts) now has a view toggle on the far right of the search bar. Click it to switch between a list and a grid layout: the grid packs posts into responsive columns with images up top and text clamped short. Your choice is remembered across visits."
      },
      {
        kind: "Added",
        title: "Deleted blogs on permalink pages",
        body: "When you open a post whose blog has been deleted, the page now shows a \"Blog gone\" notice and a chip next to the post type. The author's name and avatar are no longer clickable, but the post itself stays fully readable."
      },
      {
        kind: "Added",
        title: "Infinite scroll on all feeds",
        body: "Feeds now automatically load the next page as you scroll toward the bottom. The **Load more** button still appears at the end as a fallback, so you can manually trigger another load if the auto-load fails or the API incorrectly reports there are no more posts."
      },
      {
        kind: "Added",
        title: "Smarter API response caching",
        body: "Stable lookups like `resolve-identifier`, `get-blog`, `get-post-detail`, and `list-blog-top-tags` are now fetched as `GET` requests, so the browser caches them locally per its `Cache-Control` max-age (up to a day for identifier lookups, 30 minutes for blog metadata and top tags, 60 seconds for post details). Previously these were `POST` requests, which browsers never cache, forcing a slow round-trip to the backend on every navigation. `list-blog-activity` responses are explicitly `no-store` since they change constantly, and auth and signed-URL requests are never cached."
      },
      {
        kind: "Added",
        title: "Following graph cached in localStorage",
        body: "When you log in, all blog IDs you follow are fetched (all pages) and cached locally. The home feed now uses this cache instead of re-fetching the graph, and the cache refreshes when you visit your own following page."
      },
      {
        kind: "Added",
        title: "Permalink pages show the author's profile header",
        body: "The Permalink button now opens posts at `/blog/post/<id>` instead of `/post/<id>`. This new page renders the same post detail as before but also loads the author's profile header (avatar, title, description, and Feed/Following links) above it."
      },
      {
        kind: "Added",
        title: "Hide reblogs toggle on profile",
        body: "A gear icon next to the search bar now opens a settings dropdown with a \"Hide reblogs\" checkbox. When checked, only original posts from the creator are shown; reblogged content is hidden."
      },
      {
        kind: "Added",
        title: "Windows desktop app",
        body: "A single-executable Windows app is now available. Run `BetterBDSMLR.exe` and it lives in the system tray. Right-click the tray icon to open the app in your browser or quit. No extra installation required."
      },
      {
        kind: "Added",
        title: "HTTP request logging",
        body: "Server logs now show every incoming HTTP request (`--> GET /path`) and its response (`<-- GET /path 200 12ms`), making it easier to observe server activity and diagnose issues."
      },
      {
        kind: "Added",
        title: "Search posts by tag now sends `post_types` and `variants`",
        body: "The tag search API request now includes the `post_types` array (defaulting to all post types) and a `variants` field, aligning with the API spec and improving result accuracy."
      },
      {
        kind: "Improved",
        title: "Mobile navigation and search",
        body: "On phones the top bar now shows only the brand and your avatar. Home, Post, Discord, and the other top-bar links moved into the avatar menu, and a signed-out visitor gets a compact \"Menu\" button in the same spot. The search bar now wraps to its own row with a full-width search field, so the sort, search, help, and view controls fit on narrow screens instead of overflowing. Post card headers also wrap instead of pushing the timestamp off screen."
      },
      {
        kind: "Improved",
        title: "Posting tools are on by default",
        body: "Compose, drafts, queue, and post editing no longer need feature flags."
      },
      {
        kind: "Improved",
        title: "Every post type supports drafts and queue",
        body: "Quote, link, chat, and audio posts can now be saved as drafts or added to the queue, matching text, image, and video posts."
      },
      {
        kind: "Improved",
        title: "Expanded, privacy-conscious usage analytics",
        body: "The app now records coarse, anonymous events such as likes, reblogs, searches, comments, sign-ins, follows, and feed view changes, so the next round of work can follow how people actually use the app. Events never include post content, comments, messages, search text, tag names, blog names, emails, or passwords. Do Not Track is honored."
      },
      {
        kind: "Improved",
        title: "Landing page tone",
        body: "Removed comparisons that criticized the official BDSMLR frontend. The page now presents the app as a community effort and keeps the offer to work with the BDSMLR team in a professional capacity."
      },
      {
        kind: "Improved",
        title: "Landing AI spend section simplified",
        body: "The per-model breakdown is gone. The section now says that most work uses DeepSeek V4.1 Flash, above the total spend and session count."
      },
      {
        kind: "Improved",
        title: "Simpler About page",
        body: "The backend explanation is now a few short conversational paragraphs instead of two long lists."
      },
      {
        kind: "Improved",
        title: "Discord in the top bar",
        body: "Signed-in visitors now see a Discord link where the About link used to be. The About link still appears when signed out."
      },
      {
        kind: "Improved",
        title: "Profile tag links open in new tabs",
        body: "Top tags, the all-tags modal, and post tags on profile pages now use real links. Ctrl-clicking or middle-clicking opens the same tag filter in a new tab."
      },
      {
        kind: "Improved",
        title: "Softer landing page comparison",
        body: "The official frontend comparison now focuses on clutter and polish instead of calling it AI slop."
      },
      {
        kind: "Improved",
        title: "Post page cleanup",
        body: "Removed the duplicate \"Liked by\" and \"Reblogged by\" line. A chart icon now opens one combined likes-and-reblogs list. The post report button and the separator lines around the action row are gone. The \"More like this\" feed now sits outside the post card and keeps loading automatically."
      },
      {
        kind: "Improved",
        title: "Related tags removed, tag affinity added to search",
        body: "Profiles no longer show the Related tags row. Blog search now shows Tag affinity, based on the tags of posts you liked, with links that run the same tag search from the home feed."
      },
      {
        kind: "Improved",
        title: "For You is disabled by default",
        body: "The For You feed is behind a feature flag for now because it loads slowly and lacks pagination. The Following feed at `/home` remains the default way to browse."
      },
      {
        kind: "Improved",
        title: "Documentation cleanup",
        body: "Removed obsolete setup instructions from the README and simplified the disabled-feature messages."
      },
      {
        kind: "Improved",
        title: "Tag links and search pages",
        body: "Tag pills now run their search on the home feed instead of opening a separate tag page. The standalone `/search` page has been removed. Blog search is now `/blog-search` and lives in the avatar menu. Old `/search` URLs redirect to the new destinations."
      },
      {
        kind: "Improved",
        title: "Landing copy",
        body: "The hero now highlights the human-built, intuitive UI and contrasts it with the official frontend."
      },
      {
        kind: "Improved",
        title: "Logged-in visitors skip the landing page",
        body: "Opening `/` while signed in now renders the feed immediately and updates the URL to `/home`, so the landing page no longer flashes first. Search and pagination stay on `/home`."
      },
      {
        kind: "Improved",
        title: "Landing hero",
        body: "The hero now shows a real screenshot of the signed-in Following feed instead of a link card preview."
      },
      {
        kind: "Improved",
        title: "Profile search now matches the global search",
        body: "Searching on a profile runs the same tag search as the home feed, scoped to that blog with a `blog:<name>` prefix, instead of a separate filtered activity query. Results use the same sort options and session pagination, so paging through a profile search no longer risks duplicates or skipped pages. You can still clear the search to return to the blog's normal feed."
      },
      {
        kind: "Improved",
        title: "Profile navigation",
        body: "The Feed and Following links on profile pages are now tabs below the profile header, styled like Twitter/Bluesky, with the active tab highlighted by an underline. The BDSMLR and RSS icons are grouped together and right-aligned in the top-right corner of the profile header."
      },
      {
        kind: "Fixed",
        title: "Reblogged posts appear on your profile right away",
        body: "The app now checks BDSMLR's latest posts after a reblog to confirm it was actually created, then shows the reblog at the top of your profile while BDSMLR's activity feed catches up. A reblog no longer marks itself as done if BDSMLR silently fails to create it."
      },
      {
        kind: "Fixed",
        title: "Photo posts upload and publish again",
        body: "Photo uploads and the photo post call were starting a separate composer and sending the wrong token. They now share the same composer token, so images upload and appear in the post."
      },
      {
        kind: "Fixed",
        title: "Draft actions show server errors clearly",
        body: "When BDSMLR returns a server error for a draft action, the page now says so instead of showing a generic failure."
      },
      {
        kind: "Fixed",
        title: "Profiles load again and errors stay contained",
        body: "Profile pages now load the blog description instead of crashing with a fullscreen \"BlogDescription is not defined\" error. If a page or the profile header fails unexpectedly, the app shows a friendly retry panel and keeps the rest of the profile available, and navigating elsewhere clears the error."
      },
      {
        kind: "Fixed",
        title: "Pagination stops when BDSMLR repeats a page",
        body: "With \"Most popular\" sorting, the API can return the same page again when you load more. The app now notices that a page has no new posts, stops paginating, and never appends duplicate cards."
      },
      {
        kind: "Fixed",
        title: "Reblog works again",
        body: "BDSMLR now rejects the API reblog endpoint for signed-in browser sessions with a \"session required\" error, so the button did nothing. Reblogs now go through the same web-session reblog flow as the official site, including notes, tags, and queued reblogs, and the post appears on your blog again."
      },
      {
        kind: "Fixed",
        title: "GIF posts with dead video alternates now display",
        body: "Some GIF posts expose a `video/mp4` alternate that 404s even though the original GIF is valid. Post cards and detail pages now try the next media candidate when a video or image fails, so these posts fall back to the GIF. Social previews also choose the first working image candidate."
      },
      {
        kind: "Fixed",
        title: "RSS feeds skip dead video alternates",
        body: "Blog RSS feeds now use the image fallback for GIF posts instead of a dead `video/mp4` enclosure, so feed readers receive media that actually loads."
      },
      {
        kind: "Fixed",
        title: "Sort dropdown matches what it shows",
        body: "Choosing \"Most popular\", \"Least popular\", or a \"Most liked/commented/reblogged\" option now highlights that same option and loads posts in the expected order. Previously the labels and the actual sort were reversed, so picking \"Most popular\" could display \"Least popular\" and return the wrong posts."
      },
      {
        kind: "Fixed",
        title: "Conversations open on the newest message",
        body: "Opening a conversation now scrolls to the bottom so you see the most recent messages first, instead of starting at the top of the thread. Sending a reply keeps you at the bottom, while loading older messages keeps your place."
      },
      {
        kind: "Fixed",
        title: "Profile pictures and blog covers display again",
        body: "BDSMLR's blog lookup started returning avatar and cover URLs with a broken media proxy prefix, so every profile picture fell back to a letter placeholder. The app now uses the working signed CDN URL from those responses."
      },
      {
        kind: "Fixed",
        title: "Tag searches keep loading past the first page",
        body: "BDSMLR changed its search response to group repeated reblogs into a single \"result unit\" and to report a `hasMore` flag, leaving `null` gaps in the older `posts` list. The home feed now reads the grouped results, skips empty slots, and uses `hasMore` to know when to stop, so searches no longer stall after the first page or show blank cards. A freshly started search that is still \"warming up\" is retried briefly instead of being treated as having no results."
      },
      {
        kind: "Fixed",
        title: "Profile and RSS feeds no longer get stuck repeating the same posts",
        body: "BDSMLR's `list-blog-activity` endpoint loops forever (returns the same page and token) when a request includes reblogs but not likes/comments. The app now requests the full activity set and filters out like/comment events internally, so feeds advance correctly and reblogs still show up. \"Hide reblogs\" continues to work."
      },
      {
        kind: "Fixed",
        title: "Search pagination uses sessions",
        body: "BDSMLR replaced page tokens for tag searches with an opaque session ID, so the home-feed search now sends an incrementing page number and re-sends the session returned by the previous page. Search now keeps loading subsequent pages correctly instead of stalling after the first page."
      },
      {
        kind: "Fixed",
        title: "Videos no longer open in the lightbox",
        body: "Clicking a video on the home feed, liked page, profiles, or post detail used to launch the full-screen lightbox, which just showed a small muted player. Videos now ignore those clicks and keep their native fullscreen button and controls instead; only images open the lightbox."
      },
      {
        kind: "Fixed",
        title: "Home feed infinite scroll now works by default",
        body: "The home page's auto-load was set up before the auth-gated feed rendered, so scrolling never triggered the next page and you had to click **Load more** manually. The scroll watcher now attaches once you're signed in, so the feed loads pages automatically as you scroll toward the bottom."
      },
      {
        kind: "Fixed",
        title: "GIFs with no original mime type now render",
        body: "When a post's `mediaRepresentation` item has an `original` URL whose `mimeType` is missing (common for older GIFs served as `video/mp4`), the app now falls back to the item's `alternates` and renders the first one that declares a mime type. If there are no usable alternates, it still renders the `original` URL, guessing the type from the file extension."
      },
      {
        kind: "Fixed",
        title: "Static-image posts with dead video alternates now display",
        body: "When an `original` has no mime type but a static-image extension (e.g. `webp`), the original is now preferred over `video/mp4` alternates, which are sometimes dead links. GIF originals still defer to a mime-typed alternate, since they may be served as `video/mp4`."
      },
      {
        kind: "Fixed",
        title: "Unit tests for media handling",
        body: "`pnpm test` runs Vitest coverage over the media URL selection logic (`getMediaType`, `getPostMediaUrls`, proxy rewriting) using real posts as fixtures. `docs/media-cases.md` lists the known weird `mediaRepresentation` shapes for manual spot-checks."
      },
      {
        kind: "Fixed",
        title: "Vercel deployments now serve the app",
        body: "The build now emits a Vercel-compatible serverless output when built on Vercel (`VERCEL=1`), so deployments respond with the app instead of a `404 NOT_FOUND`. Local builds are unchanged."
      },
      {
        kind: "Fixed",
        title: "Lightbox close button now always visible",
        body: "The close button uses `position: fixed` instead of `position: absolute` so it stays pinned to the viewport's top-right corner, even when the image is taller than the screen."
      },
      {
        kind: "Fixed",
        title: "Login session cookies now persist correctly",
        body: "The API proxy now strips the `Domain` attribute from `Set-Cookie` headers returned by BDSMLR's login endpoint. Previously, the cookie was rejected by the browser because its domain (`bdsmlr.com`) didn't match the app domain. You can now sign in and access protected blogs that require authentication."
      },
      {
        kind: "Fixed",
        title: "Images and videos display again after API format change",
        body: "BDSMLR moved media URLs from `content.files` into a new `mediaRepresentation` field. Posts now read images and videos from the new structure, using the signed `original.url` directly instead of rewriting through a proxy that broke the signatures."
      },
      {
        kind: "Fixed",
        title: "Cursor-based pagination on home feed",
        body: "The home page now uses page tokens (`nextPageToken`) for both tag search and following feed, matching the liked page behavior. Load more is no longer limited to the initial search page; the following feed also supports incremental loading."
      },
      {
        kind: "Fixed",
        title: "Cursor-based pagination on profile pages",
        body: "Profile feeds now use page tokens for pagination like the home and liked pages, instead of numeric page offsets. Scrolling past the first page resumes exactly where the API left off, so no posts are skipped or duplicated when new content is posted while you browse."
      },
      {
        kind: "Fixed",
        title: "Page token persisted in URL",
        body: "After loading a subsequent page, the next page token is stored as a `?page_token=` query parameter on the home feed and liked posts pages. Reloading or bookmarking resumes from that page. The first page leaves the URL clean."
      },
      {
        kind: "Fixed",
        title: "Media URL routing",
        body: "Image and video URLs now route through the `media.bdsmlr.com` proxy instead of directly hitting CDN hosts. Feed pages use `/feed/` size, post detail and LightBox use `/lightbox/` for highest resolution, and GIFs/videos use `/raw/`."
      },
      {
        kind: "Removed",
        title: "Download buttons removed",
        body: "The download-image button, its download modal, and the associated backend ZIP/download endpoint have been removed from all posts across the app."
      },
      {
        kind: "Removed",
        title: "Short videos loop automatically",
        body: "Videos shorter than 20 seconds now replay on a loop, so clips feel like GIFs. Longer videos still play once with normal controls."
      },
      {
        kind: "Removed",
        title: "Search history dropdown",
        body: "The home feed and every profile page now remember the searches you've run. Click the arrow on the right side of the search box to open a floating list of past queries; clicking an entry re-runs that search instantly. Each entry has an × to remove it — clicking the × once turns the row red as a delete confirmation, and clicking again deletes it. Home-feed searches and each profile's searches are kept separate."
      },
      {
        kind: "Removed",
        title: "Author avatars in feed cards",
        body: "Every post on the home feed, liked page, profile feeds, and post detail pages now shows the author's profile picture next to their name. Clicking the avatar jumps to that blog. Avatars without a profile picture fall back to a letter placeholder, and lookups are cached for the session so feeds scroll without repeated requests."
      },
      {
        kind: "Removed",
        title: "RSS feeds for every profile",
        body: "Every profile page now has an RSS icon next to the BDSMLR/Feed/Following links. Clicking it opens `/<user>/rss` in a new tab: an XML feed of the blog's recent posts (with media enclosures) that you can paste straight into any RSS reader, such as imaglr."
      },
      {
        kind: "Removed",
        title: "RSS feeds for private blogs",
        body: "If a profile is private and you're signed in, the RSS icon automatically embeds your session token in the feed URL so the feed can pull protected content. A warning triangle next to the icon explains that the feed URL contains your session token and should not be shared, since it could let someone else take over your account. Saving the feed in an RSS reader you trust or using it with the imaglr importer is fine."
      },
      {
        kind: "Removed",
        title: "\"Hide reblogs\" reflected in RSS",
        body: "The RSS feed URL honors the profile's \"Hide reblogs\" setting: it sends `include_reblogs=1` when reblogs are shown and `include_reblogs=0` when they're hidden, so the feed matches what you see on the profile."
      }
    ]
  },
  {
    date: "2026-06-15",
    changes: [
      {
        kind: "Added",
        title: "SQLite database infrastructure",
        body: "Added a SQLite database layer with Drizzle ORM, laying the groundwork for persisting server-side state such as download jobs."
      },
      {
        kind: "Added",
        title: "Header view transition",
        body: "The header now animates smoothly during page navigations using the View Transitions API."
      },
      {
        kind: "Added",
        title: "User dropdown in navbar",
        body: "The navbar now shows your avatar and username instead of a plain \"Sign out\" button. Clicking it opens a dropdown with a \"Following\" shortcut and a \"Sign out\" button. The dropdown closes on outside click or Escape."
      },
      {
        kind: "Added",
        title: "Following page",
        body: "Visit `/:username/following` to see every blog a user follows, with each blog's avatar, title, description, creation date, and following count. The navbar has a `Following` shortcut for the current user."
      },
      {
        kind: "Added",
        title: "Profile Following button",
        body: "Every user profile page now has a \"Following\" button next to the BDSMLR icon that links to the user's following list."
      },
      {
        kind: "Added",
        title: "Following and Feed button bolding",
        body: "Active Feed/Following buttons are now bold on profile and following pages for clearer navigation state."
      },
      {
        kind: "Added",
        title: "Shared layout for user routes",
        body: "User routes now share a persistent layout with a sticky blog-header, improving navigation consistency."
      },
      {
        kind: "Improved",
        title: "Cache-control for API proxy",
        body: "Proxied API responses now include a 60-second `Cache-Control` header to reduce redundant requests."
      },
      {
        kind: "Fixed",
        title: "Avatar refetch on navigation",
        body: "The header no longer re-fetches the current user's avatar on every page navigation; the result is cached for the session."
      },
      {
        kind: "Fixed",
        title: "Null-safe avatar",
        body: "Fixed a guard against null `title` and `blogName` in the avatar placeholder. Blogs without avatars now correctly show a letter placeholder."
      },
      {
        kind: "Fixed",
        title: "Pagination in blog-follow-graph",
        body: "The blog-follow-graph request now fetches all pages instead of stopping after the first page."
      },
      {
        kind: "Added",
        title: "Show all tags",
        body: "A \"Show all (N)\" button appears after the top 5 tags on user profiles. Clicking it opens a modal with every remaining tag. The modal closes when you click outside, click the X, or click a tag (which also adds it to the current filter)."
      },
      {
        kind: "Added",
        title: "Bulk downloads",
        body: "You can now download every post from a blog or all of your liked posts as a single ZIP archive. A progress panel in the header tracks each job and lets you download the ZIP once it is ready."
      },
      {
        kind: "Added",
        title: "Resumable downloads",
        body: "Bulk downloads are persisted on the server using SQLite. If you navigate away or close the tab, the job continues in the background and you can resume it when you return."
      },
      {
        kind: "Added",
        title: "Login disclaimer",
        body: "The login page now shows a legal disclaimer explaining that this is an alternative front-end to BDSMLR, that all content is user-provided and hosted by BDSMLR, and that you must be of legal age to view adult content. You must check an acknowledgement box before signing in, confirming that the developers own no displayed content and that you comply with BDSMLR's Terms of Service."
      },
      {
        kind: "Added",
        title: "Profile search fix",
        body: "Searching on user profiles now uses the blog-specific search API again instead of the global tag search."
      },
      {
        kind: "Added",
        title: "Sort readability",
        body: "Sort field and order values are now expressed as human-readable named constants (`SortField.Date`, `SortOrder.Descending`, etc.) throughout the codebase."
      },
      {
        kind: "Added",
        title: "Sort label fix",
        body: "Sort dropdowns now correctly label `Date + Descending` as \"Newest\" and `Date + Ascending` as \"Oldest\", matching the actual API semantics."
      },
      {
        kind: "Added",
        title: "Custom sort dropdown",
        body: "The sort selector is now a custom dropdown instead of a native browser `<select>`. It stays open when you click elsewhere on the page, and its selection persists when you submit a search or press Enter. Each page can configure which sort options are available."
      },
      {
        kind: "Added",
        title: "Open on BDSMLR",
        body: "Every post card and profile page now has a button that opens the original post or blog on BDSMLR in a new tab."
      },
      {
        kind: "Fixed",
        title: "Auth reactivity",
        body: "Extracted auth state into a shared `useAuth` hook with a context provider so the nav bar and every page reactively reflect the login state instead of each one duplicating `localStorage` reads and module-level variable checks. Login redirects and sign-out now work consistently across all routes."
      },
      {
        kind: "Fixed",
        title: "Tags with spaces",
        body: "Tags containing spaces are now wrapped in quotes when added to the search filter (e.g. `tag:\"hello world\"` instead of `tag:hello world`), so the API correctly matches the full tag."
      },
      {
        kind: "Fixed",
        title: "Liked posts bulk download authentication",
        body: "The liked-posts page and download-jobs panel now read the user from `localStorage` reactively instead of capturing it at module load time, so the bulk download button works reliably on direct page refreshes."
      },
      {
        kind: "Fixed",
        title: "Cookie forwarding for download jobs",
        body: "All download-job API calls now explicitly send `credentials: 'include'`, ensuring the server can forward the authentication cookie to the BDSMLR API when discovering and downloading liked posts."
      },
      {
        kind: "Fixed",
        title: "Two-phase bulk downloads",
        body: "Clicking \"Download all\" now starts a discovery phase that finds all posts without downloading anything. Once discovery is complete, the download panel shows a confirmation prompt: \"You're about to download X images from Y posts.\" You must click \"Start download\" before any actual downloading begins. This makes large bulk downloads more predictable and easier to debug."
      },
      {
        kind: "Added",
        title: "Login",
        body: "Log in with your email/username and password. Your session stays active across browser tabs."
      },
      {
        kind: "Added",
        title: "Read-only",
        body: "Browse and view content. Posting/liking/following new posts/users unsupported."
      },
      {
        kind: "Added",
        title: "Compliant",
        body: "Complies with bdsmlr's openapi spec and does not use `internal-write` endpoints."
      },
      {
        kind: "Added",
        title: "Home feed",
        body: "See posts from the people you follow right on the home page."
      },
      {
        kind: "Added",
        title: "User profiles",
        body: "Visit any blog by name to see their posts, profile picture, description, and popular tags."
      },
      {
        kind: "Added",
        title: "Search",
        body: "Find posts with powerful filters: by tag, blog name, post type, media type, or date. Includes search tips, and every tag is clickable to find more like it. Search from the beginning of the app's history."
      },
      {
        kind: "Added",
        title: "Tag search",
        body: "Click any tag or search for one to discover all posts with that tag, with sorting options."
      },
      {
        kind: "Added",
        title: "Post pages",
        body: "Click any post to see it in full detail with all media, tags, and engagement counts. Permalinks to share or revisit posts."
      },
      {
        kind: "Added",
        title: "Liked posts",
        body: "Browse everything you've liked, with sorting options."
      },
      {
        kind: "Added",
        title: "Download posts",
        body: "Each post has a download button that supports both single and multiple images, with the option to preserve order, as well as videos."
      },
      {
        kind: "Added",
        title: "Full-screen media",
        body: "Tap any image or video to view it full-screen without losing quality."
      },
      {
        kind: "Added",
        title: "Reblog tracking",
        body: "See who originally posted content and jump straight to the original post."
      },
      {
        kind: "Added",
        title: "Fixed Media",
        body: "Using old source urls to allow images/gifs/videos to play like they once did."
      },
      {
        kind: "Added",
        title: "Smooth media",
        body: "Images, GIFs, and videos display smoothly in your feed. Animated GIFs play automatically."
      },
      {
        kind: "Added",
        title: "Deleted posts",
        body: "Posts from deleted authors now show a \"DELETED\" flair so you know why they can't be opened, and their permalinks are hidden."
      }
    ]
  }
];

/** Lowercase, punctuation-free form of a title, used to build an entry id. */
export function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[`*_~"'’,.:;!?()[\]]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Stable identity for one entry, as used for the visitor's read state. */
export function entryId(date: string, entry: ChangelogEntry): string {
  return entry.id ?? `${date}:${slugifyTitle(entry.title)}`;
}

/** Every entry id currently in the changelog, newest first. */
export function changelogIds(): string[] {
  return changelog.flatMap((day) =>
    day.changes.map((change) => entryId(day.date, change)),
  );
}

/** FNV-1a over the entry ids, as a short base36 string. */
function hashIds(ids: string[]): string {
  let hash = 0x811c9dc5;
  for (const char of ids.join("|")) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

/**
 * Short identifier for the changelog as a whole. Stored next to a visitor's
 * read state so that a changed changelog is easy to recognise.
 */
export function changelogFingerprint(): string {
  return hashIds(changelogIds());
}
