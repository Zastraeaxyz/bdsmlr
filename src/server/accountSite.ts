import { createHash } from "node:crypto";
import {
  hasTurnstile,
  parseAccountUserLogin,
  parseInvitationFeedback,
  parseInvitationsPage,
  parseLoginError,
  parseNotificationsPage,
  parseProfileUserLogin,
  parseSendInvitePage,
  type InvitationFeedback,
  type InvitationsPageData,
  type NotificationsPageData,
  type SendInvitePageData,
} from "~/lib/invitationsParse";

export const ACCOUNT_BASE = "https://account.bdsmlr.com";
export const ACCOUNT_LOGIN_URL = `${ACCOUNT_BASE}/wp-login.php`;

const USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36";
const COOKIE_AGE = 60 * 60 * 24 * 30;
const ACCOUNT_TIMEOUT = 15000;

export class AccountSiteError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 502, code = "upstream_error") {
    super(message);
    this.name = "AccountSiteError";
    this.status = status;
    this.code = code;
  }
}

interface CookiePair {
  name: string;
  value: string;
}

interface AccountPageResult {
  html: string;
  status: number;
  location: string | null;
}

export interface AccountInvitationsData {
  userLogin: string;
  allowed: boolean;
  blockedMessage: string | null;
  invitations: InvitationsPageData["invitations"];
  total: number | null;
  nextPage: number | null;
  feedback: InvitationFeedback | null;
  notifications: NotificationsPageData["accepted"];
  notificationsNextPage: number | null;
  notificationsError: string | null;
}

export interface AccountActionResult {
  ok: boolean;
  message: string;
  type: InvitationFeedback["type"];
}

function sessionRequired(): AccountSiteError {
  return new AccountSiteError(
    "Your account-site session expired. Connect it again.",
    401,
    "account_session_required",
  );
}

function parseCookiePairs(header: string): CookiePair[] {
  const pairs: CookiePair[] = [];
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const name = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!name || !value) continue;
    if (/[\r\n;]/.test(value)) continue;
    pairs.push({ name, value });
  }
  return pairs;
}

function isAccountCookieName(name: string): boolean {
  return (
    name.startsWith("wordpress_logged_in_") ||
    name.startsWith("wordpress_sec_") ||
    name === "wordpress_test_cookie"
  );
}

function hasLoginCookie(pairs: CookiePair[]): boolean {
  return pairs.some((pair) => pair.name.startsWith("wordpress_logged_in_"));
}

function cookieHeaderFromPairs(pairs: CookiePair[]): string {
  return pairs.map((pair) => `${pair.name}=${pair.value}`).join("; ");
}

/** Account-site cookies from an incoming app request, ready to forward. */
export function accountCookieHeader(request: Request): string {
  const pairs = parseCookiePairs(request.headers.get("cookie") ?? "").filter(
    (pair) => isAccountCookieName(pair.name),
  );
  return hasLoginCookie(pairs) ? cookieHeaderFromPairs(pairs) : "";
}

export function accountUsernameFromRequest(request: Request): string {
  const pair = parseCookiePairs(request.headers.get("cookie") ?? "").find(
    (item) => item.name === "bbdsmlr_account_user",
  );
  if (!pair) return "";
  try {
    return decodeURIComponent(pair.value);
  } catch {
    return pair.value;
  }
}

function candidateLoginCookieNames(): string[] {
  const origins = [
    ACCOUNT_BASE,
    ACCOUNT_BASE.replace(/^https:/, "http:"),
    `${ACCOUNT_BASE}/`,
    `${ACCOUNT_BASE.replace(/^https:/, "http:")}/`,
  ];
  return [...new Set(origins)].map(
    (origin) =>
      `wordpress_logged_in_${createHash("md5").update(origin).digest("hex")}`,
  );
}

/** Accept either a whole Cookie header or just the cookie value. */
export function parseAccountCookieInput(input: string): CookiePair[] {
  let text = input.trim();
  if (!text) return [];
  text = text.replace(/^cookie\s*:\s*/i, "");
  const pairs = parseCookiePairs(text).filter((pair) =>
    isAccountCookieName(pair.name),
  );
  if (pairs.length > 0) return pairs;
  if (/^[\w%+/=.-]+$/.test(text)) {
    return candidateLoginCookieNames().map((name) => ({ name, value: text }));
  }
  return [];
}

