---
name: update-ai-costs
description: Use when refreshing the landing page AI spend tally, including the total cost, OpenCode session count, as-of date, or the primary model sentence. Trigger phrases include "update AI costs", "AI spend", "landing page costs", and edits to `AI_COST` in `src/routes/index.tsx`.
---

# Update the landing page AI spend tally

The landing page reads the `AI_COST` constant in `src/routes/index.tsx`. Update
that constant and, if needed, the primary model sentence in the same section.
The numbers come from the local OpenCode database.

## 1. Read the usage totals

Run this from the repository root so `$PWD` matches the project worktree.

```sh
opencode db --format json "select count(*) as sessions, round(sum(cost), 2) as total from session where project_id in (select id from project where worktree = '$PWD')"
```

Cross-check with OpenCode's own summary:

```sh
opencode stats --project '' --models
```

`opencode stats` may round the total slightly differently. Prefer the database
value for `AI_COST`.

### Notes on the data

- If the repository appears more than once, use the project row whose
  `worktree` is the repository root.
- The landing page does not show a per-model breakdown. Do not add one.
- The section copy names the model used for most work. It currently says
  "primarily using DeepSeek V4.1 Flash". Change that sentence only if the
  primary model actually changes.

## 2. Update `AI_COST`

Search for `const AI_COST` in `src/routes/index.tsx`.

Set:

- `total`: the rounded total cost.
- `sessions`: the total session count.
- `asOf`: today's date in `Month D, YYYY` form. Get it with:

  ```sh
  date +"%B %-d, %Y"
  ```

Before saving, check:

- The total matches the database.
- The session count matches the database.
- The date is current.

## 3. Verify

Run:

```sh
pnpm build
```

Then open `/` while signed out and check that the AI spend section renders the
new numbers. Do not change the surrounding markup, styles, or copy unless the
task also asks for that.

## 4. Commit and changelog

If asked to commit, use a conventional commit such as:

```text
chore: update landing AI spend tally
```

Routine number refreshes do not need a changelog entry. Add one to
`src/lib/changelog.ts` only when the computation, labels, or presentation of
the tally changes.
