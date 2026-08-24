# Findit Technical Architecture

## 1. Purpose

Findit is a mobile-first technology and AI news discovery application. It maintains a configurable list of sources, ingests articles from those sources, stores normalized article data in Convex, and renders the latest feed in a Next.js client.

Current product views:

- **Home** — latest ingested articles.
- **Finder** — source discovery/search.
- **Settings** — source management and manual synchronization.

The UI uses a persistent bottom navigation designed for mobile first and scales to larger browser widths.

---

## 2. Technology Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 16.3.2 App Router |
| UI | React 19.2.8 + Tailwind CSS 4 |
| Backend | Convex 1.45.0 |
| Database | Convex document database |
| Scraping | Cheerio 1.1.2 |
| Article extraction | Mozilla Readability 0.6.0 |
| DOM implementation | Linkedom 0.18.12 |
| Hosting | Vercel |
| Language | TypeScript 7 |

Primary runtime dependencies are defined in `package.json`.

---

## 3. Repository Structure

```text
Findit/
├── app/
│   ├── ConvexClientProvider.tsx
│   ├── article-feed.tsx
│   ├── source-finder.tsx
│   ├── source-manager.tsx
│   ├── sources-list.tsx
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── convex/
│   ├── _generated/
│   ├── articles.ts
│   ├── scraper.ts
│   ├── schema.ts
│   ├── seed.ts
│   ├── sourceDefaults.ts
│   └── sources.ts
├── .env.example
├── next.config.ts
├── package.json
├── tsconfig.json
├── vercel.json
└── TECHNICAL.md
```

---

## 4. Frontend Architecture

### `app/page.tsx`

The main application shell controls the three top-level views:

```text
Home
Finder
Settings
```

Navigation is handled client-side with a persistent bottom navigation bar.

### `app/article-feed.tsx`

Reads the latest article records from Convex using the `articles.listLatest` query and renders them on Home.

Displayed article information currently includes:

- source name
- publish time/date
- title
- description when available
- link to the original article

### `app/source-finder.tsx`

Reads enabled sources from Convex and provides client-side source search and category filtering.

### `app/source-manager.tsx`

Settings-side source administration.

Supported operations:

- add source
- edit source
- enable/disable source
- sync one source
- sync all enabled sources

Recommended sources are bootstrapped into Convex but subsequent user edits are preserved.

---

## 5. Convex Data Model

The schema is defined in `convex/schema.ts`.

### `sources`

Represents a news or technical information source.

Core fields:

```text
name
slug
siteUrl
feedUrl?
apiUrl?
kind
category
enabled
createdAt
updatedAt?
recommended?
rank?
```

Supported source kinds:

```text
rss
api
web
```

Indexes:

```text
by_slug
by_enabled
```

### `articles`

Stores normalized articles discovered by ingestion.

Core fields include:

```text
title
url
sourceId
sourceName
publishedAt
discoveredAt
topic?
description?
externalId?
author?
imageUrl?
canonicalUrl?
content?
```

Indexes include:

```text
by_url
by_source
by_published_at
```

The URL index is used to prevent duplicate article records.

---

## 6. Source Management

`convex/sources.ts` owns source queries and mutations.

Important operations include:

- `list` — enabled sources for the application.
- `listAll` — complete source list for Settings.
- `ensureRecommended` — inserts missing recommended sources without replacing user edits.
- `create` — creates a custom source.
- `update` — edits an existing source.
- `setEnabled` — enables or disables ingestion for a source.

Internal source queries are also exposed for scraper actions.

Recommended defaults live in `convex/sourceDefaults.ts`.

Current recommended source set is focused on high-signal technology and AI coverage, including primary AI labs, engineering platforms, community signal, and established technical publications.

---

## 7. Scraper Architecture

The scraper is implemented in `convex/scraper.ts` as a Convex Node action.

### Current pipeline

```text
Source
  ↓
Fetch source website HTML
  ↓
Cheerio discovers candidate article links
  ↓
Fetch candidate article HTML
  ↓
Linkedom creates a DOM
  ↓
Mozilla Readability extracts article content
  ↓
Metadata normalization
  ↓
URL deduplication
  ↓
Convex articles table
  ↓
Home feed
```

