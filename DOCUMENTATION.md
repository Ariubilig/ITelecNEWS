# UNWRITE

## 1. What Is This Project?

1. Real news articles are published on the web every day.
2. Those articles are often written in a dry, formal, hard-to-read way.
3. UNWRITE automatically grabs those articles, feeds them to an AI, and the AI rewrites them in a punchy, teen-friendly style.
4. Users visit the UNWRITE website to read the AI-rewritten news, and can leave comments.
5. An admin panel lets authenticated editors review, approve, or reject articles before they appear publicly.

The entire pipeline — from scraping to AI rewriting to displaying — is **fully automated**. No human editor is needed for scraping and processing, but admins can curate what is published.



```
┌─────────────────────────────────────────────────────────────────┐
│                    EVERY DAY AT 3 AM (UTC)                      │
│                    GitHub Actions triggers                       │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                   STEP 1: SCRAPER (Node.js)                     │
│  Puppeteer visits unread.today, collects article URLs,          │
│  then visits each URL and extracts: title, date, image, body    │
│  Saves raw articles into Supabase `articles` table              │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                STEP 2: AI PROCESSING (Deno Edge Function)       │
│  Reads all unprocessed articles from the database               │
│  Sends each one to OpenRouter GPT API (max 3 concurrent)        │
│  AI rewrites: headline, summary, body — in teen language        │
│  AI also assigns a "mood" (wild / heavy / inspiring / etc.)     │
│  Saves result into `processed_articles` table (status=published)│
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│             STEP 3 (OPTIONAL): ADMIN REVIEW                     │
│  Admin logs in at /admin/login with email + password            │
│  Admin panel shows all articles with pending/published status   │
│  Admin can approve (publish) or decline (reject) articles       │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                  STEP 4: USER VISITS THE SITE                   │
│  React frontend fetches published processed articles            │
│  Home page shows article cards with AI headlines + mood badge   │
│  User clicks an article → Reading page shows full AI rewrite    │
│  User can leave comments (stored in Supabase `comments` table)  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Technology Stack

### Frontend (what users see in the browser)

| Technology | Version | Purpose |
|---|---|---|
| **React** | 19 | UI framework — builds all the components |
| **TypeScript** | 5.x | Adds type safety to JavaScript |
| **Vite** | 7 | Build tool — bundles the app for production |
| **React Router** | v7 | Handles navigation between pages |
| **Supabase JS** | 2.97 | Client library to talk to the database + auth |
| **GSAP** | 3.15 | Animations — smooth scroll, card fade-ins |
| **DOMPurify** | 3.x | Sanitizes HTML from the AI before rendering it |

### Backend Scraper

| Technology | Purpose |
|---|---|
| **Node.js** | Runtime for the scraper script |
| **TypeScript** | Type-safe scraping code |
| **Puppeteer** | Controls a headless Chrome browser to scrape websites |
| **Supabase JS** | Saves scraped data into the database |

### Database & Cloud

| Technology | Purpose |
|---|---|
| **Supabase** | Hosted PostgreSQL database + authentication + Edge Functions |
| **Deno** | Runtime for the Supabase Edge Function (AI processing) |
| **OpenRouter API** | Provides access to GPT model for AI rewriting |
| **GitHub Actions** | Runs the scraper automatically every day |

---

## Pipeline

### Step A — GitHub Actions Wakes Up

Every day at 3:00 AM UTC, a scheduled GitHub Actions workflow (`.github/workflows/scraper.yml`) automatically runs. It sets up Node.js 20, installs dependencies, and runs the scraper.

You can also trigger it manually from the GitHub Actions UI.

### Step B — Puppeteer Scrapes the Source Website

The scraper (`Server/scrape/scrape.ts`) uses **Puppeteer**, a library that controls a real headless (invisible) Chrome browser.

Here is what happens:

1. Puppeteer launches a Chrome browser (no window, runs in the background).
2. It navigates to `unread.today/category/7` (a news aggregation page).
3. It finds all article links using the CSS selector `#articles1-body h3.title a` and collects their URLs.
4. For each URL, it opens a new browser tab and extracts:
   - The page title
   - The publication date
   - The hero image URL
   - The full article body as HTML
