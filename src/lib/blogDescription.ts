export interface DescriptionToken {
  type: "text" | "link"
  value: string
  href?: string
}

const URL_RE = /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+)/gi

function trimTrailingPunctuation(raw: string): { url: string; suffix: string } {
  let url = raw
  let suffix = ""
  const match = url.match(/[.,;:!?]+$/)
  if (match) {
    suffix = match[0]
    url = url.slice(0, -suffix.length)
  }
  while (url.endsWith(")")) {
    const opens = url.match(/\(/g)?.length ?? 0
    const closes = url.match(/\)/g)?.length ?? 0
    if (closes <= opens) break
    url = url.slice(0, -1)
    suffix = ")" + suffix
  }
  return { url, suffix }
}

export function linkifyDescription(text: string): DescriptionToken[] {
  const tokens: DescriptionToken[] = []
  let last = 0
  for (const match of text.matchAll(URL_RE)) {
    const index = match.index ?? 0
    if (index > last) tokens.push({ type: "text", value: text.slice(last, index) })
    const { url, suffix } = trimTrailingPunctuation(match[0])
    tokens.push({
      type: "link",
      value: url,
      href: url.toLowerCase().startsWith("www.") ? `https://${url}` : url,
    })
    if (suffix) tokens.push({ type: "text", value: suffix })
    last = index + match[0].length
  }
  if (last < text.length) tokens.push({ type: "text", value: text.slice(last) })
  return tokens
}

export function truncateDescription(
  tokens: DescriptionToken[],
  limit: number,
): { tokens: DescriptionToken[]; truncated: boolean } {
  const visible: DescriptionToken[] = []
  let remaining = limit
  let truncated = false

  for (const token of tokens) {
    if (remaining <= 0) {
      truncated = true
      break
    }
    if (token.value.length <= remaining) {
      visible.push(token)
      remaining -= token.value.length
      continue
    }
    if (token.type === "link") {
      truncated = true
      break
    }
    visible.push({
      ...token,
      value: token.value.slice(0, remaining).replace(/\s+$/, ""),
    })
    truncated = true
    break
  }

  return { tokens: visible, truncated }
}
