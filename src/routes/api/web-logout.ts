import type { APIEvent } from "@solidjs/start/server";

function cookieNames(cookie: string): string[] {
  return cookie
    .split(";")
    .map((part) => part.slice(0, part.indexOf("=")).trim())
    .filter(Boolean);
}

export function POST(event: APIEvent) {
  const names = new Set([
    "bdsmlr7_session",
    "v2_session",
    "XSRF-TOKEN",
    "bbdsmlr_account_user",
    "wordpress_test_cookie",
    ...cookieNames(event.request.headers.get("cookie") ?? "").filter(
      (name) =>
        name.startsWith("remember_web_") ||
        name.startsWith("wordpress_logged_in_") ||
        name.startsWith("wordpress_sec_"),
    ),
  ]);
  const secure = new URL(event.request.url).protocol === "https:" ? "; Secure" : "";
  const response = new Response(JSON.stringify({ ok: true }), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
  for (const name of names) {
    response.headers.append(
      "Set-Cookie",
      `${name}=; Path=/; Max-Age=0; SameSite=Lax${secure}`,
    );
  }
  return response;
}
