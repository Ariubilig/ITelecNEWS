# UNWRITE

## 1. What Is This Project?

1. Real news articles are published on the web every day.
2. Those articles are often written in a dry, formal, hard-to-read way.
3. UNWRITE automatically grabs those articles, feeds them to an AI, and the AI rewrites them in a punchy, teen-friendly style.
4. Users visit the UNWRITE website to read the AI-rewritten news, and can leave comments.
5. An admin panel lets authenticated editors review, approve, or reject articles before they appear publicly.

The scraping and AI-rewriting pipeline is **fully automated** (runs daily with no human involved), but every AI-rewritten article now lands as a **draft** and an admin must approve it before it appears publicly. Nothing reaches readers without review.

```
┌─────────────────────────────────────────────────────────────────┐
│                    EVERY DAY AT 3 AM (UTC)                       │
│                    GitHub Actions triggers                       │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                   STEP 1: SCRAPER (Node.js)                      │
│  Puppeteer visits unread.today, collects article URLs,           │
│  then visits each URL and extracts: title, date, image, body     │
│  Saves raw articles into Supabase `articles` table               │
│  (per-page timeout + retries + politeness delay)                 │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                STEP 2: AI PROCESSING (Deno Edge Function)        │
│  Reads all unprocessed articles from the database                │
│  Sends each one to OpenRouter GPT API (max 3 concurrent, retried)│
│  AI rewrites: headline, summary, body — in teen language         │
│  AI also assigns a "mood" (wild / heavy / inspiring / etc.)      │
│  Saves result into `processed_articles` table (status = DRAFT)   │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                   STEP 3: ADMIN REVIEW (required)                │
│  Admin logs in at /admin/login with email + password             │
│  Admin panel shows draft / published / rejected articles         │
│  Admin approves (→ published) or declines (→ rejected)           │
│  Only `published` rows are visible to the public                 │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                  STEP 4: USER VISITS THE SITE                    │
│  React frontend fetches PUBLISHED processed articles             │
│  Home page shows article cards with AI headlines + mood badge    │
│  User clicks an article → Reading page shows full AI rewrite     │
│  User can leave comments (via a rate-limited edge function)      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Repository Layout (Turborepo Monorepo)

The project is a **Turborepo** monorepo managed with **npm workspaces**. There is no always-on server — the only backend execution is the daily cron scraper and the Supabase Edge Functions.

```
ITelecNEWS/
│
├── package.json          ← root: workspaces, turbo scripts, Node >=22
├── turbo.json            ← task pipeline (build / lint / typecheck / dev / scrape)
│
├── apps/
│   ├── web/              ← React frontend (was Client/)
│   └── scraper/          ← Node.js Puppeteer scraper (was Server/)
│
├── packages/
│   ├── shared/           ← shared TypeScript: types + mood config
│   └── env/              ← validated environment variables (web + server)
│
├── supabase/
│   ├── migrations/       ← RLS + admin policies (must stay in version control)
│   ├── functions/        ← Deno edge functions
│   └── tables.sql        ← schema reference + indexes
│
├── tests/                ← Vitest suite (see §13)
│
└── .github/workflows/
    ├── ci.yml            ← typecheck / lint / test / build on every PR
    └── scraper.yml       ← daily GitHub Actions automation
