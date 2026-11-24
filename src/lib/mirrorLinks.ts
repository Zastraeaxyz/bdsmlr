import { tagSearchHref } from "~/lib/tagLinks"

/** Canonical address of this app's mirror. */
export const MIRROR_ORIGIN = "https://bdsmlr.zastraea.xyz"

export function mirrorBlogUrl(blogName: string): string {
  return `${MIRROR_ORIGIN}/${blogName}`
}

export function mirrorPostUrl(
  blogName: string | undefined,
  postId: string | number,
): string {
  return blogName
    ? `${MIRROR_ORIGIN}/${blogName}/post/${postId}`
    : `${MIRROR_ORIGIN}/post/${postId}`
}

export function mirrorTagUrl(tag: string): string {
  return `${MIRROR_ORIGIN}${tagSearchHref(tag)}`
}
