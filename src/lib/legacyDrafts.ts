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

function openingTagWithClass(html: string, className: string): string {
  return (
    html.match(
      new RegExp(
        `<[^>]*class=["'][^"']*\\b${className}\\b[^"']*["'][^>]*>`,
        "i",
      ),
    )?.[0] ?? ""
  );
}

function attribute(tag: string, name: string): string {
  return tag.match(new RegExp(`\\b${name}=["']([^"']*)["']`, "i"))?.[1] ?? "";
}

export function parseEditablePost(
  html: string,
  fallbackId = "",
): LegacyEditablePost | null {
  // Text drafts have a .thisedit marker, while image drafts only have the
  // reblog-style .reblogpost element. Attribute order also differs between
  // the two layouts, so read the attributes from the opening tag itself.
  const thiseditTag = openingTagWithClass(html, "thisedit");
  const reblogTag = openingTagWithClass(html, "reblogpost");
  const postId =
    attribute(thiseditTag, "data-postid") ||
    attribute(reblogTag, "id") ||
    fallbackId;
  if (!postId) return null;

  const tagsBlock =
    html.match(/<ul[^>]*id=["']Tags["'][^>]*>([\s\S]*?)<\/ul>/i)?.[1] ?? "";
  const blogTag = openingTagWithClass(html, "blogID");
  const typeTag = openingTagWithClass(html, "type");
  const blogName =
    stripHtml(
      html.match(
        /<div[^>]*class=["'][^"']*post_info[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
      )?.[1] ?? "",
    ) || "";

  return {
    id: postId,
    postId,
    comment: attribute(thiseditTag, "data-comment"),
    blogId: attribute(blogTag, "data-blog"),
    blogName,
    type: attribute(typeTag, "data-type") || "text",
    title: stripHtml(
      html.match(/id=["']titleedit["'][^>]*>([\s\S]*?)<\/div>/i)?.[1] ?? "",
    ),
    body: parseTextareaValue(html, "editthis"),
    tags: parseTagList(tagsBlock).map((tag) => tag.replace(/^#/, "")),
    earlier: "1",
  };
}