export function setAccountSessionCookies(
  response: Response,
  pairs: CookiePair[],
  request: Request,
): void {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  for (const pair of pairs) {
    response.headers.append(
      "Set-Cookie",
      `${pair.name}=${pair.value}; Path=/; Max-Age=${COOKIE_AGE}; HttpOnly; SameSite=Lax${secure}`,
    );
  }
}

export function setAccountUsernameCookie(
  response: Response,
  username: string,
  request: Request,
): void {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  response.headers.append(
    "Set-Cookie",
    `bbdsmlr_account_user=${encodeURIComponent(username)}; Path=/; Max-Age=${COOKIE_AGE}; HttpOnly; SameSite=Lax${secure}`,
  );
}

export function clearAccountCookies(
  response: Response,
  request: Request,
): void {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  const names = new Set<string>([
    "bbdsmlr_account_user",
    "wordpress_test_cookie",
    ...candidateLoginCookieNames(),
  ]);
  for (const pair of parseCookiePairs(
    request.headers.get("cookie") ?? "",
  )) {
    if (isAccountCookieName(pair.name) || pair.name === "bbdsmlr_account_user") {
      names.add(pair.name);
    }
  }
  for (const name of names) {
    response.headers.append(
      "Set-Cookie",
      `${name}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secure}`,
    );
  }
}

function setCookiesFromHeaders(headers: Headers): string[] {
  const withGet = headers as Headers & { getSetCookie?: () => string[] };
  if (typeof withGet.getSetCookie === "function") return withGet.getSetCookie();
  const single = headers.get("set-cookie");
  return single ? [single] : [];
}

function updateJar(jar: Map<string, string>, cookies: string[]): void {
  for (const cookie of cookies) {
    const [pair, ...attrs] = cookie.split(";");
    const eq = pair.indexOf("=");
    if (eq <= 0) continue;
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

function jarCookieHeader(jar: Map<string, string>): string {
  return [...jar].map(([name, value]) => `${name}=${value}`).join("; ");
}

function jarPairs(jar: Map<string, string>): CookiePair[] {
  return [...jar]
    .filter(([name]) => isAccountCookieName(name))
    .map(([name, value]) => ({ name, value }));
}

async function fetchAccountPage(
  path: string,
  cookie: string,
  timeout = ACCOUNT_TIMEOUT,
): Promise<AccountPageResult> {
  const url = new URL(path, ACCOUNT_BASE);
  if (url.origin !== ACCOUNT_BASE) {
    throw new AccountSiteError("Invalid account-site URL.", 400, "invalid_url");
  }
  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    redirect: "manual",
    signal: AbortSignal.timeout(timeout),
  });
  return {
    html: await res.text(),
    status: res.status,
    location: res.headers.get("location"),
  };
}

function assertPage(result: AccountPageResult): string {
  const { html, status, location } = result;
  if (
    status >= 300 &&
    status < 400 &&
    (location ?? "").includes("wp-login.php")
  ) {
    throw sessionRequired();
  }
  if (status === 429) {
    throw new AccountSiteError(
      "BDSMLR temporarily blocked the request. Wait a moment and try again.",
      429,
      "upstream_blocked",
    );
  }
  if (status === 419) {
    throw new AccountSiteError(
      "The BDSMLR security token expired. Try again.",
      419,
      "security_token_expired",
    );
  }
  if (status === 403 || status === 503) {
    if (
      /cf-chl|Just a moment|challenges\.cloudflare\.com|Attention Required/i.test(
        html,
      )
    ) {
      throw new AccountSiteError(
        "BDSMLR blocked the request. Try again in a minute.",
        503,
        "upstream_blocked",
      );
    }
    throw new AccountSiteError(
      `The account site returned HTTP ${status}.`,
      502,
      "upstream_error",
    );
  }
  if (status >= 500) {
    throw new AccountSiteError(
      "BDSMLR returned a server error. Try again later.",
      502,
      "upstream_error",
    );
  }
  if (status === 404) {
    throw new AccountSiteError(
      "The account site could not find that page.",
      404,
      "account_page_not_found",
    );
  }
  if (status === 200 && /cf-chl|Just a moment|Attention Required/i.test(html)) {
    throw new AccountSiteError(
      "BDSMLR blocked the request. Try again in a minute.",
      503,
      "upstream_blocked",
    );
  }
  return html;
}

