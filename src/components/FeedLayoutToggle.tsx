import { createSignal, For, Show, onCleanup, onMount } from "solid-js";
import { ListIcon, GridIcon } from "~/components/Icons";
import type { FeedLayout } from "~/lib/feedLayout";

interface FeedLayoutToggleProps {
  value: FeedLayout;
  onChange: (layout: FeedLayout) => void;
}

const OPTIONS: { value: FeedLayout; label: string; icon: typeof ListIcon }[] = [
  { value: "list", label: "List view", icon: ListIcon },
  { value: "grid", label: "Grid view", icon: GridIcon },
];

export default function FeedLayoutToggle(props: FeedLayoutToggleProps) {
  const [open, setOpen] = createSignal(false);
  let containerRef: HTMLDivElement | undefined;

  const current = () => OPTIONS.find((o) => o.value === props.value) ?? OPTIONS[0];

  const handleSelect = (layout: FeedLayout) => {
    props.onChange(layout);
    setOpen(false);
  };

  const handleClickOutside = (e: MouseEvent) => {
    if (containerRef && !containerRef.contains(e.target as Node)) {
      setOpen(false);
    }
  };

  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
    }
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

  return (
    <div class="sort-dropdown" ref={containerRef}>
      <button
        type="button"
        class="sort-dropdown-trigger feed-layout-trigger"
        onClick={() => setOpen(!open())}
        aria-haspopup="listbox"
        aria-expanded={open()}
        title={current().label}
      >
        <Show when={props.value === "grid"} fallback={<ListIcon />}>
          <GridIcon />
        </Show>
        <span class="sort-dropdown-chevron" aria-hidden="true">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d={open() ? "M2 8L6 4L10 8" : "M2 4L6 8L10 4"}
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </span>
      </button>

      <Show when={open()}>
        <div class="sort-dropdown-menu feed-layout-menu" role="listbox">
          <For each={OPTIONS}>
            {(option) => (
              <button
                type="button"
                class="sort-dropdown-item feed-layout-item"
                classList={{
                  "sort-dropdown-item-active": option.value === props.value,
                }}
                role="option"
                aria-selected={option.value === props.value}
                title={option.label}
                onClick={() => handleSelect(option.value)}
              >
                <option.icon />
              </button>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
