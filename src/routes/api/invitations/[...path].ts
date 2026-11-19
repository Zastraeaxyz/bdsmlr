import type { APIEvent } from "@solidjs/start/server";
import {
  ACCOUNT_LOGIN_URL,
  AccountSiteError,
  accountCookieHeader,
  accountUsernameFromRequest,
  checkAccountLoginBlocked,
  clearAccountCookies,
  loadAcceptedInvitations,
  loadAccountInvitations,
  loginToAccountSite,
  parseAccountCookieInput,
  resolveAccountUserLogin,
  runAccountInvitationAction,
  sendAccountInvitation,
  setAccountSessionCookies,
  setAccountUsernameCookie,
} from "~/server/accountSite";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function errorResponse(err: unknown): Response {
  if (err instanceof AccountSiteError) {
    return json({ error: err.message, code: err.code }, err.status);
  }
  if (
    err &&
    typeof err === "object" &&
    "name" in err &&
    (err as { name?: string }).name === "TimeoutError"
  ) {
    return json(
      {
        error: "The account site took too long to respond. Try again.",
        code: "upstream_timeout",
      },
      504,
    );
  }
  console.error("Invitations API error", err);
  return json(
    { error: "Something went wrong while talking to the account site." },
    502,
  );
}

function requestPath(event: APIEvent): string {
  return new URL(event.request.url).pathname.replace(/^\/api\/invitations/, "");
}

function positiveInt(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function badOrigin(event: APIEvent): boolean {
  const origin = event.request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).origin !== new URL(event.request.url).origin) {
        return true;
      }
    } catch {
      return true;
    }
  }
  return event.request.headers.get("sec-fetch-site") === "cross-site";
}

