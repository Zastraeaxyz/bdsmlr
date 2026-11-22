import { createEffect, createSignal, For, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { Title } from "@solidjs/meta";
import { Page, PageHeader } from "~/components/Page";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Checkbox,
  CheckboxControl,
  CheckboxLabel,
} from "~/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectPortal,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  TextField,
  TextFieldInput,
  TextFieldLabel,
  TextFieldTextArea,
} from "~/components/ui/text-field";
import { useAuth } from "~/lib/useAuth";
import { features } from "~/lib/features";
import { FeatureDisabled } from "~/components/FeatureDisabled";
import {
  getBlogCustomization,
  LegacyError,
  saveBlogCustomization,
  uploadCustomization,
  type LegacyCustomization,
} from "~/lib/legacy";

const THEMES = [
  { value: "1", label: "Default" },
  { value: "2", label: "3 posts Grid" },
  { value: "3", label: "Responsive" },
];

const FONTS = [
  { value: "1", label: "Helvetica Neue" },
  { value: "2", label: "Oswald" },
  { value: "3", label: "Montserrat" },
  { value: "4", label: "Lato" },
  { value: "5", label: "Times New Roman" },
  { value: "6", label: "Charm" },
];

const INTERESTS = [
  ["maledom", "Male dom"],
  ["femdom", "Femdom"],
  ["lesbian", "Lesbian"],
  ["gay", "Gay"],
  ["sissy", "Sissy"],
  ["latex", "Latex"],
  ["gifs", "GIFs"],
  ["extreme", "Extreme"],
  ["vanilla", "Vanilla"],
  ["vintage", "Vintage"],
  ["art", "Art"],
  ["quotes", "Quotes"],
  ["funny", "Funny"],
  ["cartoon", "Cartoon"],
  ["hentai", "Hentai"],
  ["journal", "Journal"],
  ["other", "Other"],
] as const;

const COLORS = [
  ["background_color", "Background"],
  ["title_color", "Title"],
  ["description_color", "Description"],
  ["post_bg", "Post background"],
  ["post_text_color", "Post text"],
  ["link_bg", "Links"],
  ["tag_color", "Tags"],
] as const;

type Choice = { value: string; label: string };

function SelectField(props: {
  label: string;
  options: Choice[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Select<Choice>
      options={props.options}
      optionValue="value"
      optionTextValue="label"
      placeholder="Select"
      value={
        props.options.find((option) => option.value === props.value) ?? null
      }
      onChange={(option) => {
        if (option) props.onChange(option.value);
      }}
      itemComponent={(itemProps) => (
        <SelectItem item={itemProps.item}>
          {itemProps.item.rawValue.label}
        </SelectItem>
      )}
    >
      <SelectLabel>{props.label}</SelectLabel>
      <SelectTrigger class="h-11 w-full md:h-9">
        <SelectValue<Choice>>
          {(state) => state.selectedOption()?.label ?? "Select"}
        </SelectValue>
      </SelectTrigger>
      <SelectPortal>
        <SelectContent />
      </SelectPortal>
    </Select>
  );
}

function CheckField(props: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <Checkbox
      class="flex min-h-11 items-center gap-3"
      checked={props.checked}
      onChange={props.onChange}
    >
      <CheckboxControl class="size-5" />
      <CheckboxLabel class="text-sm font-normal">{props.label}</CheckboxLabel>
    </Checkbox>
  );
}

