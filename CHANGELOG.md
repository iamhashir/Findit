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
- Added in-app article reading with original-source links.
- Added dedicated source pages with source metadata, indexed story counts, latest stories, and original-site links.
- Added browser-local Save/Read Later and read/unread state.
- Added load-more support for larger feed browsing sessions.
- Added `TECHNICAL.md` with the current architecture and operational notes.

### Changed
- Source synchronization now routes RSS sources through their configured feed URLs, Hacker News through its API, and keeps HTML scraping as the fallback for other source types.
- Manual Settings sync and scheduled hourly sync now share the same ingestion router.
- Primary mobile navigation is now Home, Search, and Saved; Settings moved to the header.
- Home now clusters matching multi-source coverage while keeping single-source stories as normal feed cards.
- Trending gives a bounded boost to stories independently covered by multiple sources.
- Source names in Home, Search, and Saved now open native Findit source pages instead of forcing an external navigation.
- Simplified the mobile UI and removed non-functional marketing copy.
- Vercel builds now deploy Convex before building the Next.js frontend.

### Fixed
- Fixed the production Convex/frontend deployment mismatch that caused the deployed app to fail after hydration.
- Fixed Convex generated API typing issues introduced while adding scraper actions.

## Maintenance

When a meaningful feature, behavior, schema, deployment flow, or dependency changes, add a short entry under the current date. Do not log trivial formatting or typo-only changes.
