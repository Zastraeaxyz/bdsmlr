import { createSignal, For } from "solid-js";
import { CircleHelp } from "lucide-solid";
import { Button } from "./ui/button";
import {
  Popover,
  PopoverContent,
  PopoverPortal,
  PopoverTrigger,
} from "./ui/popover";

interface Props {
  onFill: (query: string) => void;
}

const examples = [
  { query: "hello world", desc: "Free text across post text fields and tags." },
  { query: '"exact phrase"', desc: "Phrase search across that same text space." },
  { query: "a & b", desc: "Require both sides explicitly." },
  { query: "a | b", desc: "Use OR explicitly." },
  { query: "-term", desc: "Exclude a term or group with NOT." },
  { query: "(a | b) c", desc: "Parentheses group boolean logic." },
  { query: "post:43110814", desc: "Specific post or origin-post thread." },
  {
    query: "blog:SomeBlog",
    desc: "Posting blog, scoped by Original / Reblog / All controls.",
  },
  { query: "tag:latex", desc: "Exact tag filter." },
  { query: 'tag:"best served hot"', desc: "Exact legacy tag with spaces." },
  { query: "media:image", desc: "Media kind filter. Use | for multiple kinds." },
  { query: "when:2024", desc: "Year filter. Also supports YYYY-MM and YYYY-MM-DD." },
];

export default function SearchHelp(props: Props) {
  const [open, setOpen] = createSignal(false);

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
            aria-label="Search help"
          >
            <CircleHelp class="size-4" />
          </Button>
        )}
      />
      <PopoverPortal>
        <PopoverContent class="max-h-[70vh] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto p-3">
          <p class="text-sm font-semibold">Query syntax</p>
          <p class="mt-1 text-xs text-muted-foreground">
            Tap an example to load it into the query field.
          </p>
          <div class="mt-3 flex flex-col gap-1">
            <For each={examples}>
              {(example) => (
                <button
                  type="button"
                  class="rounded-md px-2 py-2 text-left hover:bg-accent"
                  onClick={() => {
                    props.onFill(example.query);
                    setOpen(false);
                  }}
                >
                  <code class="block text-xs font-semibold text-primary">
                    {example.query}
                  </code>
                  <span class="mt-0.5 block text-xs text-muted-foreground">
                    {example.desc}
                  </span>
                </button>
              )}
            </For>
          </div>
        </PopoverContent>
      </PopoverPortal>
    </Popover>
  );
}
