# Contributing

Thank you for helping expand the OHCA Survivorship Repository. This document explains the data pipeline and the manual workflows that keep the repository consistent and privacy-preserving.

## Data standards

- All records must validate against [`data/papers.schema.json`](data/papers.schema.json).
- `data/papers.json` stores the canonical source supplied by editors.
- `data/papers.normalized.json` is generated via `npm run normalize` and powers the site build.
- Keep abstracts free of personally identifiable information and avoid embedding analytics scripts.

## Preparing additions

1. Collect records from your ad-hoc database searches (PubMed, CrossRef, institutional databases, etc.).
2. Paste the harvested rows into [`/admin/ingest.html`](public/admin/ingest.html). The tool validates against the schema, highlights duplicates, and exports `papers.to-merge.json`.
3. Run `npm run merge data/papers.to-merge.json` to append new items to `data/papers.json`.
4. Remove `papers.to-merge.json` after merging. It should not be committed.

## Bi-monthly (or ad-hoc) update

1. Ensure your working tree is clean and synchronized with `main`.
2. Follow the “Preparing additions” steps above.
3. Run `npm run prep:update` (alias for `npm run validate && npm run normalize`).
4. Execute `npm run build` locally to confirm the site compiles.
5. Update documentation or notes as needed.
6. Commit your changes and push to a feature branch.
7. Dispatch the “Manual Update” workflow via GitHub Actions:
   - `summary`: optional human-readable note (e.g., “Nov–Dec 2025 bi-monthly update”).
   - `mode`: choose `bi-monthly` (default) or `hotfix`.
8. The workflow runs validation, normalization, tests, Lighthouse, and `scripts/changelog.ts`, then opens a PR named `update/<YYYY-MM>/<mode>`.
9. Review the generated changelog entry and PR summary. Merge once checks succeed.

## Coding guidelines

- TypeScript is configured in strict mode. Keep new modules type-safe.
- Use the existing Tailwind utility classes for layout and theming.
- Favor accessible markup (semantic headings, labeled controls, focus states, `aria` attributes where required).
- Run `npm run lint`, `npm run typecheck`, and `npm run test` before opening PRs.

## Testing

- `npm run test` exercises the normalization/tagging helpers with Jest.
- `npm run lighthouse` relies on Lighthouse CI. Thresholds are configured in `.lighthouserc.json`.
- CI runs validation, lint, tests, type checks, and Lighthouse. Failing checks block merges.

## Privacy

The site does not collect visitor analytics. Do not introduce telemetry or third-party tracking without prior review.
