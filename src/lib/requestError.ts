import { FetchError, NETWORK_ERROR_CODE } from "./api";
import { isPrivateBlogError } from "./blogErrors";
import { LegacyError } from "./legacy";

/**
 * Turns whatever a request threw into copy a person can act on. The most
 * important distinction is that a rate limit is BDSMLR telling us to slow
 * down, not this site being broken and not a blog being corrupt.
 */

export type RequestErrorKind =
  | "rate_limited"
  | "auth"
  | "private"
  | "not_found"
  | "server"
  | "network"
  | "unknown";

export interface RequestErrorInfo {
  kind: RequestErrorKind;
  title: string;
  message: string;
  retryable: boolean;
  status?: number;
}

function statusOf(error: unknown): number | undefined {
  if (error instanceof FetchError || error instanceof LegacyError) {
    return error.status;
  }
  const record = error as { status?: unknown } | null;
  if (record && typeof record.status === "number") return record.status;
  return undefined;
}

function codeOf(error: unknown): string | undefined {
  const record = error as { code?: unknown } | null;
  if (record && typeof record.code === "string") return record.code;
  return undefined;
}

function messageOf(error: unknown): string {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  return "";
}

const RATE_LIMITED: Omit<RequestErrorInfo, "status"> = {
  kind: "rate_limited",
  title: "BDSMLR is limiting requests",
  message:
    "This is not a problem with this site or with this blog. BDSMLR is refusing new requests for a minute or two, then everything loads again. Wait a moment, then try again.",
  retryable: true,
};

const PRIVATE: Omit<RequestErrorInfo, "status"> = {
  kind: "private",
  title: "This blog is not available",
  message:
    "BDSMLR says this blog is private or no longer exists, so it cannot be shown here. If this is your blog, sign in and try again.",
  retryable: false,
};

const SERVER: Omit<RequestErrorInfo, "status"> = {
  kind: "server",
  title: "BDSMLR is having trouble",
  message:
    "BDSMLR's servers returned an error for this request. That usually clears up on its own, so try again in a moment.",
  retryable: true,
};

const NETWORK: Omit<RequestErrorInfo, "status"> = {
  kind: "network",
  title: "Could not reach BDSMLR",
  message:
    "The request did not get through. Check your connection and try again.",
  retryable: true,
};

const AUTH: Omit<RequestErrorInfo, "status"> = {
  kind: "auth",
  title: "Sign in to continue",
  message: "BDSMLR needs an active session for this. Sign in and try again.",
  retryable: false,
};

const UNKNOWN: Omit<RequestErrorInfo, "status"> = {
  kind: "unknown",
  title: "Something went wrong",
  message: "The request could not be completed. Try again in a moment.",
  retryable: true,
};

export function describeRequestError(
  error: unknown,
  options: { title?: string } = {},
): RequestErrorInfo {  const status = statusOf(error);
  const code = codeOf(error);
  const rawMessage = messageOf(error);

  let info: RequestErrorInfo;

  if (status === 429 || code === "UPSTREAM_RATE_LIMITED") {
    info = { ...RATE_LIMITED };
  } else if (
    status === 0 ||
    code === NETWORK_ERROR_CODE ||
    /failed to fetch|load failed|networkerror/i.test(rawMessage)
  ) {
    info = { ...NETWORK };
  } else if (isPrivateBlogError(rawMessage)) {
    info = { ...PRIVATE };
  } else if (status === 401) {
    info = { ...AUTH };
  } else if (status !== undefined && status >= 500) {
    info = { ...SERVER };
  } else if (status === 404) {
    info = {
      kind: "not_found",
      title: "Not found",
      message: "BDSMLR could not find what was requested.",
      retryable: false,
    };
  } else {
    info = { ...UNKNOWN };
    // Keep BDSMLR's own wording when there is some, it is often specific
    // enough to be useful ("Blog was banned", "post not found").
    if (rawMessage) info.message = rawMessage;
  }

  if (status !== undefined) info.status = status;
  if (options.title) info.title = options.title;
  return info;
}

/**
 * Many surfaces only keep the message string, not the thrown error. This lets
 * them still recognise a rate limit and show the reassuring explanation.
 */
export function isRateLimitMessage(message: string | null | undefined): boolean {
  if (!message) return false;
  return /rate.?limit|too many requests|temporarily blocked|slow down/i.test(
    message,
  );
}
