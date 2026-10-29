import { parseTagLinks, stripHtml } from "./legacyHtml";

export interface LegacyQueueItem {
  id: string;
  title: string;
  text: string;
  tags: string[];
  image?: string;
  blogName: string;
  scheduledAt: string;
  kind: "text" | "image";
}

export interface LegacyQueueSettings {
  running: boolean;
  startHour: number;
  endHour: number;
  interval: string;
  random: boolean;
  timezone: string;
}

export interface LegacyQueue {
  count: number;
  items: LegacyQueueItem[];
  settings: LegacyQueueSettings;
}

function selectedOption(html: string, selector: string): string {
  const block = html.match(
    new RegExp(`<select[^>]*${selector}[^>]*>([\\s\\S]*?)</select>`, "i"),
  )?.[1];
  if (!block) return "";
  const options = [...block.matchAll(/<option([^>]*)>([^<]*)<\/option>/gi)];
  const selected = options.filter((option) => /\bselected\b/i.test(option[1]));
  const chosen = selected.length > 0 ? selected[selected.length - 1] : options[0];
  if (!chosen) return "";
  const value = chosen[1].match(/value=["']([^"']*)["']/i)?.[1];
  return (value ?? chosen[2]).trim();
}

export function parseQueue(html: string): LegacyQueue {
  const starts = [...html.matchAll(/<div class="news panel" id="(\d+)">/g)];
  const items: LegacyQueueItem[] = [];

  for (let i = 0; i < starts.length; i += 1) {
    const start = starts[i].index ?? 0;
    const end = i + 1 < starts.length ? (starts[i + 1].index ?? html.length) : html.length;
    const chunk = html.slice(start, end);
    if (!/publishpost|fa-calendar|editpost/.test(chunk)) continue;

    const id = starts[i][1];
    const image = chunk.match(/<div class="image_content">[\s\S]*?<img[^>]*src="([^"]+)"/)?.[1];
    const blogName =
      stripHtml(
        chunk.match(
          /class=["'][^"']*ndata[^"']*["'][^>]*>([\s\S]*?)<\/a>/i,
        )?.[1] ?? "",
      ) ||
      stripHtml(
        chunk.match(
          /<div[^>]*class=["'][^"']*post_info[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
        )?.[1] ?? "",
      );
    const title = stripHtml(
      chunk.match(/<div class="titletext">([\s\S]*?)<\/div>/)?.[1] ?? "",
    );
    const textContent = stripHtml(
      chunk.match(/<div class="textcontent">([\s\S]*?)<\/div>/)?.[1] ?? "",
    );
    const comment = stripHtml(
      chunk.match(/<div class="singlecommentline"[^>]*>([\s\S]*?)<\/div>/)?.[1] ?? "",
    );

    items.push({
      id,
      title,
      text: textContent || comment,
      tags: parseTagLinks(chunk),
      image,
      blogName,
      scheduledAt:
        chunk.match(/class="fa fa-calendar"[^>]*data-time="([^"]*)"/)?.[1] ?? "",
      kind: image ? "image" : "text",
    });
  }

  return {
    count: Number(html.match(/Posts in Queue:\s*(\d+)/)?.[1] ?? items.length),
    items,
    settings: {
      running: /class="switch-input"[^>]*checked/i.test(html),
      startHour: Number(selectedOption(html, 'class="starttime"') || 0),
      endHour: Number(selectedOption(html, 'class="endtime"') || 23),
      interval: selectedOption(html, 'class="publishtime"') || "60",
      random: /id="random"[^>]*checked|checked[^>]*id="random"/i.test(html),
      timezone: selectedOption(html, 'name="timezone"') || "GMT",
    },
  };
}
