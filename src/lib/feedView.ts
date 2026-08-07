export type FeedView = "list" | "grid";

const VIEW_KEY = "bdsmlr:feedView";

export function loadFeedView(): FeedView {
  if (typeof localStorage === "undefined") return "list";
  try {
    const v = localStorage.getItem(VIEW_KEY);
    if (v === "grid") return "grid";
    return "list";
  } catch {
    return "list";
  }
}

export function saveFeedView(view: FeedView) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(VIEW_KEY, view);
  } catch {}
}
