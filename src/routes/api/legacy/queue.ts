import type { APIEvent } from "@solidjs/start/server";
import { parseEditablePost } from "~/lib/legacyDrafts";
import { parseQueue } from "~/lib/legacyQueue";

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function csrfToken(html: string): string | null {
  return html.match(/<meta name="csrf-token" content="([^"]+)"/)?.[1] ?? null;
}

export async function GET(event: APIEvent) {
  const cookie = event.request.headers.get("cookie") ?? "";
  const userAgent = event.request.headers.get("user-agent") ?? "Mozilla/5.0";
  const id = new URL(event.request.url).searchParams.get("id");

  const page = await fetch("https://bdsmlr.com/queuev2", {
    headers: {
      "User-Agent": userAgent,
      Accept: "text/html,application/xhtml+xml",
      Cookie: cookie,
    },
    redirect: "manual",
  });

  if (page.status >= 300 && page.status < 400) {
    return json({ error: "Sign in again to manage the queue" }, 401);
  }
  if (page.status === 429) {
    return json({ error: "BDSMLR is rate limiting requests right now. This usually clears in a minute or two." }, 429);
  }

  const html = await page.text();
  const queue = parseQueue(html);
  if (!id) return json({ queue }, 200);

  const csrf = csrfToken(html);
  if (!csrf) return json({ error: "Sign in again to edit the queue" }, 401);

  const editorPage = await fetch("https://bdsmlr.com/editqueue", {
    method: "POST",
    headers: {
      "User-Agent": userAgent,
      Accept: "text/html,application/xhtml+xml",
      "Content-Type": "application/x-www-form-urlencoded",
      "X-CSRF-TOKEN": csrf,
      Origin: "https://bdsmlr.com",
      Referer: "https://bdsmlr.com/queuev2",
      Cookie: cookie,
    },
    body: new URLSearchParams({ id }).toString(),
    redirect: "manual",
  });

  if (editorPage.status >= 300 && editorPage.status < 400) {
    return json({ error: "Sign in again to edit the queue" }, 401);
  }
  if (editorPage.status === 429) {
    return json({ error: "BDSMLR is rate limiting requests right now. This usually clears in a minute or two." }, 429);
  }

  const editor = parseEditablePost(await editorPage.text(), id);
  if (!editor) return json({ error: "Could not load the queue post" }, 502);
  const item = queue.items.find((entry) => entry.id === id);
  if (item) editor.blogName = item.blogName;
  return json({ editor }, 200);
}
