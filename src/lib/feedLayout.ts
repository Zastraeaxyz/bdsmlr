export type FeedLayout = "list" | "grid";

export function loadFeedLayout(key: string): FeedLayout {
  if (typeof localStorage === "undefined") return "list";
  return localStorage.getItem(key) === "grid" ? "grid" : "list";
}

export function saveFeedLayout(key: string, layout: FeedLayout) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(key, layout);
}
