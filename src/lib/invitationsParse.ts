import { decodeHtml, stripHtml } from "./legacyHtml";

export interface InvitationFeedback {
  type: "success" | "error" | "info";
  message: string;
}

export interface InvitationRow {
  id: string;
  email: string;
  message: string;
  sent: boolean;
  accepted: boolean;
  dateModified: string;
  resendUrl?: string;
  cancelUrl?: string;
}

export interface InvitationsPageData {
  invitations: InvitationRow[];
  bulkNonce: string;
  total: number | null;
  nextPage: number | null;
  feedback: InvitationFeedback | null;
}

export interface SendInvitePageData {
  allowed: boolean;
  nonce: string;
  fields: Record<string, string>;
  feedback: InvitationFeedback | null;
}

export interface AcceptedInvitation {
  id: string;
  displayName: string;
  userLogin: string;
  accountProfileUrl: string;
  timeSince: string;
  dateTitle?: string;
}

export interface NotificationsPageData {
  accepted: AcceptedInvitation[];
  nextPage: number | null;
  feedback: InvitationFeedback | null;
}

function attribute(tag: string, name: string): string | null {
  const match = tag.match(
    new RegExp(
      `\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
      "i",
    ),
  );
  if (!match) return null;
  return decodeHtml(match[1] ?? match[2] ?? match[3] ?? "");
}

function classAttribute(html: string): string {
  const match = html.match(/^<[^>]*\bclass\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
  return decodeHtml(match?.[1] ?? match?.[2] ?? "");
}

function cell(row: string, className: string): string {
  const match = row.match(
    new RegExp(
      `<td[^>]*\\bclass\\s*=\\s*(?:"[^"]*\\b${className}\\b[^"]*"|'[^']*\\b${className}\\b[^']*')[^>]*>([\\s\\S]*?)<\\/td>`,
      "i",
    ),
  );
  return match?.[1] ?? "";
}

function booleanCell(text: string): boolean {
  const value = text.trim().toLowerCase();
  if (!value) return false;
  if (/\b(?:no|false|not|pending)\b/.test(value)) return false;
  return (
    /^(?:1|yes|true|sent|accepted)$/.test(value) ||
    /\b(?:sent|accepted|yes)\b/.test(value)
  );
}

function hiddenValue(html: string, name: string): string {
  const forward = html.match(
    new RegExp(
      `<input[^>]*\\bname\\s*=\\s*(?:"${name}"|'${name}')[^>]*\\bvalue\\s*=\\s*(?:"([^"]*)"|'([^']*)')[^>]*>`,
      "i",
    ),
  );
  if (forward) return decodeHtml(forward[1] ?? forward[2] ?? "");
  const reverse = html.match(
    new RegExp(
      `<input[^>]*\\bvalue\\s*=\\s*(?:"([^"]*)"|'([^']*)')[^>]*\\bname\\s*=\\s*(?:"${name}"|'${name}')[^>]*>`,
      "i",
    ),
  );
  return decodeHtml(reverse?.[1] ?? reverse?.[2] ?? "");
}

/** Read a BuddyPress success, error, or warning notice from a page. */
export function parseInvitationFeedback(html: string): InvitationFeedback | null {
  const blocks: string[] = [];
  for (const match of html.matchAll(
    /<div[^>]*\bid\s*=\s*(?:"message"|'message')[^>]*>([\s\S]*?)<\/div>/gi,
  )) {
    blocks.push(match[0]);
  }
  for (const match of html.matchAll(
    /<(?:aside|div)[^>]*\bclass\s*=\s*(?:"[^"]*\bbp-feedback\b[^"]*"|'[^']*\bbp-feedback\b[^']*')[^>]*>([\s\S]*?)<\/(?:aside|div)>/gi,
  )) {
    blocks.push(match[0]);
  }

  for (const block of blocks) {
    const classes = classAttribute(block);
    if (/\binfo\b/i.test(classes) && !/\b(error|success|updated|warning)\b/i.test(classes)) {
      continue;
    }
    const body = block.replace(/^<[^>]*>/, "").replace(/<\/(?:aside|div)>$/, "");
    const message = stripHtml(body);
    if (!message) continue;
    const type = /\b(error|warning|danger)\b/i.test(classes)
      ? "error"
      : /\b(success|updated)\b/i.test(classes)
        ? "success"
        : "info";
    return { type, message };
  }

  return null;
}

