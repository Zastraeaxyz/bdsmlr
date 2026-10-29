export function decodeHtml(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code: string) => {
      const value = Number(code);
      return Number.isFinite(value) ? String.fromCodePoint(value) : "";
    });
}

export function stripHtml(html: string): string {
  return decodeHtml(
    html
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<\/(p|div|li|h[1-6])>/gi, " ")
      .replace(/<[^>]*>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

export function imageUrl(value?: string): string {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `https://bdsmlr.com${value.startsWith("/") ? "" : "/"}${value}`;
}

export function parseTagLinks(html: string): string[] {
  return [...html.matchAll(/<a\s+class=['"]tag['"][^>]*>#([^<]+)<\/a>/gi)].map(
    (match) => decodeHtml(match[1]).trim(),
  );
}

export function parseTagList(html: string): string[] {
  return [...html.matchAll(/<li[^>]*>([^<]+)<\/li>/gi)]
    .map((match) => decodeHtml(match[1]).trim())
    .filter(Boolean);
}

export function parseTextareaValue(html: string, id: string): string {
  const match = html.match(
    new RegExp(`<textarea[^>]*id=["']${id}["'][^>]*>([\\s\\S]*?)</textarea>`, "i"),
  );
  return decodeHtml(match?.[1] ?? "").trim();
}

export function htmlToText(html: string): string {
  return decodeHtml(
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
      .replace(/<[^>]*>/g, ""),
  )
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
