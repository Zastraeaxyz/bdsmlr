import { createSignal, For, Show } from "solid-js";
import { History, Trash2, X } from "lucide-solid";
import { Button } from "./ui/button";
import {
  Popover,
  PopoverContent,
  PopoverPortal,
  PopoverTrigger,
} from "./ui/popover";

interface SearchHistoryProps {
  entries: string[];
  onSelect: (query: string) => void;
  onDelete: (query: string) => void;
}

export default function SearchHistory(props: SearchHistoryProps) {
  const [open, setOpen] = createSignal(false);
  const [armDelete, setArmDelete] = createSignal<string | null>(null);

  const close = () => {
    setOpen(false);
    setArmDelete(null);
  };

  const handleItemClick = (query: string) => {
    if (armDelete() === query) {
      setArmDelete(null);
      return;
    }
    props.onSelect(query);
    close();
  };

  const handleDeleteClick = (event: MouseEvent, query: string) => {
    event.stopPropagation();
    if (armDelete() === query) {
      props.onDelete(query);
      setArmDelete(null);
    } else {
      setArmDelete(query);
    }
  };

  return (
    <Popover open={open()} onOpenChange={setOpen}>
      <PopoverTrigger<typeof Button>
        as={(triggerProps) => (
          <Button
            {...triggerProps}
            type="button"
            variant="ghost"
            size="icon"
            class="size-9 shrink-0"
            aria-label="Search history"
          >
            <History class="size-4" />
          </Button>
        )}
      />
      <PopoverPortal>
        <PopoverContent class="w-72 p-2">
          <Show
            when={props.entries.length > 0}
            fallback={
              <p class="px-2 py-3 text-sm text-muted-foreground">
                No search history yet.
              </p>
            }
          >
            <For each={props.entries}>
              {(query) => (
                <div class="flex items-center gap-1 rounded-md hover:bg-accent">
                  <button
                    type="button"
                    class="min-w-0 flex-1 px-2 py-2 text-left text-sm"
                    onClick={() => handleItemClick(query)}
                  >
                    <span class="block truncate">{query}</span>
                  </button>
                  <Button
                    type="button"
                    variant={armDelete() === query ? "destructive" : "ghost"}
                    size="sm"
                    class="mr-1 h-7 shrink-0 px-2"
                    aria-label={
                      armDelete() === query ? "Confirm delete" : "Delete entry"
                    }
                    onClick={(event) => handleDeleteClick(event, query)}
                  >
                    <Show
                      when={armDelete() === query}
                      fallback={<Trash2 class="size-3.5" />}
                    >
                      Delete
                    </Show>
                  </Button>
                </div>
              )}
            </For>
          </Show>
          <div class="mt-1 flex justify-end border-t pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              class="h-7 text-xs"
              onClick={close}
            >
              <X class="size-3.5" /> Close
            </Button>
          </div>
        </PopoverContent>
      </PopoverPortal>
    </Popover>
  );
}
