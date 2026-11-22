import { For, Show } from "solid-js";
import { ArrowUpDown, Check } from "lucide-solid";
import { SortField, SortOrder } from "~/lib/api";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface SortOption {
  field: number;
  order: number;
  label: string;
  value: string;
}

const ALL_OPTIONS: SortOption[] = [
  { field: SortField.Date, order: SortOrder.Descending, label: "Newest", value: "1-2" },
  { field: SortField.Date, order: SortOrder.Ascending, label: "Oldest", value: "1-1" },
  { field: SortField.Popularity, order: SortOrder.Descending, label: "Most popular", value: "6-2" },
  { field: SortField.Popularity, order: SortOrder.Ascending, label: "Least popular", value: "6-1" },
  { field: SortField.Likes, order: SortOrder.Descending, label: "Most liked", value: "2-2" },
  { field: SortField.Comments, order: SortOrder.Descending, label: "Most commented", value: "3-2" },
  { field: SortField.Reblogs, order: SortOrder.Descending, label: "Most reblogged", value: "4-2" },
];

export function sortOptionLabel(field: number, order: number): string {
  const value = `${field}-${order}`;
  return ALL_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export interface SortDropdownProps {
  value: string;
  onChange: (field: number, order: number) => void;
  options?: {
    newest?: boolean;
    oldest?: boolean;
    mostPopular?: boolean;
    leastPopular?: boolean;
    mostLiked?: boolean;
    mostCommented?: boolean;
    mostReblogged?: boolean;
  };
}

export default function SortDropdown(props: SortDropdownProps) {
  const enabledMap = () => {
    const opts = props.options ?? {};
    return {
      newest: opts.newest ?? true,
      oldest: opts.oldest ?? true,
      mostPopular: opts.mostPopular ?? false,
      leastPopular: opts.leastPopular ?? false,
      mostLiked: opts.mostLiked ?? false,
      mostCommented: opts.mostCommented ?? false,
      mostReblogged: opts.mostReblogged ?? false,
    };
  };

  const availableOptions = () => {
    const map = enabledMap();
    return ALL_OPTIONS.filter((o) => {
      if (o.value === "1-2") return map.newest;
      if (o.value === "1-1") return map.oldest;
      if (o.value === "6-2") return map.mostPopular;
      if (o.value === "6-1") return map.leastPopular;
      if (o.value === "2-2") return map.mostLiked;
      if (o.value === "3-2") return map.mostCommented;
      if (o.value === "4-2") return map.mostReblogged;
      return false;
    });
  };

  const currentLabel = () => {
    const found = ALL_OPTIONS.find((o) => o.value === props.value);
    return found?.label ?? "Sort";
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger<typeof Button>
        as={(triggerProps) => (
          <Button
            {...triggerProps}
            variant="outline"
            size="sm"
            class="gap-2"
            aria-label={`Sort: ${currentLabel()}`}
          >
            <ArrowUpDown class="size-4" />
            <span class="max-w-32 truncate">{currentLabel()}</span>
          </Button>
        )}
      />
      <DropdownMenuPortal>
        <DropdownMenuContent class="w-48">
          <For each={availableOptions()}>
            {(option) => (
              <DropdownMenuItem
                onSelect={() => props.onChange(option.field, option.order)}
              >
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
