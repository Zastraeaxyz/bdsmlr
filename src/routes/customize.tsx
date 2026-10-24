import { createEffect, createSignal, For, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { Title } from "@solidjs/meta";
import Header from "~/components/Header";
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
          ? "BDSMLR temporarily blocked the request. Wait a moment and try again."
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
      <Title>Customize blog - bbdsmlr</Title>
      <div class="home-page">
        <Header info="Customize blog" />
        <main>
          <h2 class="social-list-title">
            Customize {activeBlog()?.name ? `@${activeBlog()!.name}` : "blog"}
          </h2>
          {error() && <p class="error">{error()}</p>}
          {notice() && <p class="action-notice">{notice()}</p>}
          {loading() && <p class="loading">Loading customization…</p>}
          <Show when={!loading() && data()}>
            <form class="customize-form" onSubmit={save}>
              <section class="compose-card">
                <h3 class="customize-heading">Basics</h3>
                <label class="compose-field">
                  <span>Title</span>
                  <input
                    type="text"
                    value={value("title")}
                    onInput={(e) => setField("title", e.currentTarget.value)}
                  />
                </label>
                <label class="compose-field">
                  <span>Description</span>
                  <textarea
                    rows={5}
                    value={value("description")}
                    onInput={(e) =>
                      setField("description", e.currentTarget.value)
                    }
                  />
                </label>
                <div class="customize-two">
                  <label class="compose-field">
                    <span>Theme</span>
                    <select
                      value={value("Style")}
                      onChange={(e) => setField("Style", e.currentTarget.value)}
                    >
                      <For each={THEMES}>
                        {(theme) => (
                          <option value={theme.value}>{theme.label}</option>
                        )}
                      </For>
                    </select>
                  </label>
                  <label class="compose-field">
                    <span>Font</span>
                    <select
                      value={value("font")}
                      onChange={(e) => setField("font", e.currentTarget.value)}
                    >
                      <For each={FONTS}>
                        {(font) => (
                          <option value={font.value}>{font.label}</option>
                        )}
                      </For>
                    </select>
                  </label>
                </div>
                <div class="customize-two">
                  <label class="compose-field">
                    <span>Avatar shape</span>
                    <select
                      value={value("avatar_shape")}
                      onChange={(e) =>
                        setField("avatar_shape", e.currentTarget.value)
                      }
                    >
                      <option value="square">Square</option>
                      <option value="round">Round</option>
                    </select>
                  </label>
                </div>
              </section>

              <section class="compose-card">
                <h3 class="customize-heading">Colors</h3>
                <div class="customize-colors">
                  <For each={COLORS}>
                    {(color) => (
                      <label class="compose-field">
                        <span>{color[1]}</span>
                        <input
                          type="text"
                          value={value(color[0])}
                          onInput={(e) =>
                            setField(color[0], e.currentTarget.value)
                          }
                        />
                      </label>
                    )}
                  </For>
                </div>
              </section>

              <section class="compose-card">
                <h3 class="customize-heading">Images</h3>
                <div class="customize-two">
                  <div class="compose-field">
                    <span>Avatar</span>
                    <Show when={value("avatar")}>
                      <img
                        class="customize-avatar"
                        src={previewUrl(value("avatar"))}
                        alt=""
                      />
                    </Show>
                    <input
                      ref={avatarInput}
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.currentTarget.files?.[0];
                        if (file) void uploadAvatar(file);
                      }}
                    />
                  </div>
                  <div class="compose-field">
                    <span>Header background</span>
                    <Show when={value("header_background")}>
                      <img
                        class="customize-header"
                        src={previewUrl(value("header_background"))}
                        alt=""
                      />
                    </Show>
                    <input
                      ref={headerInput}
                      type="file"
                      accept="image/*"
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
                <div class="compose-field">
                  <span>Blog background</span>
                  <input
                    ref={backgroundInput}
                    type="file"
                    accept="image/*"
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
              </section>

              <section class="compose-card">
                <h3 class="customize-heading">Display</h3>
                <div class="customize-checks">
                  <label>
                    <input
                      type="checkbox"
                      checked={checked("date")}
                      onChange={(e) => setField("date", e.currentTarget.checked)}
                    />
                    Show dates
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={checked("hideavatar")}
                      onChange={(e) =>
                        setField("hideavatar", e.currentTarget.checked)
                      }
                    />
                    Hide avatar
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={checked("header_photo")}
                      onChange={(e) =>
                        setField("header_photo", e.currentTarget.checked)
                      }
                    />
                    Show header photo
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={checked("headerwidth")}
                      onChange={(e) =>
                        setField("headerwidth", e.currentTarget.checked)
                      }
                    />
                    Full width header
                  </label>
                </div>
              </section>

              <section class="compose-card">
                <h3 class="customize-heading">Interests</h3>
                <div class="customize-checks customize-interests">
                  <For each={INTERESTS}>
                    {(interest) => (
                      <label>
                        <input
                          type="checkbox"
                          checked={checked(interest[0])}
                          onChange={(e) =>
                            setField(interest[0], e.currentTarget.checked)
                          }
                        />
                        {interest[1]}
                      </label>
                    )}
                  </For>
                </div>
              </section>

              <div class="compose-actions">
                <button type="submit" disabled={busy() !== ""}>
                  {busy() === "save" ? "Saving…" : "Save customization"}
                </button>
              </div>
            </form>
          </Show>
        </main>
      </div>
    </Show>
  );
}