async function readJson(event: APIEvent): Promise<Record<string, unknown>> {
  try {
    const data = await event.request.json();
    return data && typeof data === "object"
      ? (data as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function sessionRequiredResponse(event: APIEvent, message?: string): Response {
  const response = json(
    {
      error:
        message ||
        "Your account-site session expired. Connect it again.",
      code: "account_session_required",
    },
    401,
  );
  clearAccountCookies(response, event.request);
  return response;
}

async function getSession(event: APIEvent, url: URL): Promise<Response> {
  const cookie = accountCookieHeader(event.request);
  const username =
    accountUsernameFromRequest(event.request) ||
    url.searchParams.get("user")?.trim() ||
    "";

  if (cookie) {
    try {
      const userLogin = await resolveAccountUserLogin(cookie, username);
      const response = json({
        connected: true,
        userLogin,
        loginBlocked: false,
        loginUrl: ACCOUNT_LOGIN_URL,
      });
      setAccountUsernameCookie(response, userLogin, event.request);
      return response;
    } catch (err) {
      if (
        err instanceof AccountSiteError &&
        (err.code === "account_session_required" ||
          err.code === "invalid_account_user")
      ) {
        const loginBlocked = await checkAccountLoginBlocked().catch(
          () => false,
        );
        const status = err.code === "invalid_account_user" ? 401 : 200;
        const response = json(
          err.code === "invalid_account_user"
            ? {
                error: err.message,
                code: err.code,
                loginBlocked,
                loginUrl: ACCOUNT_LOGIN_URL,
              }
            : {
                connected: false,
                expired: true,
                loginBlocked,
                loginUrl: ACCOUNT_LOGIN_URL,
              },
          status,
        );
        clearAccountCookies(response, event.request);
        return response;
      }
      return errorResponse(err);
    }
  }

  const loginBlocked = await checkAccountLoginBlocked().catch(() => false);
  return json({
    connected: false,
    loginBlocked,
    loginUrl: ACCOUNT_LOGIN_URL,
  });
}

async function getIndex(event: APIEvent, url: URL): Promise<Response> {
  const cookie = accountCookieHeader(event.request);
  if (!cookie) return sessionRequiredResponse(event);

  const username =
    accountUsernameFromRequest(event.request) ||
    url.searchParams.get("user")?.trim() ||
    "";
  if (!username) {
    return sessionRequiredResponse(
      event,
      "Connect the account site before loading invitations.",
    );
  }

  const page = positiveInt(url.searchParams.get("page"), 1);
  const notificationsPage = positiveInt(
    url.searchParams.get("notificationsPage"),
    1,
  );

  try {
    const data = await loadAccountInvitations(
      cookie,
      username,
      page,
      notificationsPage,
    );
    const response = json({
      session: { connected: true, userLogin: data.userLogin },
      allowed: data.allowed,
      blockedMessage: data.blockedMessage,
      invitations: data.invitations,
      total: data.total,
      nextPage: data.nextPage,
      feedback: data.feedback,
      notifications: data.notifications,
      notificationsNextPage: data.notificationsNextPage,
      notificationsError: data.notificationsError,
    });
    setAccountUsernameCookie(response, data.userLogin, event.request);
    return response;
  } catch (err) {
    if (err instanceof AccountSiteError && err.code === "account_session_required") {
      return sessionRequiredResponse(event, err.message);
    }
    return errorResponse(err);
  }
}

async function getNotifications(event: APIEvent, url: URL): Promise<Response> {
  const cookie = accountCookieHeader(event.request);
  if (!cookie) return sessionRequiredResponse(event);

  const username =
    accountUsernameFromRequest(event.request) ||
    url.searchParams.get("user")?.trim() ||
    "";
  if (!username) {
    return sessionRequiredResponse(
      event,
      "Connect the account site before loading notifications.",
    );
  }

  const page = positiveInt(url.searchParams.get("page"), 1);
  try {
    const data = await loadAcceptedInvitations(cookie, username, page);
    return json({
      accepted: data.accepted,
      nextPage: data.nextPage,
      feedback: data.feedback,
    });
  } catch (err) {
    if (err instanceof AccountSiteError && err.code === "account_session_required") {
      return sessionRequiredResponse(event, err.message);
    }
    return errorResponse(err);
  }
}

export async function GET(event: APIEvent): Promise<Response> {
  const url = new URL(event.request.url);
  const path = requestPath(event);
  if (path === "" || path === "/") return getIndex(event, url);
  if (path === "/session") return getSession(event, url);
  if (path === "/notifications") return getNotifications(event, url);
  return json({ error: "Not found" }, 404);
}

export async function POST(event: APIEvent): Promise<Response> {
  if (badOrigin(event)) {
    return json({ error: "Invalid request origin.", code: "invalid_origin" }, 403);
  }

  const path = requestPath(event);
  const body = await readJson(event);

  try {
    if (path === "/login") {
      const email = text(body.email).trim();
      const password = text(body.password);
      if (!email || !password) {
        return json(
          { error: "Enter your account-site email and password.", code: "invalid_request" },
          400,
        );
      }
      const result = await loginToAccountSite(email, password);
      const response = json({
        connected: true,
        userLogin: result.userLogin,
        loginBlocked: false,
        loginUrl: ACCOUNT_LOGIN_URL,
      });
      setAccountSessionCookies(response, result.cookies, event.request);
      setAccountUsernameCookie(response, result.userLogin, event.request);
      return response;
    }

    if (path === "/connect") {
      const pairs = parseAccountCookieInput(text(body.cookie));
      if (!pairs.some((pair) => pair.name.startsWith("wordpress_logged_in_"))) {
        return json(
          {
            error:
              "Paste the wordpress_logged_in_... cookie from account.bdsmlr.com.",
            code: "invalid_cookie",
          },
          400,
        );
      }
      const cookie = pairs.map((pair) => `${pair.name}=${pair.value}`).join("; ");
      const username = text(body.username).trim();
      let userLogin: string;
      try {
        userLogin = await resolveAccountUserLogin(cookie, username);
      } catch (err) {
        if (
          err instanceof AccountSiteError &&
          err.code === "account_session_required"
        ) {
          const response = json(
            {
              error:
                "That session cookie did not work. Sign in at account.bdsmlr.com and copy the wordpress_logged_in_... cookie again.",
              code: "invalid_cookie",
            },
            401,
          );
          clearAccountCookies(response, event.request);
          return response;
        }
        throw err;
      }
      const response = json({
        connected: true,
        userLogin,
        loginBlocked: false,
        loginUrl: ACCOUNT_LOGIN_URL,
      });
      setAccountSessionCookies(response, pairs, event.request);
      setAccountUsernameCookie(response, userLogin, event.request);
      return response;
    }

    if (path === "/disconnect") {
      const response = json({ ok: true });
      clearAccountCookies(response, event.request);
      return response;
    }

    if (path === "/send") {
      const cookie = accountCookieHeader(event.request);
      if (!cookie) return sessionRequiredResponse(event);
      const username =
        text(body.username).trim() ||
        accountUsernameFromRequest(event.request);
      if (!username) {
        return sessionRequiredResponse(
          event,
          "Connect the account site before sending invitations.",
        );
      }
      const email = text(body.email).trim();
      const message = text(body.message);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return json(
          { error: "Enter a valid email address.", code: "invalid_email" },
          400,
        );
      }
      const result = await sendAccountInvitation(
        cookie,
        username,
        email,
        message,
      );
      return json(result);
    }

    if (path === "/action") {
      const cookie = accountCookieHeader(event.request);
      if (!cookie) return sessionRequiredResponse(event);
      const username =
        text(body.username).trim() ||
        accountUsernameFromRequest(event.request);
      if (!username) {
        return sessionRequiredResponse(
          event,
          "Connect the account site before managing invitations.",
        );
      }
      const action =
        body.action === "resend" || body.action === "cancel"
          ? body.action
          : null;
      if (!action) {
        return json(
          { error: "Unknown invitation action.", code: "invalid_request" },
          400,
        );
      }
      const rawIds = Array.isArray(body.ids)
        ? body.ids
        : [body.id];
      const ids = rawIds
        .map((id) => String(id ?? "").trim())
        .filter(Boolean);
      if (ids.length === 0) {
        return json(
          { error: "Choose at least one invitation.", code: "invalid_request" },
          400,
        );
      }
      const result = await runAccountInvitationAction(
        cookie,
        username,
        action,
        ids,
      );
      return json(result);
    }

    return json({ error: "Not found" }, 404);
  } catch (err) {
    if (err instanceof AccountSiteError && err.code === "account_session_required") {
      return sessionRequiredResponse(event, err.message);
    }
    return errorResponse(err);
  }
}
