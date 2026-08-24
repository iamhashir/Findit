# Changelog

Tracks meaningful product, backend, infrastructure, and architecture changes. Keep entries short and user-impact focused.

## 2026-08-24

### Added
- Added editable source management in Settings.
- Added the initial recommended technology and AI source set.
- Added source types for RSS, API, and Web ingestion.
- Added Cheerio + Mozilla Readability article scraping in Convex.
- Added article discovery, extraction, deduplication, and persistence to the `articles` table.
- Added per-source and enabled-source sync controls.
- Added hourly scheduled Convex ingestion for enabled sources.
- Added the scraped article feed on Home.
- Added `TECHNICAL.md` with the current architecture and operational notes.

### Changed
- Simplified the mobile UI and removed non-functional marketing copy.
- Finder now derives source categories from live backend data.
- Vercel builds now deploy Convex before building the Next.js frontend.

### Fixed
- Fixed the production Convex/frontend deployment mismatch that caused the deployed app to fail after hydration.
- Fixed Convex generated API typing issues introduced while adding scraper actions.

## Maintenance

When a meaningful feature, behavior, schema, deployment flow, or dependency changes, add a short entry under the current date. Do not log trivial formatting or typo-only changes.