async function followAccountRedirects(
  result: AccountPageResult,
  cookie: string,
): Promise<AccountPageResult> {
  let current = result;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    if (current.status < 300 || current.status >= 400 || !current.location) {
      return current;
    }
    if (current.location.includes("wp-login.php")) throw sessionRequired();
    const next = new URL(current.location, ACCOUNT_BASE);
    if (next.origin !== ACCOUNT_BASE) {
      throw new AccountSiteError(
        "The account site redirected somewhere unexpected.",
        502,
        "upstream_error",
      );
    }
    current = await fetchAccountPage(next.toString(), cookie);
  }
  return current;
}

async function requestAccountPage(
  path: string,
  cookie: string,
  follow = false,
): Promise<AccountPageResult> {
  const initial = await fetchAccountPage(path, cookie);
  const result = follow ? await followAccountRedirects(initial, cookie) : initial;
  return result;
}

async function resolveFromUsername(
  cookie: string,
  username: string,
): Promise<string | null> {
  if (!username) return null;
  const result = await fetchAccountPage(
    `/members/${encodeURIComponent(username)}/invitations/list-invites/`,
    cookie,
  );
  if (result.status === 404) return null;
  if (result.status >= 300 && result.status < 400) {
    const location = result.location ?? "";
    if (location.includes("wp-login.php")) throw sessionRequired();
    const member = location.match(/\/members\/([^/?#]+)/);
    if (member) {
      try {
        return decodeURIComponent(member[1]);
      } catch {
        return member[1];
      }
    }
  }
  assertPage(result);
  return parseAccountUserLogin(result.html) ?? username;
}

/** Resolve the account-site username, using the profile page as a fallback. */
export async function resolveAccountUserLogin(
  cookie: string,
  username?: string,
): Promise<string> {
  const named = await resolveFromUsername(cookie, username ?? "");
  if (named) return named;

  const profile = await fetchAccountPage("/wp-admin/profile.php", cookie);
  if (profile.status >= 300 && profile.status < 400) {
    const location = profile.location ?? "";
    if (location.includes("wp-login.php")) throw sessionRequired();
  }
  assertPage(profile);
  const parsed = parseProfileUserLogin(profile.html);
  if (parsed) return parsed;

  throw new AccountSiteError(
    "Could not find your account-site profile. Check the account username and session cookie.",
    400,
    "invalid_account_user",
  );
}

let loginBlockedCache: { value: boolean; expires: number } | null = null;

/** Check once whether the account-site login currently has a Turnstile check. */
export async function checkAccountLoginBlocked(): Promise<boolean> {
  if (loginBlockedCache && loginBlockedCache.expires > Date.now()) {
    return loginBlockedCache.value;
  }
  try {
    const result = await fetchAccountPage(ACCOUNT_LOGIN_URL, "", 6000);
    const blocked =
      result.status < 400 &&
      !(result.status >= 300 && result.status < 400) &&
      hasTurnstile(result.html);
    loginBlockedCache = { value: blocked, expires: Date.now() + 5 * 60 * 1000 };
    return blocked;
  } catch {
    return false;
  }
}

export interface AccountLoginResult {
  cookies: CookiePair[];
  userLogin: string;
}

/** Try to sign in to the WordPress account site with the BDSMLR credentials. */
export async function loginToAccountSite(
  email: string,
  password: string,
): Promise<AccountLoginResult> {
  const jar = new Map<string, string>();
  const pageResponse = await fetch(ACCOUNT_LOGIN_URL, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9",
    },
    redirect: "manual",
    signal: AbortSignal.timeout(ACCOUNT_TIMEOUT),
  });
  updateJar(jar, setCookiesFromHeaders(pageResponse.headers));
  const loginHtml = await pageResponse.text();
  assertPage({
    html: loginHtml,
    status: pageResponse.status,
    location: pageResponse.headers.get("location"),
  });

  if (hasTurnstile(loginHtml)) {
    throw new AccountSiteError(
      "The account site requires a Cloudflare browser check, so this app cannot sign in for you. Sign in there in your browser and connect the session instead.",
      409,
      "turnstile",
    );
  }

  const body = new URLSearchParams({
    log: email,
    pwd: password,
    rememberme: "forever",
    "wp-submit": "Log In",
    redirect_to: `${ACCOUNT_BASE}/`,
    testcookie: "1",
  });

  const response = await fetch(ACCOUNT_LOGIN_URL, {
    method: "POST",
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9",
      "Content-Type": "application/x-www-form-urlencoded",
      Origin: ACCOUNT_BASE,
      Referer: ACCOUNT_LOGIN_URL,
      Cookie: jarCookieHeader(jar),
    },
    body,
    redirect: "manual",
    signal: AbortSignal.timeout(ACCOUNT_TIMEOUT),
  });
  updateJar(jar, setCookiesFromHeaders(response.headers));

  if (response.status === 429) {
    throw new AccountSiteError(
      "BDSMLR temporarily blocked the login. Wait a moment and try again.",
      429,
      "upstream_blocked",
    );
  }
  if (response.status === 419) {
    throw new AccountSiteError(
      "The BDSMLR login security token expired. Try again.",
      419,
      "security_token_expired",
    );
  }
  if (response.status === 403 || response.status === 503) {
    throw new AccountSiteError(
      "BDSMLR blocked the login request. Sign in at account.bdsmlr.com and connect the session instead.",
      503,
      "upstream_blocked",
    );
  }
  if (response.status >= 500) {
    throw new AccountSiteError(
      "BDSMLR returned a server error during sign-in. Try again later.",
      502,
      "upstream_error",
    );
  }

  const pairs = jarPairs(jar);
  if (!hasLoginCookie(pairs)) {
    const html = await response.text();
    const message =
      parseLoginError(html) ||
      (hasTurnstile(html)
        ? "The account site requires a Cloudflare browser check."
        : "BDSMLR rejected the login.");
    throw new AccountSiteError(message, 401, "invalid_credentials");
  }

  const cookie = cookieHeaderFromPairs(pairs);
  const userLogin = await resolveAccountUserLogin(cookie);
  return { cookies: pairs, userLogin };
}

