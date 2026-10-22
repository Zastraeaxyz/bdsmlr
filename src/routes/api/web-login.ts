import type { APIEvent } from "@solidjs/start/server";

const LOGIN_URL = "https://bdsmlr.com/login";
const MESSAGES_URL = "https://bdsmlr.com/messages";

function setCookies(headers: Headers): string[] {
  const withGet = headers as Headers & { getSetCookie?: () => string[] };
  if (typeof withGet.getSetCookie === "function") return withGet.getSetCookie();
  const single = headers.get("set-cookie");
  return single ? [single] : [];
}

function updateJar(jar: Map<string, string>, cookies: string[]): void {
  for (const cookie of cookies) {
    const [pair, ...attrs] = cookie.split(";");
    const eq = pair.indexOf("=");
    if (eq === -1) continue;
    const name = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();
    const expired = attrs.some((attr) => {
      const [key, raw] = attr.trim().split("=");
      return key.toLowerCase() === "max-age" && Number(raw) <= 0;
    });
    if (expired || !value) jar.delete(name);
    else jar.set(name, value);
  }
}

function cookieHeader(jar: Map<string, string>): string {
  return [...jar].map(([name, value]) => `${name}=${value}`).join("; ");
}

function cleanSetCookie(cookie: string): string {
  return cookie.replace(/;\s*domain=[^;]*/gi, "");
}

function csrfToken(html: string): string | null {
  return (
    html.match(/<meta name="csrf-token" content="([^"]+)"/)?.[1] ??
    html.match(/name="_token" value="([^"]+)"/)?.[1] ??
    null
  );
}

export async function POST(event: APIEvent) {
  let payload: { login?: string; password?: string };
  try {
    payload = await event.request.json();
  } catch {
    return json({ error: "Invalid request" }, 400);
  }

  const login = payload.login?.trim();
  const password = payload.password;
  if (!login || !password) return json({ error: "Missing credentials" }, 400);

  const userAgent =
    event.request.headers.get("user-agent") ??
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36";
  const jar = new Map<string, string>();
  const emitted: string[] = [];
  const signal = AbortSignal.timeout(12000);

  const loginPage = await fetch(LOGIN_URL, {
    signal,
    headers: {
      "User-Agent": userAgent,
      Accept: "text/html,application/xhtml+xml",
    },
    redirect: "manual",
  });
  const loginPageCookies = setCookies(loginPage.headers);
  updateJar(jar, loginPageCookies);
  emitted.push(...loginPageCookies);

  const html = await loginPage.text();
  const token = csrfToken(html);
  if (!token) return json({ error: "Could not start a BDSMLR session" }, 502);

  const body = new URLSearchParams({
    _token: token,
    email: login,
    password,
    remember: "on",
  });

  const loginResponse = await fetch(LOGIN_URL, {
    method: "POST",
    signal,
    headers: {
      "User-Agent": userAgent,
      Accept: "text/html,application/xhtml+xml",
      "Content-Type": "application/x-www-form-urlencoded",
      Origin: "https://bdsmlr.com",
      Referer: LOGIN_URL,
      Cookie: cookieHeader(jar),
    },
    body,
    redirect: "manual",
  });

  const loginCookies = setCookies(loginResponse.headers);
  updateJar(jar, loginCookies);
  emitted.push(...loginCookies);

  const check = await fetch(MESSAGES_URL, {
    signal,
    headers: {
      "User-Agent": userAgent,
      Accept: "text/html,application/xhtml+xml",
      Cookie: cookieHeader(jar),
    },
    redirect: "manual",
  });

  if (!check.ok) {
    return json({ error: "BDSMLR rejected the login" }, 401);
  }

  const response = json({ ok: true }, 200);
  for (const cookie of emitted) {
    response.headers.append("Set-Cookie", cleanSetCookie(cookie));
  }
  return response;
}

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}
