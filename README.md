Unread.today
     ↓
Puppeteer Scraper (Node)
     ↓
Supabase (Postgres)
     ↓
API / Supabase Client
     ↓
Client


          ┌──────────────┐
          │ unread.today │
          └──────┬───────┘
                 │
          CollectURL.js - newURL.json (TEMP)
                 │
          ScrapeArticles.js
        ┌────────┴─────────┐
        │                  │
 scrapedURL.json      articles.json / DB
 (memory)              (REAL DATA)
                             │
                         Client
