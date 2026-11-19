export interface InvitationsFeedback {
  type: "success" | "error" | "info";
  message: string;
}

export interface AccountSession {
  connected: boolean;
  userLogin?: string;
  loginBlocked?: boolean;
  loginUrl?: string;
  expired?: boolean;
}

export interface Invitation {
  id: string;
  email: string;
  message: string;
  sent: boolean;
  accepted: boolean;
  dateModified: string;
}

export interface AcceptedInvitation {
  id: string;
  displayName: string;
  userLogin: string;
  accountProfileUrl: string;
  timeSince: string;
  dateTitle?: string;
}

export interface InvitationsData {
  session: AccountSession;
  allowed: boolean;
  blockedMessage: string | null;
  invitations: Invitation[];
  total: number | null;
  nextPage: number | null;
  feedback: InvitationsFeedback | null;
  notifications: AcceptedInvitation[];
  notificationsNextPage: number | null;
  notificationsError: string | null;
}

export interface InvitationActionResult {
  ok: boolean;
  message: string;
  type: "success" | "error" | "info";
}

export interface AcceptedInvitationsPage {
  accepted: AcceptedInvitation[];
  nextPage: number | null;
  feedback: InvitationsFeedback | null;
}

export class InvitationsError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code = "upstream_error") {
    super(message);
    this.name = "InvitationsError";
    this.status = status;
    this.code = code;
  }
}

async function invitationRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`/api/invitations${path}`, {
    credentials: "include",
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  const contentType = res.headers.get("content-type") ?? "";
  const data = contentType.includes("application/json")
    ? await res.json().catch(() => null)
    : null;
  if (!res.ok) {
    throw new InvitationsError(
      data?.error || `Invitations request failed with HTTP ${res.status}`,
      res.status,
      data?.code || "upstream_error",
    );
  }
  if (data === null) {
    throw new InvitationsError(
      "The invitations server returned an unexpected response. Refresh and try again.",
      res.status,
      "invalid_response",
    );
  }
  return data as T;
}

function userQuery(user?: string): string {
  return user ? `user=${encodeURIComponent(user)}` : "";
}

export function getInvitationSession(user?: string) {
  const query = userQuery(user);
  return invitationRequest<AccountSession>(`/session${query ? `?${query}` : ""}`);
}

export function getInvitations(
  page = 1,
  notificationsPage = 1,
  user?: string,
) {
  const params = new URLSearchParams({
    page: String(page),
    notificationsPage: String(notificationsPage),
  });
  if (user) params.set("user", user);
  return invitationRequest<InvitationsData>(`?${params.toString()}`);
}

export function getAcceptedInvitations(page = 1, user?: string) {
  const params = new URLSearchParams({ page: String(page) });
  if (user) params.set("user", user);
  return invitationRequest<AcceptedInvitationsPage>(
    `/notifications?${params.toString()}`,
  );
}

export function loginAccountSite(email: string, password: string) {
  return invitationRequest<AccountSession>("/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function connectAccountSite(cookie: string, username: string) {
  return invitationRequest<AccountSession>("/connect", {
    method: "POST",
    body: JSON.stringify({ cookie, username }),
  });
}

export function disconnectAccountSite() {
  return invitationRequest<{ ok: boolean }>("/disconnect", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function sendInvitation(
  email: string,
  message: string,
  username?: string,
) {
  return invitationRequest<InvitationActionResult>("/send", {
    method: "POST",
    body: JSON.stringify({ email, message, username }),
  });
}

export function invitationAction(
  action: "resend" | "cancel",
  ids: string[],
  username?: string,
) {
  return invitationRequest<InvitationActionResult>("/action", {
    method: "POST",
    body: JSON.stringify({ action, ids, username }),
  });
}
