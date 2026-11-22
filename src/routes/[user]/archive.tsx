import { createSignal, For } from "solid-js";
import { useParams } from "@solidjs/router";
import { Title } from "@solidjs/meta";
import { PostType } from "~/lib/api";
import { PostSearchResults } from "~/components/PostSearchResults";
import { PageHeader } from "~/components/Page";
import { Button } from "~/components/ui/button";
import {
  TextField,
  TextFieldInput,
  TextFieldLabel,
} from "~/components/ui/text-field";

const TYPES = [
  { id: PostType.Text, label: "Text" },
  { id: PostType.Image, label: "Image" },
  { id: PostType.Video, label: "Video" },
  { id: PostType.Audio, label: "Audio" },
  { id: PostType.Link, label: "Link" },
  { id: PostType.Chat, label: "Chat" },
  { id: PostType.Quote, label: "Quote" },
];

export default function ArchivePage() {
  const params = useParams();
  const name = () => params.user ?? "";
  const [month, setMonth] = createSignal("");
  const [types, setTypes] = createSignal<number[]>([]);

  const query = () => {
    const parts = [`blog:${name()}`];
    if (month()) parts.push(`when:${month()}`);
    return parts.join(" ");
  };

  const toggleType = (type: number) => {
    setTypes((prev) =>
      prev.includes(type)
        ? prev.filter((value) => value !== type)
        : [...prev, type],
    );
  };

  return (
    <>
      <Title>{name()} archive - bbdsmlr</Title>
      <main class="mx-auto flex w-full max-w-2xl flex-1 flex-col px-3 py-4 sm:px-4">
        <PageHeader title="Archive" />
        <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-4">
          <TextField
            class="w-full gap-1.5 sm:w-auto sm:max-w-56"
            value={month()}
            onChange={setMonth}
          >
            <TextFieldLabel>Month</TextFieldLabel>
            <TextFieldInput type="month" class="h-11 md:h-9" />
          </TextField>
          <div
            class="flex flex-wrap gap-2"
            role="group"
            aria-label="Filter by post type"
          >
            <Button
              type="button"
              size="sm"
              variant={types().length === 0 ? "default" : "outline"}
              class="h-11 rounded-full px-4 text-xs sm:h-9 sm:px-3"
              onClick={() => setTypes([])}
            >
              All
            </Button>
            <For each={TYPES}>
              {(type) => (
                <Button
                  type="button"
                  size="sm"
                  variant={
                    types().includes(type.id) ? "default" : "outline"
                  }
                  class="h-11 rounded-full px-4 text-xs sm:h-9 sm:px-3"
                  onClick={() => toggleType(type.id)}
                  aria-pressed={types().includes(type.id)}
                >
                  {type.label}
                </Button>
              )}
            </For>
          </div>
        </div>
        <PostSearchResults
          query={query()}
          postTypes={types().length > 0 ? types() : undefined}
          variants={[1, 2]}
        />
      </main>
    </>
  );
}
