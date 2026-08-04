import { createSignal, For, Show, onMount, onCleanup } from "solid-js";

interface SearchHistoryProps {
  entries: string[];
  onSelect: (query: string) => void;
  onDelete: (query: string) => void;
}

export default function SearchHistory(props: SearchHistoryProps) {
  const [open, setOpen] = createSignal(false);
  const [armDelete, setArmDelete] = createSignal<string | null>(null);
  let containerRef: HTMLSpanElement | undefined;

  const close = () => {
    setOpen(false);
    setArmDelete(null);
  };

  const handleClickOutside = (e: MouseEvent) => {
    if (containerRef && !containerRef.contains(e.target as Node)) {
      close();
    }
  };

  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === "Escape") close();
  };

  onMount(() => {
    if (typeof document === "undefined") return;
    document.addEventListener("click", handleClickOutside);
    document.addEventListener("keydown", handleKeydown);
  });

  onCleanup(() => {
    if (typeof document === "undefined") return;
    document.removeEventListener("click", handleClickOutside);
    document.removeEventListener("keydown", handleKeydown);
  });

  const handleItemClick = (q: string) => {
    if (armDelete() === q) {
      setArmDelete(null);
      return;
    }
    props.onSelect(q);
    close();
  };

  const handleDeleteClick = (e: MouseEvent, q: string) => {
    e.stopPropagation();
    if (armDelete() === q) {
      props.onDelete(q);
      setArmDelete(null);
    } else {
      setArmDelete(q);
    }
  };

  return (
    <span class="search-history" ref={containerRef}>
      <button
        type="button"
        class="search-history-btn"
        onClick={() => setOpen(!open())}
        aria-label="Search history"
        aria-haspopup="listbox"
        aria-expanded={open()}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            d={open() ? "M2 8L6 4L10 8" : "M2 4L6 8L10 4"}
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>

      <Show when={open()}>
        <div class="search-history-dropdown" role="listbox">
          <Show
            when={props.entries.length > 0}
            fallback={
              <p class="search-history-empty">No search history yet.</p>
            }
          >
            <For each={props.entries}>
              {(q) => (
                <div
                  class="search-history-item"
                  classList={{ armed: armDelete() === q }}
                  onClick={() => handleItemClick(q)}
                  role="option"
                >
                  <span class="search-history-query">{q}</span>
                  <button
                    type="button"
                    class="search-history-delete"
                    classList={{ confirm: armDelete() === q }}
                    aria-label={armDelete() === q ? "Confirm delete" : "Delete entry"}
                    onClick={(e) => handleDeleteClick(e, q)}
                  >
                    {armDelete() === q ? "Delete" : "×"}
                  </button>
                </div>
              )}
            </For>
          </Show>
        </div>
      </Show>
    </span>
  );
}
