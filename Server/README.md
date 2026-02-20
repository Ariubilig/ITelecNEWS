# ITelecNEWS — Server

The `Server` directory is the **backend engine** of ITelecNEWS. It is a Node.js application responsible for scraping telecom news articles from [unread.today/category/7](https://unread.today/category/7) and storing them in a Supabase database.

---

## Directory Structure

```
Server/
├── .env                        # Local environment variables (gitignored)
├── package.json                # Node.js project manifest
├── scrape/
│   ├── ALLsupabase.js          # 🚀 Production scraper — writes to Supabase
│   ├── README.md               # Scraper-specific notes
│   └── local/
│       ├── ALLscrape.js        # 🛠️  Local scraper — writes to JSON files
│       └── json/               # Local output folder (scrapedURL, newURL, articles)
└── supabase/
    └── supabaseClient.js       # Supabase client singleton
```

---

## Dependencies

| Package                 | Version | Purpose                       |
| ----------------------- | ------- | ----------------------------- |
| `puppeteer`             | ^24     | Headless browser for scraping |
| `@supabase/supabase-js` | ^2      | Supabase database client      |
| `dotenv`                | ^17     | Load `.env` variables locally |

> **Node.js module type:** `"type": "module"` — all files use ES Module `import`/`export` syntax.

---

## Environment Variables

Create a `.env` file in the `Server/` root for local development:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

In GitHub Actions, these are provided as **repository secrets** (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`).

> ⚠️ Never commit `.env` to version control. The service role key has full database access and bypasses Row Level Security.

---

## Supabase Client — `supabase/supabaseClient.js`

A shared singleton that initializes and exports the Supabase client. Both scraper scripts import from this module.

```js
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: "../.env" });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

export default supabase;
```

- Uses `dotenv` to load `.env` from the `Server/` root when running locally.
- In CI (GitHub Actions), environment variables are injected directly — `dotenv` is a no-op.

---

## Scrapers

### 1. Production Scraper — `scrape/ALLsupabase.js`

This is the **primary scraper** run automatically by GitHub Actions every day. It writes articles directly to the Supabase `articles` table.

#### How it works

```
Step 1 — collectURLs()
  → Opens https://unread.today/category/7
  → Waits for #articles1-body to load
  → Extracts all article hrefs from h3.title a

Step 2 — scrapeAndInsert()
  → For each URL, navigates to the article page
  → Extracts: title, date, og:image, and body HTML (up to 2 bold-section paragraphs)
  → Inserts the record into Supabase articles table
  → Duplicate URLs (error code 23505) are silently skipped
  → Logs: ✅ Inserted / ⏭️ Duplicate / ❌ Failed
```

#### Article Data Schema

| Field   | Source                                                          |
| ------- | --------------------------------------------------------------- |
| `url`   | Article page URL                                                |
| `title` | `h1.uk-article-title` inner text                                |
| `date`  | `.uk-article-meta span` inner text                              |
| `image` | `meta[property="og:image"]` content                             |
| `body`  | HTML from `.article-body.no-wide-image` (up to 2 bold headings) |

#### Puppeteer Flags (CI-safe)

```js
args: [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-dev-shm-usage",
  "--disable-gpu",
];
```

These flags are required for running Puppeteer in a Linux CI environment without a display server.

---

### 2. Local Scraper — `scrape/local/ALLscrape.js`

A **development/testing version** of the scraper that writes output to local JSON files instead of Supabase. Useful for verifying scraping logic without affecting the database.

#### Output files (in `scrape/local/json/`)

| File              | Contents                                                      |
| ----------------- | ------------------------------------------------------------- |
| `scrapedURL.json` | Cumulative list of all URLs ever scraped (deduplication log)  |
| `newURL.json`     | URLs found in the latest run that were not previously scraped |
| `articles.json`   | Full article objects for all newly scraped articles           |

#### How it works

```
Step 1 — collectURLs()
  → Scrapes https://unread.today/category/7 for all article URLs
  → Compares against scrapedURL.json to find new URLs only
  → Updates scrapedURL.json and writes newURL.json

Step 2 — scrapeArticles()
  → Skips if no new URLs found
  → Scrapes each new URL for article data
  → Appends results to articles.json
```

#### Running locally

```bash
cd Server/scrape/local
node ALLscrape.js
```

---

## GitHub Actions — `.github/workflows/scraper.yml`

The GitHub Actions workflow automates the production scraper on a daily schedule.

### Trigger

| Trigger       | Details                                                                  |
| ------------- | ------------------------------------------------------------------------ |
| **Scheduled** | Daily at **03:00 UTC** (`cron: '0 3 * * *'`)                             |
| **Manual**    | Via the "Run workflow" button in GitHub Actions UI (`workflow_dispatch`) |

### Job: `scrape`

Runs on `ubuntu-latest`.

#### Steps

```
1. Checkout repo          → actions/checkout@v4
2. Setup Node.js 20       → actions/setup-node@v4
3. npm install            → installs puppeteer, supabase-js, dotenv
4. Install Puppeteer deps → apt-get installs system libs required by Chromium
5. Run scraper            → node scrape/ALLsupabase.js
```

#### System libraries installed for Puppeteer (Step 4)

| Library              | Purpose                                      |
| -------------------- | -------------------------------------------- |
| `libnss3`            | NSS security services (required by Chromium) |
| `libatk-bridge2.0-0` | Accessibility toolkit bridge                 |
| `libx11-xcb1`        | X11 client-side library (XCB)                |
| `libxcb-dri3-0`      | DRI3 XCB extension                           |
| `libdrm2`            | Direct Rendering Manager                     |
| `libgbm1`            | Mesa GBM (GPU buffer management)             |
| `libxshmfence1`      | X shared memory fence                        |
| `libasound2t64`      | ALSA sound library                           |

#### Secrets required

Configure these in **GitHub → Settings → Secrets and variables → Actions**:

| Secret                      | Description                     |
| --------------------------- | ------------------------------- |
| `SUPABASE_URL`              | Your Supabase project URL       |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (admin access) |

#### Full Workflow YAML

```yaml
name: Daily Scraper

on:
  schedule:
    - cron: "0 3 * * *" # runs daily at 03:00 UTC
  workflow_dispatch: # allows manual run button

jobs:
  scrape:
    runs-on: ubuntu-latest

    defaults:
      run:
        working-directory: Server

    env:
      SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
      SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}

    steps:
      - name: Checkout repo
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: npm install

      - name: Install Puppeteer dependencies
        run: |
          sudo apt-get update
          sudo apt-get install -y \
            libnss3 libatk-bridge2.0-0 libx11-xcb1 \
            libxcb-dri3-0 libdrm2 libgbm1 libxshmfence1 libasound2t64

      - name: Run scraper
        run: node scrape/ALLsupabase.js
```

---

## Data Flow

```
GitHub Actions (03:00 UTC daily)
        │
        ▼
  ALLsupabase.js
        │
        ├─ Step 1: Puppeteer → unread.today/category/7
        │           Collects article URLs
        │
        └─ Step 2: Puppeteer → each article URL
                    Extracts title, date, image, body
                    │
                    ▼
              Supabase DB (articles table)
                    │
                    ▼
              Client / Frontend reads articles
```