### Extracted data

The scraper attempts to normalize:

- title
- article URL
- canonical URL
- published date
- author
- description
- image
- readable article text

### Limits

To keep actions bounded, scraping limits the number of candidate articles processed per source.

A scrape result reports values such as:

```text
discovered
processed
created
updated
skipped
needsBrowser
```

`needsBrowser` indicates that ordinary server-side HTML fetching did not expose enough usable content and that the source may require a browser-rendering fallback.

---

## 8. RSS and API Sources

The source model supports `rss`, `api`, and `web` because different publishers expose data differently.

The current scraper path is primarily HTML/web extraction. RSS and API URLs are stored so ingestion can later use source-specific adapters where they provide cleaner or more reliable data.

Long-term ingestion priority should be:

```text
API or RSS when structured data is reliable
              ↓
HTML scraper as universal fallback
              ↓
Browser renderer for JavaScript-heavy sites
```

All ingestion methods should normalize into the same `articles` schema.

---

## 9. Deployment

Vercel is configured through `vercel.json` to deploy Convex before building the Next.js application:

```bash
npx convex deploy --cmd-url-env-var-name NEXT_PUBLIC_CONVEX_URL --cmd 'npm run build'
```

This ensures the frontend is built against the Convex deployment receiving the latest functions and schema.

Required Vercel environment variables include:

```text
NEXT_PUBLIC_CONVEX_URL
CONVEX_DEPLOY_KEY
```

`CONVEX_DEPLOY_KEY` is secret and must never be committed to the repository.

Build sequence:

```text
Git push
  ↓
Vercel build starts
  ↓
Convex deploy
  ↓
NEXT_PUBLIC_CONVEX_URL injected
  ↓
Next.js production build
  ↓
Vercel deployment
```

---

## 10. Local Development

Install dependencies:

```bash
npm install
```

Start Convex development:

```bash
npm run convex:dev
```

Start Next.js:

```bash
npm run dev
```

Production frontend build:

```bash
npm run build
```

The repository also contains a Convex seed command:

```bash
npm run convex:seed
```

---

## 11. Current Security Model

There is currently no authenticated administration layer.

Source-management mutations and scraper actions are callable from the client. This is acceptable for the current prototype but must not remain unrestricted before a public production launch.

Before multi-user/public release:

1. add authentication
2. restrict source-management mutations to an administrator
3. restrict scraper actions or move synchronization behind trusted internal/scheduled functions
4. add rate limiting where appropriate

---

## 12. Known Limitations

### No browser-rendering fallback yet

The current scraper uses fetched HTML only. JavaScript-heavy websites may return `needsBrowser: true`.

A future fallback can use Playwright or another managed browser environment, but Chromium is not currently bundled into the Convex action runtime.

### Manual synchronization

Settings currently provides explicit source synchronization. Automatic periodic ingestion should be moved to scheduled Convex jobs once the scraper behavior is stable.

### Generic article-link discovery

The scraper intentionally avoids per-site selectors where possible. Generic discovery reduces maintenance but may produce weaker results on unusual sites. Source-specific adapters can be introduced for important publishers when needed.

### Public administration

Source editing is not protected by authentication yet.

---

## 13. Recommended Next Technical Steps

1. Add scheduled Convex ingestion.
2. Add dedicated RSS parsing.
3. Add Hacker News/API ingestion adapter.
4. Add browser fallback for JavaScript-only sources.
5. Add scraper health fields to each source, such as last sync time and last error.
6. Add authenticated admin access for Settings.
7. Add article search and topic classification.
8. Add retention/deduplication rules as article volume grows.

---

## 14. Design Principle

Findit should keep ingestion complexity behind one normalized article model:

```text
RSS ─────┐
API ─────┼──→ normalize → Convex articles → Findit UI
Scraper ─┤
Browser ─┘
```

The frontend should not need to know how an article was collected. It should only consume clean, normalized article data from Convex.
