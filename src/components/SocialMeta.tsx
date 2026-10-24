import { Show } from "solid-js";
import type { SocialPreview } from "~/lib/socialPreview";

export function SocialMeta(props: { meta?: SocialPreview | null }) {
  return (
    <Show when={props.meta}>
      <meta name="description" content={props.meta!.description} />
      <link rel="canonical" href={props.meta!.url} />
      <meta property="og:site_name" content="Better BDSMLR" />
      <meta property="og:type" content={props.meta!.type} />
      <meta property="og:title" content={props.meta!.title} />
      <meta property="og:description" content={props.meta!.description} />
      <meta property="og:url" content={props.meta!.url} />
      <meta property="og:image" content={props.meta!.image} />
      <meta property="og:image:alt" content={props.meta!.title} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={props.meta!.title} />
      <meta name="twitter:description" content={props.meta!.description} />
      <meta name="twitter:image" content={props.meta!.image} />
    </Show>
  );
}
