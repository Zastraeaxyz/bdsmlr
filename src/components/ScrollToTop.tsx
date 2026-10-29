import { createEffect, createSignal, onCleanup, onMount, Show } from "solid-js";
import { useLocation } from "@solidjs/router";

const FEED_SELECTOR = ".feed, .blog-card-grid";
const SHOW_AFTER = 400;

export function ScrollToTop() {
  const location = useLocation();
  const [visible, setVisible] = createSignal(false);

  const update = () => {
    if (typeof window === "undefined") return;
    setVisible(
      window.scrollY > SHOW_AFTER &&
        document.querySelector(FEED_SELECTOR) !== null,
    );
  };

  onMount(() => {
    update();
    window.addEventListener("scroll", update, { passive: true });
    const observer = new MutationObserver(update);
    observer.observe(document.body, { childList: true, subtree: true });
    onCleanup(() => {
      window.removeEventListener("scroll", update);
      observer.disconnect();
    });
  });

  createEffect(() => {
    location.pathname;
    queueMicrotask(update);
  });

  return (
    <Show when={visible()}>
      <button
        type="button"
        class="scroll-to-top"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="Scroll back to top"
        title="Back to top"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width={2}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M4.5 15.75 12 8.25l7.5 7.5"
          />
        </svg>
      </button>
    </Show>
  );
}
