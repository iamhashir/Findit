# Technical Decisions

This file records decisions that are important enough that a future developer or coding agent should understand the reason before replacing them.

## 1. Convex is the application backend

**Decision:** Use Convex for source configuration, article storage, queries, mutations, actions, and ingestion state.

**Why:** The app already uses Convex end-to-end, including reactive client queries and server-side actions. Keeping source management and article ingestion in one backend reduces duplicated infrastructure.

**Revisit when:** A workload cannot be handled appropriately by Convex or requires a specialized external service.

## 2. Vercel builds deploy Convex before the frontend build

**Decision:** Keep the Convex deploy step in `vercel.json` so the frontend build receives the deployment URL for the backend it was built against.

**Why:** The app previously reached production with frontend/backend deployment mismatch and failed after hydration.

**Revisit when:** Deployment environments are redesigned or Convex production/staging deployment handling changes.

## 3. Scrape with lightweight HTML tools first

**Decision:** Use Cheerio for HTML inspection and Mozilla Readability for article extraction. Use `linkedom` to provide the DOM Readability expects.

**Why:** This path is fast, inexpensive, and deploys cleanly without bundling a browser runtime.

**Limitation:** JavaScript-heavy pages can return `needsBrowser: true`.

**Revisit when:** Browser-required sources become important enough to justify a Playwright/browser worker.

## 4. Keep RSS and APIs even though Findit has a scraper

**Decision:** Support `rss`, `api`, and `web` source types instead of forcing every source through scraping.

**Why:** RSS and APIs are usually more structured and stable than webpage extraction. Web scraping remains the fallback and general-purpose path.

**Preferred order:** Use a clean API or RSS feed when it clearly offers better structured ingestion; use Web scraping when needed.

## 5. Normalize all ingestion into one article model

**Decision:** Regardless of how an item is discovered, store it in the same `articles` table and deduplicate by URL/canonical URL where possible.

**Why:** Home and future ranking/search features should not care whether an article came from RSS, an API, or a scraper.

## 6. Keep the product UI functional and low-copy

**Decision:** Prefer direct labels and functional controls over marketing slogans or explanatory filler inside the app.

**Why:** Findit is intended to be a compact mobile-first information tool. Interface text should help the user act, not occupy space.

## 7. Keep repository documentation minimal

**Decision:** The core bookkeeping set is `README.md`, `TECHNICAL.md`, `CHANGELOG.md`, `DECISIONS.md`, and `.env.example`.

**Why:** These files cover setup, architecture, history, rationale, and configuration without creating documentation overhead too early.

## Maintenance

Add a new numbered decision only when the choice has architectural, operational, security, cost, or long-term maintenance consequences. Do not use this file as a task list or changelog. If a decision is replaced, keep the old entry and mark it superseded with a reference to the new decision.
