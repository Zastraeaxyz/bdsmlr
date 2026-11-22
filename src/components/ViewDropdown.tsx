import { For, Show } from "solid-js";
import { Check, Grid2x2, List } from "lucide-solid";
import type { FeedView } from "~/lib/feedView";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

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
  const currentLabel = () =>
    OPTIONS.find((option) => option.value === props.value)?.label ?? "List";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger<typeof Button>
        as={(triggerProps) => (
          <Button
            {...triggerProps}
            variant="outline"
            size="icon"
            class="size-9"
            aria-label={`View: ${currentLabel()}`}
            title={`View: ${currentLabel()}`}
          >
            <Show when={props.value === "list"} fallback={<Grid2x2 class="size-4" />}>
              <List class="size-4" />
            </Show>
          </Button>
        )}
      />
      <DropdownMenuPortal>
        <DropdownMenuContent class="w-36">
          <For each={OPTIONS}>
            {(option) => (
              <DropdownMenuItem onSelect={() => props.onChange(option.value)}>
                <Show when={option.value === "list"} fallback={<Grid2x2 class="size-4" />}>
                  <List class="size-4" />
                </Show>
                <span class="flex-1">{option.label}</span>
                <Show when={option.value === props.value}>
                  <Check class="size-4 text-primary" />
                </Show>
              </DropdownMenuItem>
            )}
          </For>
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenu>
  );
}
