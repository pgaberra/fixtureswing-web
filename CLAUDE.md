# CLAUDE.md — fixtureswing-web

The Angular frontend of FixtureSwing (fixtureswing.com), a free FPL fixture ticker. **Public repo**: never commit
secrets, user data or server details (issue text, Actions logs and artifacts are public too).

Shared rules (architecture, data sources, service communication, working agreement) are in the
workspace root `../CLAUDE.md` and `../DECISIONS.md`; the blueprint is `../../INFRASTRUCTURE.md`
(never commit a copy). This file adds only what is peculiar to this repo.

## Stack

Angular 22 (standalone, signals, zoneless, OnPush by default), TypeScript 6, Vitest + jsdom,
ESLint (angular-eslint + sonarjs, type-aware) + Prettier, `ng-openapi-gen` for the api client,
`@ng-icons/lucide`, `@sentry/browser` and `posthog-js` (both dynamically imported, off without a
key). Served by nginx; prerendered home page (`outputMode: static`).

## Commands

```bash
npx npm@latest ci                 # npm 11.4.1 on this machine has a resolver bug; use latest
npm run generate:api              # after cloning or re-pinning the spec (src/app/api is gitignored)
npm start                         # http://localhost:4200, /api proxied to the api on :8100
npm run build                     # production build + prerender into dist/fixtureswing-web/browser
```

**The checks CI runs, run them all before a PR:** `npm run generate:api`,
`bash .github/scripts/check-build-placeholders.sh`, `npm run lint`, `npm run format:check`
(run `npm run format` first), `npm run test:coverage`, `npm run build`,
`bash .github/scripts/check-prerendered-pages.sh`. CI also runs `nginx -t` on `nginx.conf`.

## The api contract

- `specs/api-openapi.json` is a **verbatim copy** of `fixtureswing-api`'s `specs/openapi.json`.
  Never reformat it (it is excluded from Prettier's globs and marked `-text`). To re-pin: copy the
  file byte for byte, run `npm run generate:api`, fix compile errors.
- Components never call the generated `Api` directly; a service wraps it (`TickerApiService`).
- The api is always **same-origin** (`apiRootUrl: ''`): the dev proxy (`proxy.conf.json`) locally,
  nginx `/api` in deployed environments. No CORS anywhere.
- The api repo is private, so the PR check needs the `SPEC_READ_TOKEN` secret (fine-grained PAT,
  read access to `pgaberra/fixtureswing-api` contents, ~90-day expiry). Without it the PR check
  skips with a warning and `spec-freshness.yml` fails.

## The ticker

| Path | What |
|---|---|
| `src/app/ticker/ticker-model.ts` | Pure functions: range/view/sort parsing, rows per team, ease index, colour scale. All ticker rules live here and are unit-tested |
| `src/app/ticker/ticker-controls/` | Range presets, from/to selects, Overall/Attack/Defence |
| `src/app/ticker/ticker-table/` | The ranked grid (sticky team column, ease bar, coloured fixture cells, sortable projections) |
| `src/app/pages/home/` | Loads the ticker, keeps `?from=&to=&view=&sort=` in the URL |

- **Difficulty uses the api's neutral numbers** (average club vs this opponent at this venue), never
  the team's own projections: "easy fixtures" and "good team" stay separate. Projections are
  shown in their own columns.
- **Per-fixture ease is "more is easier, a blank adds nothing"**: attack = neutral goals for,
  defence = neutral clean-sheet chance (e^-neutral goals against), overall = the mean of both, each
  relative to the league average. A team's total is the sum, so doubles count twice and blanks
  count against it; the **ease index** is that total over the league mean × 100.
- **Cell colours** are scaled over every upcoming fixture, not the visible range, so a colour means
  the same thing whichever range is picked.

## Conventions

- **Angular style**: standalone components (don't set `standalone: true`), OnPush is the default
  (don't set it), `inject()`, signal `input()`/`output()`/`model()`, `computed()`, `resource()`
  for async data, native control flow (`@if`/`@for`), `class`/`style` bindings instead of
  `ngClass`/`ngStyle`, no `CommonModule`. Every route is lazy. Use the `angular-developer` skill for
  framework guidance.
- **Prerendering**: code that runs during the build has no window, storage or api. Gate
  browser-only work with `isPlatformBrowser` (see `HomeComponent` and the initialisers in
  `app.config.ts`).
- **Design tokens** live in `src/styles.css` (colours incl. the difficulty scale, spacing, radii,
  type scale, z-index). No hard-coded hex values or magic numbers in components. Shared `.btn`
  classes. Icons only through `app-icon` (`shared/icon/icon.ts`), never inline SVG.
- **Every async page** ends in `app-loading-indicator` while loading and `app-error-state` (with
  retry) on failure. A swallowed error needs a comment saying why.
- **Build-time config**: `environment.prod.ts` holds double-underscore placeholders that the
  Dockerfile `sed`s from build args; `check-build-placeholders.sh` fails CI when one has no
  substitution. Everything in the bundle is public.
- **Accessibility**: WCAG AA (contrast, focus, ARIA); text colours in `styles.css` are chosen for
  4.5:1 on every surface. Mobile floor ~375 px: wide tables scroll in their own container with a
  sticky team column; the page body never scrolls horizontally.
- **nginx**: repeat the security headers in every `location` that sets its own `add_header`; the
  CSP is staged (structural directives enforced, full allowlist report-only). Staging sends
  `X-Robots-Tag: noindex`.

## CI / deploy

`pr-checks.yml` on pull requests only; `spec-freshness.yml` on weekday mornings. CI never runs
`docker build`, so the Dockerfile is first exercised on staging. Build args: `APP_ENV`,
`APP_VERSION`, `SENTRY_DSN`, `POSTHOG_KEY` (build stage) and `API_UPSTREAM` (serve stage, the api's
address on the Docker network). Tag-on-merge and promotion workflows arrive with the deploy phase.
