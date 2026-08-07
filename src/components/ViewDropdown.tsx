import { createSignal, For, Show, onCleanup, onMount } from "solid-js";
import { ListViewIcon, GridViewIcon } from "~/components/Icons";
import type { FeedView } from "~/lib/feedView";

interface ViewOption {
  value: FeedView;
  label: string;
}

const OPTIONS: ViewOption[] = [
  { value: "list", label: "List" },
  { value: "grid", label: "Grid" },
];

export interface ViewDropdownProps {
  value: FeedView;
  onChange: (view: FeedView) => void;
}

export default function ViewDropdown(props: ViewDropdownProps) {
  const [open, setOpen] = createSignal(false);
  let containerRef: HTMLDivElement | undefined;

  const currentLabel = () => {
    const found = OPTIONS.find((o) => o.value === props.value);
    return found?.label ?? "List";
  };

  const handleSelect = (value: FeedView) => {
    props.onChange(value);
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
    <div class="view-dropdown" ref={containerRef}>
      <button
        type="button"
        class="view-dropdown-trigger"
        onClick={() => setOpen(!open())}
        aria-haspopup="listbox"
        aria-expanded={open()}
        aria-label={`View: ${currentLabel()}`}
        title={`View: ${currentLabel()}`}
      >
        <Show when={props.value === "list"} fallback={<GridViewIcon />}>
          <ListViewIcon />
        </Show>
        <span class="view-dropdown-chevron" aria-hidden="true">
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
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
        <div class="view-dropdown-menu" role="listbox">
          <For each={OPTIONS}>
            {(option) => (
              <button
                type="button"
                class="view-dropdown-item"
                classList={{
                  "view-dropdown-item-active": option.value === props.value,
                }}
                role="option"
                aria-selected={option.value === props.value}
                onClick={() => handleSelect(option.value)}
              >
                <Show
                  when={option.value === "list"}
                  fallback={<GridViewIcon />}
                >
                  <ListViewIcon />
                </Show>
                {option.label}
              </button>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
