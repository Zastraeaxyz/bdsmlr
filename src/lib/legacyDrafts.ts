import {
  parseTagLinks,
  parseTagList,
  parseTextareaValue,
  stripHtml,
} from "./legacyHtml";

export interface LegacyDraft {
  id: string;
  title: string;
  text: string;
  tags: string[];
  image?: string;
  kind: "text" | "image";
}

export interface LegacyEditablePost {
  id: string;
  postId: string;
  comment: string;
  blogId: string;
  blogName: string;
  type: string;
  title: string;
  body: string;
  tags: string[];
  earlier: string;
}

export function parseDrafts(html: string): LegacyDraft[] {
  const chunks = html.split('<div class="wrapqueuepost"').slice(1);
  const drafts: LegacyDraft[] = [];

  for (const chunk of chunks) {
    const id = chunk.slice(0, 120).match(/id="(\d+)"/)?.[1];
    if (!id) continue;

    const title = stripHtml(
      chunk.match(/<div class="titletext">([\s\S]*?)<\/div>/)?.[1] ?? "",
    );
    const textContent = stripHtml(
      chunk.match(/<div class="textcontent">([\s\S]*?)<\/div>/)?.[1] ?? "",
    );
    const comment = stripHtml(
      chunk.match(/<div id="p\d+"[^>]*>([\s\S]*?)<\/div>/)?.[1] ?? "",
    );
    const image = chunk.match(
      /<div class="image_content">[\s\S]*?<img[^>]*src="([^"]+)"/,
    )?.[1];
    const tags = parseTagLinks(chunk);

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

export function parseEditablePost(html: string): LegacyEditablePost | null {
  const postId =
    html.match(/class=["']thisedit["'][^>]*data-postid=["']([^"']*)["']/i)?.[1] ??
    html.match(/data-postid=["']([^"']*)["'][^>]*class=["']thisedit["']/i)?.[1] ??
    html.match(/class=["']reblogpost["'][^>]*id=["']([^"']*)["']/i)?.[1] ??
    "";
  if (!postId) return null;

  const tagsBlock =
    html.match(/<ul[^>]*id=["']Tags["'][^>]*>([\s\S]*?)<\/ul>/i)?.[1] ?? "";
  const blogMatch = html.match(
    /class=["']blogID["'][^>]*data-blog=["']([^"']*)["']/i,
  );
  const blogName =
    stripHtml(
      html.match(
        /<div[^>]*class=["'][^"']*post_info[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
      )?.[1] ?? "",
    ) || "";

  return {
    id: postId,
    postId,
    comment:
      html.match(
        /class=["']thisedit["'][^>]*data-comment=["']([^"']*)["']/i,
      )?.[1] ?? "",
    blogId: blogMatch?.[1] ?? "",
    blogName,
    type:
      html.match(/class=["']type["'][^>]*data-type=["']([^"']*)["']/i)?.[1] ??
      "text",
    title: stripHtml(
      html.match(/id=["']titleedit["'][^>]*>([\s\S]*?)<\/div>/i)?.[1] ?? "",
    ),
    body: parseTextareaValue(html, "editthis"),
    tags: parseTagList(tagsBlock).map((tag) => tag.replace(/^#/, "")),
    earlier: "1",
  };
}
