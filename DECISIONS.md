# Decision log — fixture-ticker-web

One line per decision: `[date] <what was decided> — <why, and what was rejected>.` Cross-repo
decisions live in the workspace `../DECISIONS.md`.

```
[2026-09-17] The api is reached same-origin through nginx `/api` (dev proxy locally), with no API_URL build arg — the workspace decision; removes CORS, the second origin list at the edge and a public api hostname.
[2026-09-17] PostHog runs cookieless always, with no consent banner — no accounts to identify, so nothing needs storing on the visitor's device; SlapStat's on_reject banner flow was rejected as UI without a purpose here.
[2026-09-17] Home page prerendered, ticker data fetched in the browser — the build has no api to call; search engines and link previews still get the heading and explanation as HTML.
[2026-09-17] No SSR server (express removed, outputMode static) — nginx serves files; a Node server would be one more runtime to deploy and monitor for a page whose data changes a few times a week.
[2026-09-17] PR spec check skips with a warning when SPEC_READ_TOKEN is missing, while spec-freshness fails — the token can only be created by the owner; failing every PR until then would block all work.
[2026-09-17] No consent banner, auth, toast or notification service from the SlapStat skeleton — nothing here writes, signs in or needs a transient message; add them with the first feature that does.
```
