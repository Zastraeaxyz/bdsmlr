import { createSignal, For } from "solid-js";
import { useParams } from "@solidjs/router";
import { Title } from "@solidjs/meta";
import { PostType } from "~/lib/api";
import { PostSearchResults } from "~/components/PostSearchResults";

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
      <main>
        <h2 class="social-list-title">Archive</h2>
        <div class="archive-controls">
          <label class="archive-month">
            <span>Month</span>
            <input
              type="month"
              value={month()}
              onInput={(e) => setMonth(e.currentTarget.value)}
            />
          </label>
          <div class="activity-filters">
            <button
              type="button"
              class={types().length === 0 ? "activity-filter active" : "activity-filter"}
              onClick={() => setTypes([])}
            >
              All
            </button>
            <For each={TYPES}>
              {(type) => (
                <button
                  type="button"
                  class={
                    types().includes(type.id)
                      ? "activity-filter active"
                      : "activity-filter"
                  }
                  onClick={() => toggleType(type.id)}
                  aria-pressed={types().includes(type.id)}
                >
                  {type.label}
                </button>
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