/** Load the send form, invitations list, and accepted notifications. */
export async function loadAccountInvitations(
  cookie: string,
  username: string,
  page = 1,
  notificationsPage = 1,
): Promise<AccountInvitationsData> {
  const base = `/members/${encodeURIComponent(username)}`;
  const sendPath = `${base}/invitations/send-invites/`;
  const listPath = `${base}/invitations/list-invites/${
    page > 1 ? `?ipage=${page}` : ""
  }`;
  const notificationsPath = `${base}/notifications/${
    notificationsPage > 1 ? `?npage=${notificationsPage}` : ""
  }`;

  const [sendResult, listResult, notificationsResult] = await Promise.all([
    requestAccountPage(sendPath, cookie, true),
    requestAccountPage(listPath, cookie, true),
    requestAccountPage(notificationsPath, cookie, true).then(
      (value) => ({ ok: true as const, value }),
      (error: unknown) => ({ ok: false as const, error }),
    ),
  ]);
  const sendHtml = assertPage(sendResult);
  const listHtml = assertPage(listResult);
  const sendPage: SendInvitePageData = parseSendInvitePage(sendHtml);
  const listPage: InvitationsPageData = parseInvitationsPage(listHtml, page);

  let notifications: NotificationsPageData["accepted"] = [];
  let notificationsNextPage: number | null = null;
  let notificationsError: string | null = null;
  try {
    if (!notificationsResult.ok) throw notificationsResult.error;
    const notificationsHtml = assertPage(notificationsResult.value);
    const parsed = parseNotificationsPage(notificationsHtml, notificationsPage);
    notifications = parsed.accepted;
    notificationsNextPage = parsed.nextPage;
  } catch (err) {
    if (err instanceof AccountSiteError && err.code === "account_session_required") {
      throw err;
    }
    notificationsError =
      err instanceof Error ? err.message : "Could not load accepted invitations.";
  }

  return {
    userLogin: username,
    allowed: sendPage.allowed,
    blockedMessage:
      sendPage.feedback?.type === "error" ? sendPage.feedback.message : null,
    invitations: listPage.invitations,
    total: listPage.total,
    nextPage: listPage.nextPage,
    feedback: listPage.feedback ?? sendPage.feedback,
    notifications,
    notificationsNextPage,
    notificationsError,
  };
}

