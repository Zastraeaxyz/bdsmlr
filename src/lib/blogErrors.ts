/**
 * BDSMLR hides private blogs by answering their activity endpoint with a
 * routing 404 instead of a real permission error. The message includes the
 * app host because the proxy forwards the original `Host` header, for example:
 *
 *   Cannot find any route matching [POST] https://bdsmlr.zastraea.xyz/v2/api/list-blog-activity
 *
 * Treat that specific message as "private blog" so the UI can ask the reader to
 * sign in instead of showing the raw routing error.
 */
export function isPrivateBlogError(
  message: string | null | undefined,
): boolean {
  if (!message) return false;
  return (
    /cannot find any route matching/i.test(message) &&
    /list-blog-activity/i.test(message)
  );
}
