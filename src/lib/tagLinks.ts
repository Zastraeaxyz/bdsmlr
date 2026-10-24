export function tagSearchHref(tag: string): string {
  const query = `tag:${tag.includes(" ") ? `"${tag}"` : tag}`
  return `/home?tag_name=${encodeURIComponent(query)}`
}
