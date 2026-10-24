import { onCleanup, onMount } from "solid-js";

interface AutoLoadMoreProps {
  onLoad: () => void;
  loading: boolean;
  label?: string;
  loadingLabel?: string;
  class?: string;
  style?: string;
  rootMargin?: string;
}

export function AutoLoadMore(props: AutoLoadMoreProps) {
  let button: HTMLButtonElement | undefined;

  onMount(() => {
    if (!button) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) props.onLoad();
      },
      { rootMargin: props.rootMargin ?? "200px 0px" },
    );
    observer.observe(button);
    onCleanup(() => observer.disconnect());
  });

  return (
    <button
      ref={button}
      type="button"
      class={props.class ? `btn-ghost ${props.class}` : "btn-ghost"}
      style={props.style ?? "display:block;margin:24px auto"}
      onClick={props.onLoad}
      disabled={props.loading}
    >
      {props.loading
        ? (props.loadingLabel ?? "Loading more")
        : (props.label ?? "Load more")}
    </button>
  );
}
