import { getRequestEvent, isServer } from "solid-js/web";

export function serverRenderedAuthed(): boolean {
  if (isServer) {
    const event = getRequestEvent() as
      | { locals?: { authed?: boolean } }
      | undefined;
    return event?.locals?.authed === true;
  }
  if (typeof document === "undefined") return false;
  return document.documentElement.dataset.authed === "true";
}
