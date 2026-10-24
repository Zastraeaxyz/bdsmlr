export interface LegacyDraft {
  id: string;
  title: string;
  text: string;
  tags: string[];
  image?: string;
  kind: "text" | "image";
}

function decode(text: string): string {
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

function strip(html: string): string {
  return decode(
    html
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<\/(p|div|li|h[1-6])>/gi, " ")
      .replace(/<[^>]*>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

export function parseDrafts(html: string): LegacyDraft[] {
  const chunks = html.split('<div class="wrapqueuepost"').slice(1);
  const drafts: LegacyDraft[] = [];

  for (const chunk of chunks) {
    const id = chunk.slice(0, 120).match(/id="(\d+)"/)?.[1];
    if (!id) continue;

    const title = strip(
      chunk.match(/<div class="titletext">([\s\S]*?)<\/div>/)?.[1] ?? "",
    );
    const textContent = strip(
      chunk.match(/<div class="textcontent">([\s\S]*?)<\/div>/)?.[1] ?? "",
    );
    const comment = strip(
      chunk.match(/<div id="p\d+"[^>]*>([\s\S]*?)<\/div>/)?.[1] ?? "",
    );
    const image = chunk.match(
      /<div class="image_content">[\s\S]*?<img[^>]*src="([^"]+)"/,
    )?.[1];
    const tags = [
      ...chunk.matchAll(/<a class='tag'\s+href='\/search\/[^']*'>#([^<]+)<\/a>/gi),
    ].map((match) => match[1]);

    drafts.push({
      id,
      title,
      text: textContent || comment,
      tags,
      image,
      kind: image ? "image" : "text",
    });
  }

  return drafts;
}
