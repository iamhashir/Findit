# Findit

Findit is a free, developer-focused technology news and trends aggregator. The goal is to make it easy for software engineers to keep up with important changes across AI, web development, cloud, DevOps, security, open source, and the broader software industry — without adding AI-generated analysis to the product.

## Vision

Software engineering changes quickly and useful updates are scattered across company blogs, engineering blogs, GitHub, RSS feeds, and developer communities. Findit brings those sources into one clean feed so developers can discover what is changing from the original sources.

## MVP

The first version will focus on:

- A unified feed of developer and technology news
- RSS and public API based ingestion
- Topics such as AI, Web, Cloud, DevOps, Security, and Open Source
- Filtering by topic and source
- Latest and popular views
- A directory of tracked sources
- Deduplication so the same story is not shown repeatedly
- Direct links back to the original source
- Bookmarks as a later addition

## Tech Stack

- **Next.js** — full-stack React framework
- **TypeScript** — application language
- **Tailwind CSS** — styling
- **shadcn/ui** — reusable UI components
- **Convex** — database, backend functions, and scheduled ingestion jobs
- **Vercel** — deployment and hosting

## Architecture

```text
RSS feeds / Public APIs / Developer sources
                  |
                  v
        Convex scheduled jobs
                  |
                  v
       Normalize + deduplicate
                  |
                  v
             Convex DB
                  |
                  v
          Next.js application
                  |
                  v
              Vercel
```

## Initial Data Sources

Findit will prioritize official and primary sources where possible, including:

- GitHub Blog
- Vercel Blog
- Cloudflare Blog
- Hacker News
- Framework and open-source project blogs
- Engineering blogs from major technology companies
- RSS feeds from trusted developer publications

More sources can be added over time through a central source configuration.

## Planned Pages

### Home
A chronological feed of the latest stories with topic and source filters.

### Topics
Browse stories grouped into categories such as AI, Web, Cloud, DevOps, Security, and Open Source.

### Sources
See all publications, engineering blogs, projects, and feeds tracked by Findit.

### Story
Display story metadata and provide a clear path to the original article rather than republishing its content.

## Principles

1. **Free-first** — keep infrastructure within free tiers while the project is small.
2. **Source-first** — send readers to original reporting and official announcements.
3. **No AI dependency** — the initial product works entirely through feeds, APIs, metadata, and deterministic rules.
4. **Simple architecture** — one Next.js application backed by Convex.
5. **Useful over noisy** — prioritize high-quality developer sources and deduplicate aggressively.

## Development

The project will be built with Next.js, TypeScript, Tailwind CSS, and Convex.

Once the application is scaffolded, local development will generally look like:

```bash
npm install
npm run dev
```

Convex development will run alongside the Next.js application once it is configured.

## Roadmap

- [ ] Scaffold Next.js + TypeScript project
- [ ] Configure Tailwind CSS and shadcn/ui
- [ ] Set up Convex
- [ ] Define sources and article schema
- [ ] Implement RSS ingestion
- [ ] Add scheduled source refreshes
- [ ] Normalize and deduplicate stories
- [ ] Build home feed
- [ ] Add topic/source filtering
- [ ] Build sources directory
- [ ] Deploy to Vercel
- [ ] Add bookmarks and user accounts if needed

## Contributing

Findit is currently at the MVP stage. Issues and pull requests for useful sources, ingestion improvements, UI improvements, and bug fixes are welcome as the project develops.

## License

A license has not been selected yet.
