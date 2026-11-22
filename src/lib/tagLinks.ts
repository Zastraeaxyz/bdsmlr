function tagQuery(tag: string): string {
  return `tag:${tag.includes(" ") ? `"${tag}"` : tag}`
}

export function tagSearchHref(tag: string, blogName?: string): string {
  const suffix = `?tag_name=${encodeURIComponent(tagQuery(tag))}`
  return blogName ? `/${blogName}${suffix}` : `/home${suffix}`
}
