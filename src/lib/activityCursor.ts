/**
 * BDSMLR's feed pagination tokens are base64url-encoded JSON cursors. The API
 * has no "start before this post" parameter, but the cursor can be built for
 * any post, which lets a feed start at a specific point and page backwards.
 *
 * `list-blog-activity` sorts newest first by default. Its token keeps two
 * cursors: one for the activity timeline and one for the blog's own posts.
 * Setting `activity` to null and pointing `posts.search_after` at a post makes
 * the next page start strictly after that post in the current sort order.
 */
export function base64UrlEncode(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function base64UrlDecode(value: string): string {
  const padded =
    value.replace(/-/g, "+").replace(/_/g, "/") +
    "===".slice((value.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new TextDecoder().decode(bytes);
}

/**
 * Cursor for `/list-blog-activity` that starts with the posts immediately
 * older than `createdAtUnix` / `postId` (newest-first feeds).
 */
export function blogPostsBefore(
  createdAtUnix: number,
  postId: number,
): string {
  return base64UrlEncode(
    JSON.stringify({
      activity: null,
      posts: {
        search_after: [createdAtUnix * 1000, postId],
        sort_field: "created_at",
        order: "DESC",
      },
    }),
  );
}

/**
 * Cursor for `/list-blogs-recent-activity` that starts with the posts
 * immediately older than `createdAtUnix` / `postId` (newest-first feeds).
 */
export function recentActivityBefore(
  createdAtUnix: number,
  postId: number,
): string {
  return base64UrlEncode(
    JSON.stringify({
      sort: createdAtUnix * 1000,
      id: postId,
    }),
  );
}
