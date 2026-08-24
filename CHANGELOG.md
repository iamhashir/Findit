# Changelog

Tracks meaningful product, backend, infrastructure, and architecture changes. Keep entries short and user-impact focused.

## 2026-08-24

### Added
- Added editable source management in Settings.
- Expanded the curated source catalog to 50 technology, AI, research, engineering, infrastructure, security, language, publication, and community sources.
- Added source quality tiers, priority, descriptions, and coverage tags for curated sources.
- Added source health tracking for sync attempts, successes, failures, errors, duration, discovered/new/updated/skipped counts, and consecutive failures.
- Added a source health audit dashboard with Healthy, Attention, Failing, and Unchecked summaries plus health filtering.
- Added per-source data completeness audits for recent descriptions, authors, and images.
- Added source types for RSS, API, and Web ingestion.
- Added dedicated RSS and Atom feed parsing for RSS sources.
- Added Hacker News API ingestion with points and comment counts.
- Added article discovery, extraction, deduplication, and persistence to the `articles` table.
- Added per-source and enabled-source sync controls.
- Added adaptive scheduled Convex ingestion for enabled sources.
- Added Latest and Trending Home feeds with topic and unread filters.
- Added source-driven story clustering that groups strongly overlapping recent headlines across publications.
- Added expandable coverage cards with primary coverage, additional sources, and Hacker News discussion context.
- Added global article/source search.
- Added broad article search across titles, descriptions, authors, source names, and topics.
- Added URL-backed search state so search terms and topic filters survive reloads and can be shared.
- Added in-app article highlights with original-source links.
- Added dedicated source pages with source metadata, indexed story counts, latest stories, and original-site links.
- Added real `/search`, `/saved`, `/article/[id]`, and `/source/[slug]` routes with reload-safe data loading.
- Added shareable Findit article and source URLs with browser Back/Forward support.
- Added browser-local Save/Read Later and read/unread state.
- Added load-more support for larger feed browsing sessions.
- Added `TECHNICAL.md` with the current architecture and operational notes.

### Changed
- Optimized Convex usage for the free plan: article records now persist lightweight highlights and metadata instead of full article bodies.
- Existing stored article bodies are compacted in bounded background batches and summaries are capped to a small highlight payload.
- RSS, Hacker News, and web ingestion now write each source batch through one mutation instead of one mutation per article.
- Unchanged articles now perform zero article/search writes, reducing database I/O and reactive query invalidations.
- Scheduled ingestion now syncs only sources that are due: Hacker News remains hourly while other RSS/API and web sources use priority-based 2–24 hour cadences.
- Web scraping now extracts title, summary, author, date, image, and canonical URL without Readability/full-body extraction.
- Home clustering reads a smaller recent sample and feed sessions cap their expanded result set at 60 stories.
- Source pages use a source+published-time index and read only the displayed highlights instead of scanning up to 500 article documents.
- Search now uses one denormalized metadata search index; legacy search rows are upgraded during the bounded article compaction migration.
- Settings now uses one combined source/health subscription and no longer scans recent articles for every source health row.
- Removed the global source-list subscription, app-start source-catalog mutation, and client-side search-backfill loop.
- Manual source management now defaults to `Sync due` rather than fanning out across the entire catalog.
- The article reader now presents a concise Findit highlight and hands off to the canonical publisher for the complete story.
- Redesigned the main app shell around a lighter editorial hierarchy, softer glass controls, calmer navigation, and reduced nested-card chrome.
- Home now promotes one lead story or developing multi-source story, then switches to denser secondary story rows for faster scanning.
- Story clusters now emphasize developing coverage, source comparison, and Hacker News discussion without dominating the feed.
- Search now uses a dedicated discovery layout with topic shortcuts, clearer source results, a stronger search field, and cleaner empty/result states.
- Saved now behaves like a reading library with queue context and clearer unread status instead of another generic feed card.
- Added consistent press feedback, focus visibility, subtle page/feed motion, reduced-motion support, and a richer dark canvas treatment across the app.
- Source synchronization now routes RSS sources through their configured feed URLs, Hacker News through its API, and keeps lightweight HTML metadata scraping as the fallback for other source types.
- Every manual and scheduled source sync updates a shared health record, including failures previously absorbed by full-catalog sync.
- Settings source management supports source search, category and health filtering, quality labels, core-source badges, expandable audits, and due-source sync.
- Dedicated source pages use a denser publication-style view with source profiles, coverage tags, quality tier, indexed/latest metrics, date grouping, author metadata, and compact story rows.
- Primary mobile navigation is Home, Search, and Saved; Settings moved to the header.
- Trending gives a bounded boost to stories independently covered by multiple sources.
- Home, Search, Saved, article cards, and source cards navigate through Next.js routes instead of local full-screen selection state.
- Article Share shares the Findit article URL while the original publication remains a separate source link.
- Source names in Home, Search, and Saved open native Findit source pages instead of forcing an external navigation.
- Simplified the mobile UI and removed non-functional marketing copy.
- Vercel builds deploy Convex before building the Next.js frontend.

### Fixed
- Fixed the production Convex/frontend deployment mismatch that caused the deployed app to fail after hydration.
- Fixed Convex generated API typing issues introduced while adding scraper actions.

## Maintenance

When a meaningful feature, behavior, schema, deployment flow, or dependency changes, add a short entry under the current date. Do not log trivial formatting or typo-only changes.