5. Each article is inserted into the `articles` table in Supabase.
   - If the URL already exists (from a previous run), Supabase ignores the duplicate automatically (because `url` has a `UNIQUE` constraint).

### Step C — AI Rewrites the Articles

After the scraper finishes, GitHub Actions sends an HTTP POST request to the **Supabase Edge Function** at:
```
https://<project>.supabase.co/functions/v1/process-articles
```

The Edge Function (`supabase/functions/process-articles/index.ts`) runs on Deno and does the following:

1. Queries all articles where `processed = false` and `body` is not null.
2. Processes up to **3 articles concurrently** (via `p-limit`) to avoid rate limits.
3. For each unprocessed article, sends a prompt to **OpenRouter API** (model: `openai/gpt-oss-120b:free`).
4. Parses the AI's JSON response.
5. Saves the result into `processed_articles` using UPSERT with `status = "published"`.
6. Updates `articles.processed = true` for that article.

The AI system prompt instructs the model to return JSON with exactly these fields:
- `teen_headline` — punchy rewritten headline, max 12 words
- `teen_summary` — 2–3 sentence hook
- `teen_body` — full rewrite in HTML using `<p>` tags
- `mood` — one of: `wild | heavy | inspiring | sus | lowkey | chaotic | important`

### Step D — Admin Reviews (Optional)

Admins can log in at `/admin/login` using email and password (Supabase Auth). The admin panel at `/admin` shows all processed articles with their status and lets admins:

- **Approve** a pending article → sets `status = "published"`
- **Decline** a pending/published article → sets `status = "rejected"`

The admin panel is protected: unauthenticated users are redirected to `/admin/login`.

### Step E — User Visits the Site

The React frontend is served as a static website. When a user visits:

- **Home page** (`/`): Fetches published processed articles from Supabase, ordered newest first. Displays them as a card grid with mood badges.
- **Reading page** (`/article/:id`): Fetches one specific processed article (joined with its original article data). Shows the full AI-rewritten content. AI HTML body is sanitized with DOMPurify before rendering.

All data fetching is done directly from the browser to Supabase using the **Supabase JS client** — there is no separate backend server for the frontend.


## 12. Automated Daily Runs

**Location:** `.github/workflows/scraper.yml`

GitHub Actions is a free automation service built into GitHub. Our workflow:

```yaml
schedule:
  - cron: '0 3 * * *'   # Every day at 3:00 AM UTC
```

The workflow steps:
1. Check out the repository code
2. Install Node.js 20
3. Install Linux system dependencies that Puppeteer's Chrome needs (fonts, X11 libraries, etc.)
4. Install npm packages (`npm ci`)
5. Run the scraper: `npx tsx scrape/scrape.ts`
6. Send a POST request to the Supabase Edge Function to trigger AI processing

Environment variables (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, etc.) are stored as GitHub repository **Secrets** and injected at runtime — they are never visible in the code.

## 13. Database Schema

### `articles`
Raw scraped articles.

| Column | Type | Notes |
|---|---|---|
| `id` | bigint | Auto-generated primary key |
| `url` | text | Unique — prevents duplicate scrapes |
| `title` | text | Original article title |
| `date` | text | Publication date string |
| `image` | text | Hero image URL |
| `body` | text | Full article HTML body |
| `created_at` | timestamptz | When scraped |
| `processed` | boolean | `false` until AI processes it |

### `processed_articles`
AI-rewritten versions of articles.

| Column | Type | Notes |
|---|---|---|
| `id` | bigint | Auto-generated primary key |
| `article_id` | bigint | FK → `articles.id` (unique) |
| `teen_headline` | text | AI-rewritten headline |
| `teen_summary` | text | AI-rewritten 2–3 sentence summary |
| `teen_body` | text | AI-rewritten full body (HTML) |
| `mood` | text | One of 7 mood values |
| `status` | text | `draft`, `approved`, `published`, or `rejected` |
| `processed_at` | timestamptz | When AI finished processing |

