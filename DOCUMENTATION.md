# UNWRITE

## 1. What Is This Project?

1. Real news articles are published on the web every day.
2. Those articles are often written in a dry, formal, hard-to-read way.
3. UNWRITE automatically grabs those articles, feeds them to an AI, and the AI rewrites them in a punchy, teen-friendly style.
4. Users visit the UNWRITE website to read the AI-rewritten news, and can leave comments.

The entire pipeline — from scraping to AI rewriting to displaying — is **fully automated**. No human editor is needed.



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
│  Sends each one to OpenRouter GPT API                           │
│  AI rewrites: headline, summary, body — in teen language        │
│  AI also assigns a "mood" (wild / heavy / inspiring / etc.)     │
│  Saves result into `processed_articles` table                   │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                  STEP 3: USER VISITS THE SITE                   │
│  React frontend fetches processed articles from Supabase        │
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
| **React Router** | v7 | Handles navigation between pages (Home ↔ Reading) |
| **Supabase JS** | 2.97 | Client library to talk to the database |
| **GSAP** | 3.15 | Animations — smooth scroll, card fade-ins |

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

The Edge Function (`supabase/functions/process-articles/index.ts`) runs on Deno (Supabase's serverless runtime) and does the following:

1. Queries all articles where `processed = false`.
2. For each unprocessed article, builds a prompt like:

```
TITLE: [article title]
BODY: [article HTML body]

Rewrite this for a teen audience. Return JSON with:
- teen_headline
- teen_summary
- teen_body
- mood (one of: wild, heavy, inspiring, sus, lowkey, chaotic, important)
```

3. Sends this prompt to the **OpenRouter API** (using the `openai/gpt-oss-120b:free` model).
4. Parses the AI's JSON response.
5. Saves the result into `processed_articles` using UPSERT (insert or update if already exists).
6. Updates `articles.processed = true` for that article.

### Step D — User Visits the Site

The React frontend is served as a static website. When a user visits:

- **Home page** (`/`): Fetches up to 60 published processed articles from Supabase, ordered newest first. Displays them as a card grid.
- **Reading page** (`/article/:id`): Fetches one specific processed article (joined with its original article data). Shows the full AI-rewritten content.

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

## 14. Project Folder Structure

```
ITelecNEWS/
│
├── Client/                        ← React frontend app
│   └── src/
│       ├── App.tsx                ← Root component with routes
│       ├── pages/
│       │   ├── home/Home.tsx      ← Article grid page
│       │   └── reading/Reading.tsx← Individual article page
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
│       │   └── supabase.ts        ← Supabase client for the browser
│       └── utility/
│           └── Comment.ts         ← Flat-to-tree comment converter
│
├── Server/                        ← Node.js scraper (runs in CI)
│   └── scrape/
│       └── scrape.ts              ← Puppeteer scraping script
│
├── supabase/                      ← Database & cloud functions
│   ├── migrations/all.sql         ← Full database schema (SQL)
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

The whole system runs without any manual intervention after initial setup.