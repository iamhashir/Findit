# Changelog

Tracks meaningful product, backend, infrastructure, and architecture changes. Keep entries short and user-impact focused.

## 2026-08-24

### Added
- Added editable source management in Settings.
- Added the initial recommended technology and AI source set.
- Added source types for RSS, API, and Web ingestion.
- Added Cheerio + Mozilla Readability article scraping in Convex.
- Added dedicated RSS and Atom feed parsing for RSS sources.
- Added Hacker News API ingestion with points and comment counts.
- Added article discovery, extraction, deduplication, and persistence to the `articles` table.
- Added per-source and enabled-source sync controls.
- Added hourly scheduled Convex ingestion for enabled sources.
- Added Latest and Trending Home feeds with topic and unread filters.
- Added source-driven story clustering that groups strongly overlapping recent headlines across publications.
- Added expandable coverage cards with primary coverage, additional sources, and Hacker News discussion context.
- Added global article/source search.
- Added broad article search across titles, descriptions, authors, source names, and topics.
- Added URL-backed search state so search terms and topic filters survive reloads and can be shared.
- Added bounded background backfill for the broad search index while keeping title search available during migration.
- Added in-app article reading with original-source links.
- Added dedicated source pages with source metadata, indexed story counts, latest stories, and original-site links.
- Added real `/search`, `/saved`, `/article/[id]`, and `/source/[slug]` routes with reload-safe data loading.
- Added shareable Findit article and source URLs with browser Back/Forward support.
- Added browser-local Save/Read Later and read/unread state.
- Added load-more support for larger feed browsing sessions.
- Added `TECHNICAL.md` with the current architecture and operational notes.

### Changed
- Source synchronization now routes RSS sources through their configured feed URLs, Hacker News through its API, and keeps HTML scraping as the fallback for other source types.
- Manual Settings sync and scheduled hourly sync now share the same ingestion router.
- Primary mobile navigation is now Home, Search, and Saved; Settings moved to the header.
- Home now clusters matching multi-source coverage while keeping single-source stories as normal feed cards.
- Trending gives a bounded boost to stories independently covered by multiple sources.
- Search now prioritizes title matches, then broad metadata matches, and keeps query/topic state in `/search?q=...&topic=...`.
- New and refreshed articles now update the broad search index transactionally during ingestion.
- Home, Search, Saved, article cards, and source cards now navigate through Next.js routes instead of local full-screen selection state.
- Article Share now shares the Findit article URL while View original remains a separate source link.
- Source names in Home, Search, and Saved now open native Findit source pages instead of forcing an external navigation.
- Simplified the mobile UI and removed non-functional marketing copy.
- Vercel builds now deploy Convex before building the Next.js frontend.

### Fixed
- Fixed the production Convex/frontend deployment mismatch that caused the deployed app to fail after hydration.
- Fixed Convex generated API typing issues introduced while adding scraper actions.

## Maintenance

When a meaningful feature, behavior, schema, deployment flow, or dependency changes, add a short entry under the current date. Do not log trivial formatting or typo-only changes.
