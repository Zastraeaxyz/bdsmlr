import type { APIEvent } from "@solidjs/start/server";

const BASE = "https://bdsmlr.com";

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function attr(tag: string, name: string): string | null {
  const match = tag.match(new RegExp(`${name}\\s*=\\s*"([^"]*)"`, "i"));
  return match ? match[1] : null;
}

function parseFields(html: string): Record<string, string | boolean> {
  const fields: Record<string, string | boolean> = {};

  for (const match of html.matchAll(/<input\b[^>]*>/gi)) {
    const tag = match[0];
    const name = attr(tag, "name");
    if (!name) continue;
    const type = (attr(tag, "type") || "text").toLowerCase();
    if (type === "checkbox") {
      if (/\bchecked\b/i.test(tag)) fields[name] = true;
      else if (!(name in fields)) fields[name] = false;
    } else if (type === "radio") {
      if (/\bchecked\b/i.test(tag)) fields[name] = attr(tag, "value") || "";
    } else if (type !== "hidden" || !(name in fields)) {
      fields[name] = attr(tag, "value") || "";
    }
  }

  for (const match of html.matchAll(/<textarea\b([^>]*)>([\s\S]*?)<\/textarea>/gi)) {
    const name = attr(match[1], "name");
    if (!name) continue;
    fields[name] = match[2].replace(/\r/g, "").trim();
  }

  for (const match of html.matchAll(/<select\b([^>]*)>([\s\S]*?)<\/select>/gi)) {
    const name = attr(match[1], "name");
    if (!name) continue;
    const selected = match[2].match(
      /<option\b[^>]*\bselected(?:="[^"]*")?[^>]*value="([^"]*)"/i,
    );
    const first = match[2].match(/<option\b[^>]*value="([^"]*)"/i);
    fields[name] = selected?.[1] ?? first?.[1] ?? "";
  }

  return fields;
}

export async function GET(event: APIEvent) {
  const url = new URL(event.request.url);
  const blog = url.searchParams.get("blog");
  if (!blog) return json({ error: "Missing blog name" }, 400);

  const cookie = event.request.headers.get("cookie") ?? "";
  const userAgent = event.request.headers.get("user-agent") ?? "Mozilla/5.0";
  const page = await fetch(`${BASE}/customize/${encodeURIComponent(blog)}`, {
    headers: {
      "User-Agent": userAgent,
      Accept: "text/html,application/xhtml+xml",
      Cookie: cookie,
    },
    redirect: "manual",
  });

  if (page.status >= 300 && page.status < 400) {
    return json({ error: "Sign in again to customize this blog" }, 401);
  }
  if (page.status === 429) {
    return json({ error: "BDSMLR temporarily blocked the request. Try again shortly." }, 429);
  }

  const html = await page.text();
  const fields = parseFields(html);
  const blogId = fields.blog;
  const csrf = fields._token;
  if (typeof blogId !== "string" || typeof csrf !== "string") {
    return json({ error: "Could not load blog customization" }, 502);
  }

  return json({ blogId, csrf, fields }, 200);
}
