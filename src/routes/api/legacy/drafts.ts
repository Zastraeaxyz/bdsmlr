import type { APIEvent } from "@solidjs/start/server";
import { parseDrafts, parseEditablePost } from "~/lib/legacyDrafts";

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

  if (id) {
    const draftsPage = await fetch("https://bdsmlr.com/drafts", {
      headers: {
        "User-Agent": userAgent,
        Accept: "text/html,application/xhtml+xml",
        Cookie: cookie,
      },
      redirect: "manual",
    });
    const draftsHtml = await draftsPage.text();
    const csrf = csrfToken(draftsHtml);
    if (!csrf) return json({ error: "Sign in again to edit drafts" }, 401);
    const editorPage = await fetch("https://bdsmlr.com/editdraft", {
      method: "POST",
      headers: {
        "User-Agent": userAgent,
        Accept: "text/html,application/xhtml+xml",
        "Content-Type": "application/x-www-form-urlencoded",
        "X-CSRF-TOKEN": csrf,
        Origin: "https://bdsmlr.com",
        Referer: "https://bdsmlr.com/drafts",
        Cookie: cookie,
      },
      body: new URLSearchParams({ id }).toString(),
      redirect: "manual",
    });
    if (editorPage.status >= 300 && editorPage.status < 400) {
      return json({ error: "Sign in again to edit drafts" }, 401);
    }
    if (editorPage.status === 429) {
      return json({ error: "BDSMLR is rate limiting requests right now. This usually clears in a minute or two." }, 429);
    }
    const editor = parseEditablePost(await editorPage.text());
    if (!editor) return json({ error: "Could not load the draft" }, 502);
    return json({ editor }, 200);
  }

  const page = await fetch("https://bdsmlr.com/drafts", {
    headers: {
      "User-Agent": userAgent,
      Accept: "text/html,application/xhtml+xml",
      Cookie: cookie,
    },
    redirect: "manual",
  });

  if (page.status >= 300 && page.status < 400) {
    return json({ error: "Sign in again to manage drafts" }, 401);
  }
  if (page.status === 429) {
    return json({ error: "BDSMLR is rate limiting requests right now. This usually clears in a minute or two." }, 429);
  }

  return json({ drafts: parseDrafts(await page.text()) }, 200);
}