export default function CustomizePage() {
  const navigate = useNavigate();
  const { user, loading: authLoading, activeBlog } = useAuth();
  const [data, setData] = createSignal<LegacyCustomization | null>(null);
  const [fields, setFields] = createSignal<Record<string, string | boolean>>({});
  const [loading, setLoading] = createSignal(true);
  const [busy, setBusy] = createSignal("");
  const [error, setError] = createSignal("");
  const [notice, setNotice] = createSignal("");
  let avatarInput: HTMLInputElement | undefined;
  let headerInput: HTMLInputElement | undefined;
  let backgroundInput: HTMLInputElement | undefined;

  createEffect(() => {
    if (!authLoading() && !user()) navigate("/login", { replace: true });
  });

  const load = async () => {
    const blog = activeBlog();
    if (!blog) return;
    setLoading(true);
    setError("");
    try {
      const result = await getBlogCustomization(blog.name);
      setData(result);
      setFields(result.fields);
    } catch (err: unknown) {
      setError((err as Error)?.message || "Could not load customization");
    } finally {
      setLoading(false);
    }
  };

  createEffect(() => {
    if (authLoading() || !user() || !features.legacyBlogCustomization) return;
    activeBlog()?.name;
    void load();
  });

  const value = (name: string): string => {
    const current = fields()[name];
    return typeof current === "string" ? current : "";
  };

  const previewUrl = (path: string): string => {
    if (!path) return "";
    if (/^https?:\/\//i.test(path)) return path;
    return `https://bdsmlr.com${path.startsWith("/") ? "" : "/"}${path}`;
  };

  const checked = (name: string): boolean => fields()[name] === true;

  const setField = (name: string, next: string | boolean) => {
    setFields((prev) => ({ ...prev, [name]: next }));
  };

  const save = async (e: Event) => {
    e.preventDefault();
    const current = data();
    if (!current || busy()) return;
    setBusy("save");
    setError("");
    setNotice("");
    try {
      await saveBlogCustomization(current.blogId, {
        ...fields(),
        _token: current.csrf,
      });
      setNotice("Blog customization saved.");
    } catch (err: unknown) {
      setError(
        err instanceof LegacyError && err.status === 429
          ? "BDSMLR is rate limiting requests right now. This usually clears in a minute or two."
          : (err as Error)?.message || "Could not save customization",
      );
    } finally {
      setBusy("");
    }
  };

  const uploadAvatar = async (file: File) => {
    const current = data();
    if (!current) return;
    setBusy("avatar");
    setError("");
    try {
      const res = await uploadCustomization(
        "/customizedz/avatar",
        file,
        current.csrf,
        { blog: current.blogId },
      );
      const url = (await res.text()).replace(/^"|"$/g, "");
      setField("avatar", url);
      setNotice("Avatar uploaded.");
    } catch (err: unknown) {
      setError((err as Error)?.message || "Could not upload avatar");
    } finally {
      setBusy("");
      if (avatarInput) avatarInput.value = "";
    }
  };

  const uploadHeader = async (file: File, path: string, field: string) => {
    const current = data();
    if (!current) return;
    setBusy(field);
    setError("");
    try {
      const res = await uploadCustomization(path, file, current.csrf, {
        blog: current.blogId,
      });
      const body = await res.json().catch(() => null);
      const filename = body?.filename;
      if (typeof filename === "string" && filename) setField(field, filename);
      setNotice("Image uploaded.");
    } catch (err: unknown) {
      setError((err as Error)?.message || "Could not upload image");
    } finally {
      setBusy("");
      if (headerInput) headerInput.value = "";
      if (backgroundInput) backgroundInput.value = "";
    }
  };

  if (!features.legacyBlogCustomization) {
    return <FeatureDisabled title="Customize blog" />;
  }

  return (
    <Show when={!authLoading() && user()} fallback={null}>
      <Page info="Customize blog">
        <Title>Customize blog - bbdsmlr</Title>
        <PageHeader
          title={`Customize ${activeBlog()?.name ? `@${activeBlog()!.name}` : "blog"}`}
          description="Theme, colors, images, and what your blog shows."
        />

        <Show when={error()}>
          <Alert variant="destructive" class="mb-3">
            <AlertDescription>{error()}</AlertDescription>
          </Alert>
        </Show>
        <Show when={notice()}>
          <Alert class="mb-3">
            <AlertDescription>{notice()}</AlertDescription>
          </Alert>
        </Show>
        <Show when={loading()}>
          <p class="text-sm text-muted-foreground">Loading customization…</p>
        </Show>

        <Show when={!loading() && data()}>
          <form class="flex flex-col gap-3 pb-6" onSubmit={save}>
            <Card class="gap-4">
              <CardHeader>
                <CardTitle>Basics</CardTitle>
              </CardHeader>
              <CardContent class="flex flex-col gap-3">
                <TextField
                  value={value("title")}
                  onChange={(next) => setField("title", next)}
                >
                  <TextFieldLabel>Title</TextFieldLabel>
                  <TextFieldInput type="text" class="h-11 md:h-9" />
                </TextField>
                <TextField
                  value={value("description")}
                  onChange={(next) => setField("description", next)}
                >
                  <TextFieldLabel>Description</TextFieldLabel>
                  <TextFieldTextArea rows={5} />
                </TextField>
                <div class="grid gap-3 sm:grid-cols-2">
                  <SelectField
                    label="Theme"
                    options={THEMES}
                    value={value("Style")}
                    onChange={(next) => setField("Style", next)}
                  />
                  <SelectField
                    label="Font"
                    options={FONTS}
                    value={value("font")}
                    onChange={(next) => setField("font", next)}
                  />
                </div>
                <div class="grid gap-3 sm:grid-cols-2">
                  <SelectField
                    label="Avatar shape"
                    options={[
                      { value: "square", label: "Square" },
                      { value: "round", label: "Round" },
                    ]}
                    value={value("avatar_shape")}
                    onChange={(next) => setField("avatar_shape", next)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card class="gap-4">
              <CardHeader>
                <CardTitle>Colors</CardTitle>
              </CardHeader>
              <CardContent class="grid gap-3 sm:grid-cols-2">
                <For each={COLORS}>
                  {(color) => (
                    <TextField
                      value={value(color[0])}
                      onChange={(next) => setField(color[0], next)}
                    >
                      <TextFieldLabel>{color[1]}</TextFieldLabel>
                      <TextFieldInput type="text" class="h-11 md:h-9" />
                    </TextField>
                  )}
                </For>
              </CardContent>
            </Card>

            <Card class="gap-4">
              <CardHeader>
                <CardTitle>Images</CardTitle>
              </CardHeader>
              <CardContent class="flex flex-col gap-4">
                <div class="grid gap-4 sm:grid-cols-2">
                  <div class="flex flex-col gap-2">
                    <span class="text-sm font-medium">Avatar</span>
                    <Show when={value("avatar")}>
                      <img
                        class="size-20 rounded-xl border border-border object-cover"
                        src={previewUrl(value("avatar"))}
                        alt=""
                      />
                    </Show>
                    <input
                      ref={avatarInput}
                      type="file"
                      accept="image/*"
                      aria-label="Avatar"
                      class="block w-full text-sm text-muted-foreground file:mr-3 file:h-11 file:cursor-pointer file:rounded-md file:border-0 file:bg-secondary file:px-4 file:text-sm file:font-medium file:text-secondary-foreground hover:file:bg-secondary/80"
                      onChange={(e) => {
                        const file = e.currentTarget.files?.[0];
                        if (file) void uploadAvatar(file);
                      }}
                    />
                  </div>
                  <div class="flex flex-col gap-2">
                    <span class="text-sm font-medium">Header background</span>
                    <Show when={value("header_background")}>
                      <img
                        class="h-24 w-full rounded-lg border border-border object-cover"
                        src={previewUrl(value("header_background"))}
                        alt=""
                      />
                    </Show>
                    <input
                      ref={headerInput}
                      type="file"
                      accept="image/*"
                      aria-label="Header background"
                      class="block w-full text-sm text-muted-foreground file:mr-3 file:h-11 file:cursor-pointer file:rounded-md file:border-0 file:bg-secondary file:px-4 file:text-sm file:font-medium file:text-secondary-foreground hover:file:bg-secondary/80"
                      onChange={(e) => {
                        const file = e.currentTarget.files?.[0];
                        if (file)
                          void uploadHeader(
                            file,
                            `/customizesave/backgroundhd/${data()!.blogId}`,
                            "header_background",
                          );
                      }}
                    />
                  </div>
                </div>
                <div class="flex flex-col gap-2">
                  <span class="text-sm font-medium">Blog background</span>
                  <input
                    ref={backgroundInput}
                    type="file"
                    accept="image/*"
                    aria-label="Blog background"
                    class="block w-full text-sm text-muted-foreground file:mr-3 file:h-11 file:cursor-pointer file:rounded-md file:border-0 file:bg-secondary file:px-4 file:text-sm file:font-medium file:text-secondary-foreground hover:file:bg-secondary/80"
                    onChange={(e) => {
                      const file = e.currentTarget.files?.[0];
                      if (file)
                        void uploadHeader(
                          file,
                          `/customizesave/background/${data()!.blogId}`,
                          "blog_header_background",
                        );
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card class="gap-4">
              <CardHeader>
                <CardTitle>Display</CardTitle>
              </CardHeader>
              <CardContent class="flex flex-col gap-1">
                <CheckField
                  label="Show dates"
                  checked={checked("date")}
                  onChange={(next) => setField("date", next)}
                />
                <CheckField
                  label="Hide avatar"
                  checked={checked("hideavatar")}
                  onChange={(next) => setField("hideavatar", next)}
                />
                <CheckField
                  label="Show header photo"
                  checked={checked("header_photo")}
                  onChange={(next) => setField("header_photo", next)}
                />
                <CheckField
                  label="Full width header"
                  checked={checked("headerwidth")}
                  onChange={(next) => setField("headerwidth", next)}
                />
              </CardContent>
            </Card>

            <Card class="gap-4">
              <CardHeader>
                <CardTitle>Interests</CardTitle>
              </CardHeader>
              <CardContent class="grid gap-1 sm:grid-cols-2">
                <For each={INTERESTS}>
                  {(interest) => (
                    <CheckField
                      label={interest[1]}
                      checked={checked(interest[0])}
                      onChange={(next) => setField(interest[0], next)}
                    />
                  )}
                </For>
              </CardContent>
            </Card>

            <div class="flex justify-end">
              <Button
                type="submit"
                class="h-11 md:h-9 w-full sm:w-auto"
                disabled={busy() !== ""}
              >
                {busy() === "save" ? "Saving…" : "Save customization"}
              </Button>
            </div>
          </form>
        </Show>
      </Page>
    </Show>
  );
}