/** Parse the Pending Invites table on a BuddyPress invitations screen. */
export function parseInvitationsPage(
  html: string,
  currentPage = 1,
): InvitationsPageData {
  const feedback = parseInvitationFeedback(html);
  const bulkNonce = hiddenValue(html, "invitations_bulk_nonce");

  const table =
    html.match(
      /<table[^>]*\bclass\s*=\s*(?:"[^"]*\binvitations\b[^"]*"|'[^']*\binvitations\b[^']*')[^>]*>([\s\S]*?)<\/table>/i,
    )?.[1] ?? "";

  const invitations: InvitationRow[] = [];
  for (const rowMatch of table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const row = rowMatch[1];
    const id =
      row.match(
        /<input[^>]*\bname\s*=\s*(?:"members_invitations\[\]"|'members_invitations\[\]')[^>]*\bvalue\s*=\s*(?:"([^"]*)"|'([^']*)')/i,
      )?.[1] ??
      row.match(
        /<input[^>]*\bvalue\s*=\s*(?:"([^"]*)"|'([^']*)')[^>]*\bname\s*=\s*(?:"members_invitations\[\]"|'members_invitations\[\]')/i,
      )?.[1] ??
      "";
    if (!id) continue;

    const sentText = stripHtml(cell(row, "invitation-sent"));
    const acceptedText = stripHtml(cell(row, "invitation-accepted"));
    const actionCell = cell(row, "invitation-actions");
    const links = [...actionCell.matchAll(/<a\b[^>]*\bhref\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)]
      .map((match) => decodeHtml(match[1] ?? match[2] ?? ""))
      .filter(Boolean);

    invitations.push({
      id,
      email: stripHtml(cell(row, "invitation-invitee")),
      message: stripHtml(cell(row, "invitation-content")),
      sent: booleanCell(sentText),
      accepted: booleanCell(acceptedText),
      dateModified: stripHtml(cell(row, "invitation-date-modified")),
      resendUrl: links.find((url) => /[?&]action=resend\b/.test(url)),
      cancelUrl: links.find((url) => /[?&]action=cancel\b/.test(url)),
    });
  }

  const countText = stripHtml(
    html.match(
      /<div[^>]*\bid\s*=\s*(?:"invitations-count-top"|'invitations-count-top'|"invitations-count-bottom"|'invitations-count-bottom')[^>]*>([\s\S]*?)<\/div>/i,
    )?.[1] ?? "",
  );
  const totalMatch = countText.match(/\bof\s+([\d,]+)\s+invitation/i);
  const total = totalMatch ? Number(totalMatch[1].replace(/,/g, "")) : null;

  const pages = [...html.matchAll(/[?&]ipage=(\d+)/gi)]
    .map((match) => Number(match[1]))
    .filter((value) => Number.isFinite(value) && value > currentPage);
  const nextPage = pages.length > 0 ? Math.min(...pages) : null;

  return { invitations, bulkNonce, total, nextPage, feedback };
}

/** Parse the Send Invites form and its nonce. */
export function parseSendInvitePage(html: string): SendInvitePageData {
  const form =
    html.match(
      /<form[^>]*\bid\s*=\s*(?:"network-invitation-form"|'network-invitation-form')[^>]*>([\s\S]*?)<\/form>/i,
    )?.[1] ??
    html.match(
      /<form[^>]*>([\s\S]*?\bname\s*=\s*(?:"invitee_email"|'invitee_email')[\s\S]*?)<\/form>/i,
    )?.[1] ??
    "";

  const fields: Record<string, string> = {};
  for (const input of form.matchAll(/<input\b[^>]*>/gi)) {
    const tag = input[0];
    if (!/\btype\s*=\s*(?:"hidden"|'hidden')/i.test(tag)) continue;
    const name = attribute(tag, "name");
    if (!name) continue;
    fields[name] = attribute(tag, "value") ?? "";
  }

  const nonce = fields._wpnonce || hiddenValue(html, "_wpnonce");

  return {
    allowed: /\bname\s*=\s*(?:"invitee_email"|'invitee_email')/i.test(form),
    nonce,
    fields,
    feedback: parseInvitationFeedback(html),
  };
}