```

Root scripts (each fans out across workspaces via Turbo):

| Command | What it does |
|---|---|
| `npm run build` | Type-check + Vite build of the web app |
| `npm run lint` | ESLint across workspaces |
| `npm run typecheck` | `tsc` across `shared`, `web`, `scraper` |
| `npm run dev` | Vite dev server for the web app |
| `npm run scrape` | Runs the Puppeteer scraper |
| `npm run test` | Vitest suite (root-level, see §13) |
| `npm run test:watch` | Vitest in watch mode |

The `@itelecnews/shared` package is consumed as raw TypeScript source (no build step) by both `web` (Vite, `moduleResolution: bundler`) and `scraper` (`nodenext`). Its barrel uses explicit `.js` extensions so both resolvers are satisfied.

---

## 3. Technology Stack

### Tooling

| Technology | Version | Purpose |
|---|---|---|
| **Turborepo** | 2.x | Monorepo task runner + caching |
| **npm workspaces** | — | Links `apps/*` and `packages/*` |
| **Node.js** | **22+** | Required (supabase-js needs native `WebSocket`) |

### Frontend — `apps/web`

| Technology | Version | Purpose |
|---|---|---|
| **React** | 19 | UI framework |
| **TypeScript** | 5.x | Type safety |
| **Vite** | 7 | Build tool |
| **React Router** | v7 | Navigation |
| **Supabase JS** | 2.97 | Database + auth client |
| **GSAP** | 3.15 | Smooth scroll / animations |
| **DOMPurify** | 3.x | Sanitizes AI HTML before rendering |

### Scraper — `apps/scraper`

| Technology | Purpose |
|---|---|
| **Node.js / tsx** | Runs the scraping script |
| **Puppeteer** | Headless Chrome to scrape websites |
| **Supabase JS** | Writes scraped data (uses the service-role key, bypasses RLS) |

### Database & Cloud

| Technology | Purpose |
|---|---|
| **Supabase** | Hosted PostgreSQL + Auth + Edge Functions |
| **Deno** | Runtime for the Edge Functions |
| **OpenRouter API** | GPT model for AI rewriting |
| **GitHub Actions** | Runs the scraper daily |

---

## 4. Pipeline

### Step A — GitHub Actions Wakes Up

Every day at 3:00 AM UTC, `.github/workflows/scraper.yml` runs. It sets up **Node.js 22**, installs dependencies, installs the Linux libraries Puppeteer's Chrome needs, runs the scraper, then triggers AI processing. It can also be run manually via **workflow_dispatch**.

### Step B — Puppeteer Scrapes the Source Website

The scraper (`apps/scraper/scrape/scrape.ts`) drives a headless Chrome:

1. Launches Chrome (no window).
2. Navigates to `unread.today/category/7`.
3. Collects article URLs via the selector `#articles1-body h3.title a`.
4. For each URL, extracts title, publication date, hero image, and full HTML body.
5. Inserts each article into the `articles` table. Duplicate URLs are skipped (the `url` column is `UNIQUE`; conflict code `23505` is treated as "already scraped").

**Resilience:** a per-navigation timeout, up to 3 retries with backoff per page, a short politeness delay between articles, guaranteed browser/page cleanup in `finally`, and a non-zero process exit on a fatal error (so a failed run shows red in CI).

### Step C — AI Rewrites the Articles

After scraping, the workflow sends an HTTP POST to the **Supabase Edge Function**:
```
https://<project>.supabase.co/functions/v1/process-articles
```

The function (`supabase/functions/process-articles/index.ts`, Deno):

1. Checks the `x-cron-secret` header against the `CRON_SECRET` env var (the endpoint is otherwise open — see §6) and returns 401 on mismatch.
2. Queries articles where `processed = false` and `body` is not null.
3. Processes up to **3 concurrently** via `p-limit`.
4. Sends each to **OpenRouter** (model `openai/gpt-oss-120b:free`) with a 60s timeout, **retried up to 3× with backoff** (the free model is flaky).
5. Parses the AI JSON response.
6. UPSERTs into `processed_articles` with **`status = "draft"`**.
7. Sets `articles.processed = true`.

The AI is instructed to return JSON with exactly:
- `teen_headline` — punchy headline, max 12 words
- `teen_summary` — 2–3 sentence hook
- `teen_body` — full rewrite in HTML using `<p>` tags
- `mood` — one of `wild | heavy | inspiring | sus | lowkey | chaotic | important`

### Step D — Admin Reviews (required)

Admins log in at `/admin/login` (Supabase Auth, email + password). The panel at `/admin` lists drafts, published, and rejected articles and lets admins:

- **Approve** → `status = "published"`
- **Decline / unpublish** → `status = "rejected"`

Mutations check for errors and surface a banner on failure (no silent optimistic updates). Because every new article is a `draft`, **nothing is public until an admin approves it.**

### Step E — User Visits the Site

The React frontend is a static site talking directly to Supabase:

- **Home** (`/`): fetches `processed_articles` filtered to `status = 'published'`, newest first; renders a card grid with mood badges. Shows an error state if the fetch fails.
- **Reading** (`/article/:id`): fetches one processed article joined with its raw article. The AI HTML body is sanitized with DOMPurify. If the row isn't found (e.g. a non-admin requesting a draft, which RLS hides), a "not found" message is shown.
- **Comments**: posted through the `submit-comment` edge function (see §5), not inserted directly.

---

## 5. Comments

Guest comments (no account needed) support nested replies. To prevent spam and status tampering, comments are **not** inserted directly from the browser anymore. Instead `apps/web/src/components/comment/Comment.tsx` calls the **`submit-comment` edge function** (`supabase/functions/submit-comment/index.ts`), which:

1. Reads the client IP from `x-forwarded-for`.
2. Validates name/content length and the article/parent IDs.
3. Enforces a per-IP rate limit: a 15-second cooldown and a max of 12 comments/hour, tracked in the `comment_throttle` table.
4. Inserts the comment with `status` **forced server-side to `published`** (clients can't inject other statuses).

A 429 (rate-limited) response surfaces a friendly message in the UI. RLS on `comments` removes anon `INSERT` entirely — the service-role edge function is the only writer.

**Moderation.** Comments are inserted as `published`, so the thread stays live without an admin in the loop. `/admin/comments` (`apps/web/src/pages/admin/AdminComments.tsx`) lists the most recent 200 in any state, filterable by status, and moves them between `published` / `hidden` / `deleted`. RLS returns non-`published` rows only to admins and rejects status writes from anyone else, so the screen is safe to run against the browser client.

Note the rate limit is keyed on `x-forwarded-for` alone, which a phone switching to mobile data defeats. It raises the cost of spam; it does not prevent it.

---

## 6. Security Model

This is the load-bearing part of the production hardening.

### Row Level Security (RLS)

RLS is enabled on `articles`, `processed_articles`, and `comments`. Migration: `supabase/migrations/20260601000000_rls_and_admins.sql`.

> ⚠️ **That migration was reconstructed, not recovered.** A bare `migrations` entry in `.gitignore` matched the directory at any depth, so the original was never committed — the security model existed only inside the live Supabase project and as the prose below. The file now in the repo was rebuilt from this section. It is idempotent and safe to run on a fresh project, but **diff it against production before applying it there**; verification queries are at the bottom of the file. The `.gitignore` pattern has been removed.

- **Public (anon) reads:** `articles` (all), `processed_articles` where `status = 'published'`, `comments` where `status = 'published'`. Drafts and rejected content are invisible to the public **at the database level**.
- **Writes:** admin-only, gated by an `is_admin()` SQL helper.

The scraper and edge functions use the **service-role key, which bypasses RLS**, so ingestion and AI processing are unaffected.

### Admin identity

A logged-in session is **not** automatically an admin. Admins are rows in an `admins(user_id)` table; `is_admin()` checks membership against `auth.uid()`. The owner is seeded by email in the migration (confirm the email before running). Public **signup is disabled** (`config.toml` `enable_signup = false`, plus the dashboard toggle) so strangers can't create a session at all.

### Edge function access

Both functions run with **`verify_jwt = false`** (`config.toml`) because this project uses the new API key system (`sb_secret_…` / `sb_publishable_…` keys are not JWTs, so the gateway's JWT check would reject them). Access is enforced in-code instead:

- `process-articles` — guarded by the `CRON_SECRET` shared secret (`x-cron-secret` header).
- `submit-comment` — public by design, protected by input validation + per-IP rate limiting.

Deploy them with: `supabase functions deploy <name> --no-verify-jwt`.

---

## 7. Database Schema

### `articles` — raw scraped articles
| Column | Type | Notes |
|---|---|---|
| `id` | bigint | Primary key |
| `url` | text | Unique — prevents duplicate scrapes |
| `title` | text | Original title |
| `date` | text | Publication date string |
| `image` | text | Hero image URL |
| `body` | text | Full article HTML |
| `created_at` | timestamptz | When scraped |
| `processed` | boolean | `false` until AI processes it |

### `processed_articles` — AI-rewritten versions
| Column | Type | Notes |
|---|---|---|
| `id` | bigint | Primary key |
| `article_id` | bigint | FK → `articles.id` (unique) |
| `teen_headline` | text | AI headline |
| `teen_summary` | text | AI 2–3 sentence summary |
| `teen_body` | text | AI full body (HTML) |
| `mood` | text | One of 7 mood values |
| `status` | text | `draft`, `published`, or `rejected` |
| `processed_at` | timestamptz | When AI finished |

> The editor's status dropdown surfaces `draft` / `published` / `rejected` — matching the DB `CHECK` constraint (an earlier version offered invalid values that caused silent save failures).

### `comments` — user comments
| Column | Type | Notes |
|---|---|---|
| `id` | bigint | Primary key |
| `article_id` | bigint | FK → `articles.id` |
| `guest_name` | text | Display name (no account) |
| `content` | text | Comment text |
| `status` | text | `pending`, `published`, `hidden`, or `deleted` (forced to `published` on insert) |
| `parent_id` | bigint | FK → `comments.id` — nested replies |
| `created_at` | timestamptz | When posted |
| `updated_at` | timestamptz | When last modified |

### `admins` — admin registry
| Column | Type | Notes |
|---|---|---|
| `user_id` | uuid | PK, FK → `auth.users.id` |
| `created_at` | timestamptz | When granted |

### `comment_throttle` — rate-limit log
| Column | Type | Notes |
|---|---|---|
| `id` | bigint | Primary key |
| `ip` | text | Client IP |
| `article_id` | bigint | Which article |
| `created_at` | timestamptz | When posted |

**Migrations:**
- `supabase/tables.sql` — context-only schema snapshot (not executed). Mirrors the columns the app code reads/writes.
- `supabase/migrations/` — the actual migration files. **Gitignored locally** (kept out of version control by `.gitignore`); apply with `supabase db push`. Includes the RLS policies, `admins` table, `is_admin()` helper, and the `comment_throttle` table.

---

## 8. Detailed Folder Structure

```
apps/web/                          ← React frontend
└── src/
    ├── App.tsx                    ← Root component with routes
    ├── pages/
    │   ├── home/Home.tsx          ← Published article grid
    │   ├── reading/
    │   │   ├── Reading.tsx        ← Single article view
    │   │   └── EditArticleModal.tsx ← Admin edit modal
    │   └── admin/
    │       ├── Admin.tsx          ← Moderation dashboard
    │       └── AdminLogin.tsx     ← Email/password login
    ├── components/
    │   ├── UI/
    │   │   ├── Navbar/
    │   │   ├── ScrollBar/
    │   │   └── FallbackImage.tsx  ← Image with placeholder fallback
    │   └── comment/Comment.tsx    ← Nested comments (posts via edge fn)
    ├── hooks/
    │   ├── useScrollSmoother.ts   ← GSAP smooth scroll
    │   └── useSession.ts          ← Supabase auth session subscription
    └── lib/
        ├── supabase.ts            ← Browser Supabase client (env-validated)
        ├── queries.ts             ← Central Supabase reads
        ├── useQuery.ts            ← Tiny data-fetch hook
        └── comments.ts            ← Flat-to-tree + timeAgo helpers

apps/scraper/                      ← Node.js scraper (CI / cron)
├── lib/supabase.ts                ← Service-role client (env-validated)
└── scrape/scrape.ts               ← Puppeteer scraping script

packages/shared/                   ← Shared TypeScript
└── src/
    ├── index.ts                   ← Barrel (re-exports with .js extensions)
    ├── types.ts                   ← Article / ProcessedArticle / EditForm …
    └── mood.ts                    ← MOOD_CONFIG + getMoodStyle()

supabase/
├── tables.sql                    ← Schema snapshot (context only)
├── migrations/                   ← Gitignored locally; applied with `supabase db push`
└── functions/
    ├── process-articles/index.ts ← AI processing (Deno)
    └── submit-comment/index.ts   ← Rate-limited comment insert (Deno)

.github/workflows/scraper.yml      ← Daily automation (Node 22)
```

---

## 9. Environment Variables & Configuration

Never committed to git. Note that the **scraper uses unprefixed names** while the **web app uses `VITE_`-prefixed names** (Vite only exposes `VITE_*` to the browser).

### Scraper (`apps/scraper`)
| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role / secret key — writes to DB, bypasses RLS |

Locally these go in `apps/scraper/.env`. In CI they come from GitHub Actions secrets — **and must be declared in `turbo.json`'s `passThroughEnv` for the `scrape` task**, because Turborepo's strict env mode otherwise filters them out before the task runs.

### Web (`apps/web`, browser)
| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Public/anon key — safe in the browser |

The web client throws a clear error at startup if either is missing.

### Edge Functions (Supabase dashboard secrets)
| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key for DB writes |
| `OPENROUTER_API_KEY` | OpenRouter AI key (process-articles) |
| `CRON_SECRET` | Shared secret guarding the process-articles trigger |

`CRON_SECRET` must also be set as a **GitHub Actions secret** with the same value (the workflow sends it as `x-cron-secret`).

---

## 10. Mood System

The AI assigns one of 7 moods. Defined in `packages/shared/src/mood.ts` (`MOOD_CONFIG` + `getMoodStyle()`), rendered as colored badges in Mongolian.

| Mood key | Mongolian label | Color |
|---|---|---|
| `wild` | Гайхмаар | Orange |
| `heavy` | Хүнд | Blue-grey |
| `inspiring` | Урамдуулах | Yellow |
| `sus` | Эргэлзээтэй | Purple |
| `lowkey` | Намуун | Green |
| `chaotic` | Эмх замбараагүй | Orange-red |
| `important` | Чухал | Red |

`getMoodStyle()` falls back to `heavy` for unknown/empty moods.

---

## 11. Deploy / Rollout Checklist

1. Apply migrations: `supabase db push`.
2. Confirm the seeded admin email in the RLS migration, and ensure that account exists (log in once first).
3. Turn **signup OFF** in the Supabase dashboard.
4. Set `CRON_SECRET` in both GitHub Actions secrets and Supabase function secrets (same value).
5. Deploy functions:
   `supabase functions deploy process-articles --no-verify-jwt`
   `supabase functions deploy submit-comment --no-verify-jwt`
6. Confirm `OPENROUTER_API_KEY` and service-role secrets are set for the functions.
7. End-to-end check: scraper → `process-articles` writes `draft` → appears in Admin pending → approve → shows on Home.

---

## 12. Known Follow-ups (not yet done)

- **Per-article OG tags.** `index.html` now carries static title/description/OG
  tags, and `useDocumentTitle` sets per-page titles at runtime — but social
  crawlers don't execute JS, so a shared article link still previews as the
  site, not the article. Needs prerendering, SSR, or an edge function that
  injects tags for crawler user-agents.
- **Article slugs.** URLs are `/article/<processed_articles.id>`. A slug column
  would make links readable and improve search ranking.
- **Home pagination** (currently capped at 60; admin at 200, comments at 200).
- **Image caching to Supabase Storage** (currently hotlinks the source `og:image`).
- **`articles.date` is `text`**, so articles can't be sorted by publication
  date — the feed orders by `processed_at` instead.
- **Deep links from the moderation screen.** `comments.article_id` points at
  `articles`, but the reading route is keyed on `processed_articles.id`, so
  each row shows its source title rather than linking to the thread.
- **`comment_throttle` grows without bound.** It's only ever read over a
  one-hour window; schedule a periodic trim (see the note in `tables.sql`).

### Done since this list was written

- ~~Route-based code-splitting / `manualChunks`~~ — routes are lazy-loaded and
  chunking is matched by module path, so `react-dom` is cached rather than
  re-shipped on every deploy.
- ~~React error boundary + 404 route~~ — see §13.
- ~~Comment moderation UI~~ — see §5.

---

## 13. Testing & CI

`npm run test` runs a Vitest suite from the repo root. Tests live in `tests/`
rather than inside a workspace because the code worth covering is spread across
three of them, and a root runner can import from all three by relative path.

| File | Covers |
|---|---|
| `tests/ai-output.test.ts` | `parseAiOutput` — fenced JSON, literal newlines inside strings, missing fields, unknown moods |
| `tests/comments.test.ts` | `buildTree` (orphaned replies, out-of-order rows, cycles) and `timeAgo` boundaries |
| `tests/mood.test.ts` | Mood config, fallback behaviour, and that the edge function's mood list still matches the UI's |

Two things worth knowing:

- The model's JSON parsing was extracted into
  `supabase/functions/process-articles/parse.ts`, which is deliberately free of
  imports and of any Deno API so it can be tested outside the edge runtime.
- The edge function can't import from `packages/shared`, so it keeps its own
  copy of the valid mood list. `tests/mood.test.ts` asserts the two sets are
  identical — that test is the only thing stopping them drifting apart and
  silently rendering every article as `heavy`.

`.github/workflows/ci.yml` runs typecheck, lint, test and build on every pull
request and on pushes to `main`.

### Error handling

`ErrorBoundary` wraps the router, so a render error (a malformed article body, a
lazy chunk that fails to load) shows a recoverable message instead of blanking
the page. Stack traces are shown only in dev. Unmatched routes render the 404
page rather than an empty layout.
