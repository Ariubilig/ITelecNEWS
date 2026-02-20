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