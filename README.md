# CORE° — THE DESCENT

A complete anonymous daily trivia game. Seven open-ended questions, 25 seconds per question, editorial rarity scores, and an animated journey to 7,000 meters. Built with Next.js, React, TypeScript, Tailwind CSS, Motion, Drizzle ORM, and SQLite. No paid APIs or account required.

## Run locally

Use **Node.js 24 LTS** (Node 22.13+ also supports the dependencies) and npm. From this repository:

```bash
npm ci --cache /tmp/core-npm-cache
npm run db:seed
npm run dev
```

Open port **3000** in your own development environment. The server binds to `0.0.0.0`. No `.env` file or secrets are required. The database defaults to `.local/core.sqlite`, with SQLite WAL sidecars in the same directory. `DATABASE_PATH` optionally selects an absolute or relative database path. Do not put the database in `public/`.

On Windows, you can also double-click `PLAY-CORE.cmd` in the game folder after installing Node.js 24 LTS.

The database and question bank initialize automatically on first API use. `db:seed` is also safe to rerun: a seed content hash avoids unnecessary changes. A new seed version updates question/answer records transactionally while preserving player identities and already-scored results. Keep published question IDs stable and do not repurpose a question ID for an unrelated question.

## Validate

```bash
npm test
npm run typecheck
npm run build
```

For browser tests, start the development or production server on port 3000 in another terminal, then:

```bash
npm run test:e2e
```