### `comments`
User comments on articles.

| Column | Type | Notes |
|---|---|---|
| `id` | bigint | Auto-generated primary key |
| `article_id` | bigint | FK → `articles.id` |
| `guest_name` | text | Display name (no account needed) |
| `content` | text | Comment text |
| `status` | text | `pending`, `published`, `hidden`, or `deleted` |
| `parent_id` | bigint | FK → `comments.id` — for nested replies |
| `created_at` | timestamptz | When posted |
| `updated_at` | timestamptz | When last modified |

## 14. Project Folder Structure

```
ITelecNEWS/
│
├── Client/                        ← React frontend app
│   └── src/
│       ├── App.tsx                ← Root component with routes
│       ├── pages/
│       │   ├── home/Home.tsx      ← Article grid page
│       │   ├── reading/Reading.tsx← Individual article page
│       │   └── admin/
│       │       ├── Admin.tsx      ← Article moderation dashboard
│       │       └── AdminLogin.tsx ← Email/password login page
│       ├── components/
│       │   ├── UI/
│       │   │   ├── Navbar/        ← Top nav bar
│       │   │   ├── Footer/        ← Footer
│       │   │   ├── ScrollBar/     ← Custom scrollbar
│       │   │   └── ThemeSwitcher/ ← Light/dark/system toggle
│       │   └── comment/
│       │       └── Comment.tsx    ← Nested comment system
│       ├── hooks/
│       │   ├── useTheme.ts        ← Theme persistence logic
│       │   ├── useScrollSmoother.ts← GSAP smooth scroll setup
│       │   └── useFontsReady.ts   ← Waits for fonts to load
│       ├── lib/
│       │   ├── supabase.ts        ← Supabase client for the browser
│       │   └── mood.ts            ← Mood config (colors, Mongolian labels)
│       └── utility/
│           └── Comment.ts         ← Flat-to-tree comment converter
│
├── Server/                        ← Node.js scraper (runs in CI)
│   └── scrape/
│       └── scrape.ts              ← Puppeteer scraping script
│
├── supabase/                      ← Database & cloud functions
│   ├── migrations/
│   │   ├── all.sql                ← Full database schema snapshot
│   │   ├── 003_indexes.sql        ← Performance indexes
│   │   ├── 004_admin_read_policy.sql
│   │   ├── 005_admin_auth_policies.sql
│   │   ├── 006_admin_authenticated_select.sql
│   │   ├── 007_admin_articles_select.sql
│   │   └── 008_comments_insert_policy.sql
│   └── functions/
│       └── process-articles/
│           └── index.ts           ← Deno AI processing function
│
└── .github/workflows/
    └── scraper.yml                ← GitHub Actions daily automation
```

---

## 15. Environment Variables & Configuration

The app requires several environment variables to connect to external services. They are **never committed to git**.

### Server (scraper)

| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | The URL of the Supabase project |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin key — allows writing to the database |

### Client (frontend, browser)

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | The URL of the Supabase project |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Public (anon) key — safe to expose in the browser |

### Edge Function (Deno, stored in Supabase dashboard)

| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin key for database writes |
| `OPENROUTER_API_KEY` | API key for the OpenRouter AI service |

---

## 16. Mood System

The AI assigns one of 7 moods to each article. Moods are defined in `Client/src/lib/mood.ts` and displayed as colored badges in Mongolian.

| Mood key | Mongolian label | Color |
|---|---|---|
| `wild` | Гайхмаар | Orange |
| `heavy` | Хүнд | Blue-grey |
| `inspiring` | Урамдуулах | Yellow |
| `sus` | Эргэлзээтэй | Purple |
| `lowkey` | Намуун | Green |
| `chaotic` | Эмх замбараагүй | Orange-red |
| `important` | Чухал | Red |

---

The whole system runs without any manual intervention after initial setup.
