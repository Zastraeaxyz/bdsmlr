# Better BDSMLR

A browser client for [BDSMLR](https://bdsmlr.com/). Log in, follow your feed, search posts, browse blogs, like, reblog, or comment on posts, discover new blogs and posts, and send messages.

## Features

- **Landing page** — The public home page at `/` explains the app, lists its features, and shows the social preview cards. Signed-in visitors see the following feed there and the URL updates to `/home`. Login is at `/login`, and the following feed is also at `/home`.
- **Login** — Authenticate with email/username and password. Includes a legal disclaimer and acknowledgement checkbox.
- **Following feed** — See recent posts from blogs you follow, with sort and pagination
- **Blog pages** — View any blog's posts, header, avatar, description, top tags (expandable in a modal), and following count
- **Following page** — Visit `/:username/following` to browse every blog a user follows, with avatar, description, and creation date
- **Advanced Search** — Rich query syntax with operators, field filters (`tag:`, `blog:`, `post:`, `media:`, `when:`), and boolean logic
- **Liked posts** — Browse your liked posts with sorting
- **Post detail** — View full post content with media, tags, counts, and reblog attribution
- **Media lightbox** — Click images/videos for a full-screen overlay
- **Individual post downloads** — Download single or multiple images from a post, with ordering and video support
- **Bulk downloads** — Download every post from a blog or all your liked posts as a ZIP archive. Downloads resume if interrupted and persist across sessions via SQLite.
- **User dropdown** — The navbar shows your avatar and username with quick access to Following, Messages, the active blog switcher, and Sign out
- **Open on BDSMLR** — Every post and profile has a button to open the original on BDSMLR in a new tab
- **Reblog tracking** — See who originally posted content and jump to the original post
- **Deleted post flair** — Posts from deleted authors show a "DELETED" badge; permalinks are hidden
- **Like and reblog** — Like or unlike posts with one click and reblog them to your primary blog. Buttons reflect the current state and update the counts immediately.
- **Comments**: Read comments on any post, load older comments, and post your own from a feed card or the post detail page.
- **Account and blog settings**: When enabled by feature flag, `/settings` can change your email, password, and blog name. `/customize` edits blog title, description, theme, colors, images, display options, and interests. `/drafts` lists drafts and can publish, queue, or delete them.
- **Archive and top tags**: Profiles have an Archive tab with month and post-type filters, plus a Top tags row.
- **Unread activity badge**: The Activity menu item shows a count when new posts, reblogs, likes, or comments appear since you last opened your activity feed.
- **Settings and blocked blogs**: `/settings` shows account and blog shortcuts, and `/blocked` lists blocked blogs with an Unblock button.
- **Compose posts**: When enabled by feature flag, the `/compose` page publishes text, quote, link, chat, image, video, and audio posts. Text, image, and video posts can also be saved as drafts or added to the queue.
- **Social previews**: Links shared in Discord and other social apps show a branded site card, profile cards with the blog avatar and description, and post cards with the first image.
- **Discord community**: The landing page and avatar menu link to the official Discord invite.
- **About the backend**: `/about` explains in plain language why the app needs a server, what happens to your login and cookies, and what the server does not store.
- **Messages**: Open your BDSMLR inbox at `/messages` to read conversations, search threads, and send messages or images. Start a new conversation with recipient autocomplete, archive or clear conversations, block a sender, and see unread counts in the header.
- **For You and recommendations (disabled for now)**: A `/for-you` feed shows recommended posts, with a row of recommended blogs when available.
- **Related posts**: Post detail pages show a "More like this" feed below the post card, with automatic loading as you scroll.
- **Engagement list**: A chart icon on a post opens one combined list of likes and reblogs.
- **Search and tags**: The home page searches posts and tags, and tag pills run the same search there. Blog search lives at `/blog-search` and is available from the avatar menu. Blog search also shows tag affinity from posts you liked.
- **Activity feed**: Every profile has an Activity tab with Posts, Reblogs, Likes, and Comments filters. `/activity` opens your own activity.
- **Followers' feed**: A profile tab shows recent posts from blogs that follow that blog.
- **Blog social actions**: Follow and unfollow blogs, see followers and other blogs owned by the same user, block or unblock a blog, report a blog, and start a message from a profile.
- **Post controls**: Report posts, delete posts from the active blog, and use the reblog composer to add a note, add tags, or send the reblog to your queue.
- **Multiple blogs**: Switch the active blog from the profile menu. Likes, reblogs, comments, follows, blocks, and reports use the active blog.