The browser configuration uses the installed Linux Chromium at `/usr/bin/chromium`. On other machines, install Chromium via `npx playwright install chromium`, then set `PLAYWRIGHT_CHROMIUM_PATH` to its executable (or remove `executablePath` in `playwright.config.ts` to use Playwright's managed browser). Tests use fresh browser sessions; do not reset a player's real game. Unit tests use the separate `.local/unit-test.sqlite` database and reset only that test database.

Browser coverage includes complete seven-round games on desktop and an iPhone-sized viewport, Enter submission, rejected-answer retries, aliases, drafts, refresh persistence, duplicate requests, the seventh reveal, results, history, settings, pass, and real 25-second timeout evaluation. The identical timeout test is skipped on mobile; it runs on desktop. Screenshots and failure traces are written to ignored `test-results/`.

## Production

```bash
npm ci --cache /tmp/core-npm-cache
npm run db:seed
npm run build
npm start
```

Deploy to a **single Node.js instance with a persistent writable volume**. Set `DATABASE_PATH=/data/core.sqlite` (or a location on your volume); back up the database using SQLite's backup API or `VACUUM INTO`, not an unsafe copy of an actively changing WAL database. Use an HTTPS reverse proxy that preserves the public `Host` and request `Origin`. The anonymous cookie is `HttpOnly`, `SameSite=Strict`, one year, and `Secure` on production HTTPS requests. Keep both the database and its directory writable by the app user. SQLite here is for a single host, not distributed/serverless workers with separate disks. Move to a shared database before scaling to multiple hosts.

No changes are made to cotye.com or any live website. The application is self-contained and can later be mounted or linked from a website. Deploying it is a separate action.

## Gameplay and trust boundary

- The browser receives only the current/past prompts and the player's own resolved answers. It receives no future questions, answer lists, editorial scores for unseen answers, or session token in JSON. Database modules are imported only by Node server code.
- The database contains **49 approachable prompts, seven sets of seven, 1,623 canonical answers and curated aliases**. Every question includes familiar ten-point answers and a 100-point answer. The difficulty comes from finding rarer answers, rather than understanding specialist prompts. The starter schedule rotates weekly; it is not an unlimited question service.
- Six tiers: SURFACE **10**, RECOGNIZED **15**, DEEP THINKER **30**, RARE FIND **60**, ABYSSAL **85**, CORE° **100**. These are **editorial estimates**, not player-frequency statistics. Each canonical answer always has the same score for its question and editorial edition. Every point equals ten meters; 700 points equals 7,000 meters.
- Text normalization handles case, accents, punctuation, whitespace, ampersands, aliases, abbreviations, and meaningful symbols such as `C++`. Typo correction allows one edit only for strings at least five characters long and only when one canonical answer matches. Short aliases need exact matching. Some scientifically valid or less common answers may not be in the curated bank: the interface explains this rather than treating the bank as omniscient.
- Each stage persists a two-second reading preview and a 25-second deadline based on server time. Navigating away or refreshing does not pause an active stage. Reveal screens have no active timer. A fresh stage begins only when Continue is accepted.
- The input autosaves after 180 ms of inactivity and on blur. At expiry the server evaluates the **last server-saved draft**. Late client-supplied text cannot replace it. A very recent unsaved edit or a connection failure may not be included; the UI shows save status and connection errors.
- Mutations require a same-origin `Origin` header, validate request size, action, answer length and round number, and use immediate SQLite transactions plus unique player/day/edition and attempt/round constraints. Repeat submissions cannot award extra points; stale Continue requests cannot skip rounds. Scoring is always calculated on the server.
- Anonymous identity is a random 256-bit cookie token whose SHA-256 hash identifies a player in the database. It is not an account. Clearing cookies, opening a private session, or changing browsers permits a new identity. There is no claim of perfect anti-cheat, measured answer popularity, global rankings, or cross-device sync. Add infrastructure-level rate limits before a large public launch.
- Reset is **midnight America/New_York**, using IANA time-zone conversion, including 23- and 25-hour daylight-saving days. All players on the same editorial edition get the same set for a given New York date. The Everyday edition gives existing players one fresh attempt; previous completed attempts remain labeled Original edition. Streaks count distinct dates, so completing both editions on one day does not inflate a streak. New days create new attempts; unfinished previous-day attempts expire from play. Completed attempts remain available in the expedition log. A streak includes yesterday until today's opportunity closes.

## Question editing

`lib/questions.ts` is the original editorial bank. Each question has six pipe-separated groups corresponding to the six scoring tiers; `~` adds aliases to a canonical answer. Empty groups are permitted for small factual answer sets. Add original entries with a stable ID and run `npm run db:seed`. Extend `setFor` in `lib/daily.ts` and the bank scheduling together when adding more daily sets.

The active bank focuses on familiar subjects: countries, planets, farm animals, food, colors, music, sports, body parts, birds, movies, flowers, US states, jobs, weather, capitals, dog breeds, and games. Open prompts accept a broad curated collection; for example, the Africa question covers all 54 countries and the US-state question covers all 50 states. Question wording, selection, scoring, and implementation are original. Rarity assignments are editorial estimates, not sourced player data. The reference website could not be reached from this environment (network proxy returned 403); no proprietary assets, question bank, code, or written content were copied.

## Everyday edition and safe updates

The Everyday edition uses new question IDs. Upgraded databases retain the original question rows, accepted answers and results; fresh databases contain only the current active bank. An idempotent, transactional SQLite migration adds the editorial edition to daily-attempt uniqueness. Each edition allows one attempt per date, including after refresh. Original-edition completed attempts remain in history. Original unfinished attempts are retired from active play when upgrading. The database is never deleted to unlock the easier questions.

On Windows, stop the running game with **Ctrl+C**, then run `UPDATE-CORE.cmd` from the game folder. It fetches the public source ZIP from this GitHub repository over HTTPS, updates source files in place, runs a locked dependency install, seeds the database, and starts the development server. It preserves `.local/`, database files, private environment files, and Git metadata because they are not part of the public source archive. It refuses to update while port 3000 is occupied, does not kill processes, and does not change PowerShell execution policy. The helper uses Windows built-in PowerShell and curl; install Node.js 24 LTS first. If downloading it into an existing game folder, use:

```powershell
curl.exe --fail --location https://raw.githubusercontent.com/cxcurry/--The-Decent/main/UPDATE-CORE.cmd --output UPDATE-CORE.cmd
.\UPDATE-CORE.cmd
```

The expedition now fills the **entire viewport** with one original procedural Canvas world. Projected, faceted cavern walls pass the camera; mineral veins glow; refracted light beams sway; translucent jellyfish pulse and trail moving tentacles; fish schools, a gliding ray, kelp, currents, bubbles and marine snow move independently. The larger exploration probe has a tether, articulated arms, counter-rotating thrusters, exhaust bubbles, glass cockpit, sweeping searchlights and expanding sonar rings. Starting triggers a launch surge; earned points produce a faster camera dive and longer particle trails. Lighting shifts from turquoise to blue and violet with real score depth. Questions and telemetry float over the environment, rather than enclosing it in a small panel. The full-screen button uses the browser Fullscreen API where supported; Escape exits. Phones keep the full-viewport world and stack readable controls over it.

Rendering runs independently of the authoritative game timer, caps pixel density, targets 30 fps on phones and up to 60 fps on desktop, adapts expensive desktop frames to 30 fps, skips painting in hidden tabs, and draws a static frame with reduced motion enabled. No external image/video assets, WebGL requirement or additional dependencies are needed. The animation update preserves the current edition, active attempts and previous results. Browser coverage verifies actual changing pixels, full-viewport coverage even after scrolling, static reduced-motion rendering, and entering/exiting browser full screen. Windows helper behavior still needs testing on an actual Windows machine; game/browser validation here uses Linux Chromium.

## Source map

- `app/` — page, global styling, HTTP game/history endpoints
- `components/` — complete game interface and original animated Canvas expedition environment
- `lib/game.ts` — transactional game state machine, history, statistics
- `lib/daily.ts` — New York day keys and DST-safe reset scheduling
- `lib/recognition.ts` — canonical answer matching and conservative edit distance
- `lib/schema.ts`, `lib/db.ts`, `lib/migrations.ts` — Drizzle schema, SQLite setup, transactional edition migration and versioned seeding
- `lib/questions.ts` — original 49-question editorial bank
- `tests/` — Vitest unit/integration tests and Playwright browser tests
