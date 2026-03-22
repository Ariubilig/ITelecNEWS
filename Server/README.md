The `Server` directory is the **backend engine** of ITelecNEWS. It is a Node.js application responsible for scraping telecom news articles from [unread.today/category/7](https://unread.today/category/7) and storing them in a Supabase database.


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