/** Send one membership invitation through the BuddyPress form. */
export async function sendAccountInvitation(
  cookie: string,
  username: string,
  email: string,
  message: string,
): Promise<AccountActionResult> {
  const sendPath = `/members/${encodeURIComponent(username)}/invitations/send-invites/`;
  const sendResult = await requestAccountPage(sendPath, cookie, true);
  const sendHtml = assertPage(sendResult);
  const sendPage = parseSendInvitePage(sendHtml);

  if (!sendPage.allowed) {
    throw new AccountSiteError(
      sendPage.feedback?.message ||
        "You are not allowed to send invitations from this account.",
      403,
      "invitations_not_allowed",
    );
  }
  if (!sendPage.nonce) {
    throw new AccountSiteError(
      "Could not verify the invitation form. Refresh and try again.",
      502,
      "parse_error",
    );
  }

  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(sendPage.fields)) {
    body.set(key, value);
  }
  body.set("action", "send-invite");
  body.set("invitee_email", email);
  body.set("content", message);

  const response = await fetch(new URL(sendPath, ACCOUNT_BASE), {
    method: "POST",
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9",
      "Content-Type": "application/x-www-form-urlencoded",
      Origin: ACCOUNT_BASE,
      Referer: new URL(sendPath, ACCOUNT_BASE).toString(),
      Cookie: cookie,
    },
    body,
    redirect: "manual",
    signal: AbortSignal.timeout(ACCOUNT_TIMEOUT),
  });

  const result: AccountPageResult = {
    html: await response.text(),
    status: response.status,
    location: response.headers.get("location"),
  };
  const followed = await followAccountRedirects(result, cookie);
  const html = assertPage(followed);
  const feedback = parseInvitationFeedback(html);
  const type = feedback?.type ?? "success";
  return {
    ok: type !== "error",
    message:
      feedback?.message ||
      (type === "error"
        ? "There was a problem sending that invitation."
        : "Invitation sent."),
    type,
  };
}

/** Resend or cancel one or more invitations. */
export async function runAccountInvitationAction(
  cookie: string,
  username: string,
  action: "resend" | "cancel",
  ids: string[],
): Promise<AccountActionResult> {
  const base = `/members/${encodeURIComponent(username)}`;
  const listPath = `${base}/invitations/list-invites/`;
  const listResult = await requestAccountPage(listPath, cookie, true);
  const listHtml = assertPage(listResult);
  const listPage = parseInvitationsPage(listHtml);

  let response: Response;
  if (ids.length === 1) {
    const row = listPage.invitations.find((item) => item.id === ids[0]);
    if (!row) {
      throw new AccountSiteError(
        "That invitation is no longer on the account site.",
        404,
        "invitation_not_found",
      );
    }
    const target = action === "resend" ? row.resendUrl : row.cancelUrl;
    if (!target) {
      throw new AccountSiteError(
        action === "resend"
          ? "This invitation cannot be resent."
          : "This invitation cannot be canceled.",
        400,
        "action_not_available",
      );
    }
    const url = new URL(target, ACCOUNT_BASE);
    if (url.origin !== ACCOUNT_BASE) {
      throw new AccountSiteError(
        "The account site returned an unexpected action link.",
        502,
        "upstream_error",
      );
    }
    response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
        Referer: new URL(listPath, ACCOUNT_BASE).toString(),
        Cookie: cookie,
      },
      redirect: "manual",
      signal: AbortSignal.timeout(ACCOUNT_TIMEOUT),
    });
  } else {
    if (!listPage.bulkNonce) {
      throw new AccountSiteError(
        "Could not verify the invitation actions. Refresh and try again.",
        502,
        "parse_error",
      );
    }
    const body = new URLSearchParams();
    body.set("invitation_bulk_action", action);
    for (const id of ids) body.append("members_invitations[]", id);
    body.set("invitations_bulk_nonce", listPage.bulkNonce);
    response = await fetch(new URL(listPath, ACCOUNT_BASE), {
      method: "POST",
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
        "Content-Type": "application/x-www-form-urlencoded",
        Origin: ACCOUNT_BASE,
        Referer: new URL(listPath, ACCOUNT_BASE).toString(),
        Cookie: cookie,
      },
      body,
      redirect: "manual",
      signal: AbortSignal.timeout(ACCOUNT_TIMEOUT),
    });
  }

  const result: AccountPageResult = {
    html: await response.text(),
    status: response.status,
    location: response.headers.get("location"),
  };
  const followed = await followAccountRedirects(result, cookie);
  const html = assertPage(followed);
  const feedback = parseInvitationFeedback(html);
  const type = feedback?.type ?? "success";
  return {
    ok: type !== "error",
    message:
      feedback?.message ||
      (type === "error"
        ? "The invitation action failed."
        : action === "resend"
          ? "Invitation resent."
          : "Invitation canceled."),
    type,
  };
}

/** Load a page of accepted invitations from the notifications screen. */
export async function loadAcceptedInvitations(
  cookie: string,
  username: string,
  page = 1,
): Promise<NotificationsPageData> {
  const path = `/members/${encodeURIComponent(username)}/notifications/${
    page > 1 ? `?npage=${page}` : ""
  }`;
  const result = await requestAccountPage(path, cookie, true);
  const html = assertPage(result);
  return parseNotificationsPage(html, page);
}