/** Parse accepted-invitation notifications from a BuddyPress notifications page. */
export function parseNotificationsPage(
  html: string,
  currentPage = 1,
): NotificationsPageData {
  const feedback = parseInvitationFeedback(html);
  const table =
    html.match(
      /<table[^>]*\bclass\s*=\s*(?:"[^"]*\bnotifications\b[^"]*"|'[^']*\bnotifications\b[^']*')[^>]*>([\s\S]*?)<\/table>/i,
    )?.[1] ?? "";

  const accepted: AcceptedInvitation[] = [];
  for (const rowMatch of table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const row = rowMatch[1];
    const description = cell(row, "notification-description");
    if (!description) continue;

    const link = description.match(
      /<a\b[^>]*\bhref\s*=\s*(?:"([^"]*)"|'([^']*)')[^>]*>([\s\S]*?)<\/a>/i,
    );
    if (!link) continue;

    const href = decodeHtml(link[1] ?? link[2] ?? "");
    if (!/[?&]welcome=1\b/.test(href)) continue;

    let profileUrl: URL;
    try {
      profileUrl = new URL(href, "https://account.bdsmlr.com");
    } catch {
      continue;
    }
    if (profileUrl.origin !== "https://account.bdsmlr.com") continue;
    const userMatch = profileUrl.pathname.match(/\/members\/([^/]+)/);
    if (!userMatch) continue;

    profileUrl.searchParams.delete("welcome");

    const id =
      row.match(
        /<input[^>]*\bname\s*=\s*(?:"notifications\[\]"|'notifications\[\]')[^>]*\bvalue\s*=\s*(?:"([^"]*)"|'([^']*)')/i,
      )?.[1] ??
      row.match(
        /<input[^>]*\bvalue\s*=\s*(?:"([^"]*)"|'([^']*)')[^>]*\bname\s*=\s*(?:"notifications\[\]"|'notifications\[\]')/i,
      )?.[1] ??
      `${userMatch[1]}-${accepted.length}`;

    const sinceCell = cell(row, "notification-since");
    const dateTitle = attribute(
      sinceCell.match(/<[^>]+>/)?.[0] ?? "",
      "title",
    );

    let userLogin = userMatch[1];
    try {
      userLogin = decodeURIComponent(userLogin);
    } catch {
      // Keep the raw value when it is not valid percent encoding.
    }

    accepted.push({
      id,
      displayName: stripHtml(link[3]) || userLogin,
      userLogin,
      accountProfileUrl: profileUrl.toString(),
      timeSince: stripHtml(sinceCell),
      dateTitle: dateTitle ?? undefined,
    });
  }

  const pages = [...html.matchAll(/[?&]npage=(\d+)/gi)]
    .map((match) => Number(match[1]))
    .filter((value) => Number.isFinite(value) && value > currentPage);
  const nextPage = pages.length > 0 ? Math.min(...pages) : null;

  return { accepted, nextPage, feedback };
}

/** Read the logged-in account-site username from a BuddyPress page. */
export function parseAccountUserLogin(html: string): string | null {
  const canonical =
    html.match(
      /<link[^>]*\brel\s*=\s*(?:"canonical"|'canonical')[^>]*\bhref\s*=\s*(?:"([^"]*)"|'([^']*)')/i,
    )?.[1] ??
    html.match(
      /<link[^>]*\bhref\s*=\s*(?:"([^"]*)"|'([^']*)')[^>]*\brel\s*=\s*(?:"canonical"|'canonical')/i,
    )?.[1] ??
    "";
  const canonicalMatch = canonical.match(/\/members\/([^/?#]+)/);
  if (canonicalMatch) return decodeURIComponent(canonicalMatch[1]);

  const adminBar = html.match(
    /id\s*=\s*(?:"wp-admin-bar-my-account"|'wp-admin-bar-my-account')[\s\S]*?href\s*=\s*(?:"([^"]*\/members\/([^/?#]+)\/)"|'([^']*\/members\/([^/?#]+)\/)')/i,
  );
  if (adminBar) {
    const name = adminBar[2] ?? adminBar[4];
    if (name) return decodeURIComponent(name);
  }

  const loggedIn = html.match(
    /class\s*=\s*(?:"[^"]*\bbp-logged-in-user\b[^"]*"|'[^']*\bbp-logged-in-user\b[^']*')[^>]*href\s*=\s*(?:"([^"]*\/members\/([^/?#]+)\/)"|'([^']*\/members\/([^/?#]+)\/)')/i,
  );
  if (loggedIn) {
    const name = loggedIn[2] ?? loggedIn[4];
    if (name) return decodeURIComponent(name);
  }

  return null;
}

/** Read the user_login value from a WordPress profile page. */
export function parseProfileUserLogin(html: string): string | null {
  const forward = html.match(
    /<input[^>]*\bid\s*=\s*(?:"user_login"|'user_login')[^>]*\bvalue\s*=\s*(?:"([^"]*)"|'([^']*)')/i,
  );
  if (forward) return decodeHtml(forward[1] ?? forward[2] ?? "");
  const reverse = html.match(
    /<input[^>]*\bvalue\s*=\s*(?:"([^"]*)"|'([^']*)')[^>]*\bid\s*=\s*(?:"user_login"|'user_login')/i,
  );
  if (reverse) return decodeHtml(reverse[1] ?? reverse[2] ?? "");
  return parseAccountUserLogin(html);
}

/** Whether a login page is protected by Cloudflare Turnstile. */
export function hasTurnstile(html: string): boolean {
  return /cf-turnstile|challenges\.cloudflare\.com\/turnstile/i.test(html);
}

/** Read the WordPress login error message, if any. */
export function parseLoginError(html: string): string {
  const block = html.match(
    /<div[^>]*\bid\s*=\s*(?:"login_error"|'login_error')[^>]*>([\s\S]*?)<\/div>/i,
  )?.[1];
  return block ? stripHtml(block) : "";
}
