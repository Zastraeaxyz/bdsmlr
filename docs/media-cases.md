# Media fixture cases

Real BDSMLR posts that expose inconsistent `mediaRepresentation` shapes. Use this list to
re-check the app manually whenever the media selection logic in `src/lib/sanitize.ts` changes.
Each case is covered by a unit test in `src/lib/sanitize.test.ts` (fixtures live in
`src/lib/mediaFixtures.ts`).

Run the tests with:

```sh
pnpm test
```

## How media is chosen

For each `mediaRepresentation.items[i]`:

1. If `original.mimeType` is set, use `original.url`.
2. If `original.mimeType` is null but `original.url` has a **static-image extension**
   (jpg, jpeg, png, webp, bmp, svg, ico, tif, tiff, avif), use `original.url` — the CDN
   serves these as images even when the alternate list exists.
3. Otherwise (gif/video/unknown original extension) prefer the first `alternates[]`
   entry that has both a `url` and a `mimeType`.
4. If nothing matched, use `original.url` as a last resort.

## Cases

| Post | Blog | Expected rendering | Behavior | Test |
| --- | --- | --- | --- | --- |
| [868810857](https://bbdsmlr.vercel.app/Thecagestore/post/868810857) | Thecagestore | video (`<video>`) | `original` is a `.gif` with `mimeType: null`; the two `alternates` are live `video/mp4` URLs. GIFs may be served as `video/mp4`, so the mp4 alternate wins. | `GIF_ORIGINAL_WITH_MP4_ALTERNATES` |
| [873244077](https://bbdsmlr.vercel.app/Thecagestore/post/873244077) | Thecagestore | image (`<img>`) | `original` is a `.webp` with `mimeType: null`; the two `alternates` are `video/mp4` **dead links**. The static-image original must win so the post still displays. | `WEBP_ORIGINAL_WITH_DEAD_MP4_ALTERNATES` |

## Checking after a change

1. `pnpm test` — the pure selection logic must stay green.
2. Open both posts above in the app (feed card and `/post/<id>` page) and confirm each
   renders as the "Expected rendering" column says.
3. Confirm download and RSS media for these posts point at the same primary URL the card uses.
