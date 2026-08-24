"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { anyApi, type FunctionReference } from "convex/server";
import type { Id } from "../convex/_generated/dataModel";
import { api } from "../convex/_generated/api";
import { formatDate } from "./article-card";
import type { Article } from "./article-types";
import { useReadingState } from "./use-reading-state";

type SourceQuality = "primary" | "expert" | "publication" | "community";

type RouteSource = {
  _id: Id<"sources">;
  _creationTime: number;
  name: string;
  slug: string;
  siteUrl: string;
  feedUrl?: string;
  apiUrl?: string;
  kind: "rss" | "api" | "web";
  category: string;
  enabled: boolean;
  createdAt: number;
  updatedAt?: number;
  recommended?: boolean;
  rank?: number;
  description?: string;
  tags?: string[];
  quality?: SourceQuality;
  priority?: number;
};

const getSourceRoute = anyApi.routes.getSource as FunctionReference<
  "query",
  "public",
  { key: string },
  RouteSource | null
>;

export function SourceRouteView({ sourceKey }: { sourceKey: string }) {
  const router = useRouter();
  const reading = useReadingState();
  const [shared, setShared] = useState(false);
  const source = useQuery(getSourceRoute, { key: sourceKey });
  const result = useQuery(
    api.articles.listBySource,
    source ? { sourceId: source._id, limit: 60 } : "skip",
  ) as { articles: Article[]; articleCount: number; countCapped: boolean } | undefined;

  const groups = useMemo(() => groupArticles(result?.articles ?? []), [result?.articles]);

  useEffect(() => {
    if (source && sourceKey !== source.slug) {
      router.replace(`/source/${source.slug}`);
    }
  }, [router, source, sourceKey]);

  function goBack() {
    if (window.history.length > 1) router.back();
    else router.push("/");
  }

  function openArticle(article: Article) {
    reading.markRead(article._id);
    router.push(`/article/${article._id}`);
  }

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: source?.name ?? "Findit source", url });
      } else {
        await navigator.clipboard.writeText(url);
        setShared(true);
        window.setTimeout(() => setShared(false), 1600);
      }
    } catch {
      // A canceled share sheet needs no UI error.
    }
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#050607] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-28 size-80 rounded-full bg-cyan-300/[0.055] blur-[110px]" />
        <div className="absolute -right-32 top-1/3 size-72 rounded-full bg-violet-400/[0.04] blur-[120px]" />
      </div>

      <div className="relative mx-auto min-h-screen w-full max-w-3xl px-4 pb-12 sm:px-6">
        <header className="sticky top-0 z-10 -mx-4 flex items-center justify-between gap-2 border-b border-white/[0.07] bg-[#050607]/90 px-4 py-3.5 backdrop-blur-2xl sm:-mx-6 sm:px-6">
          <button
            type="button"
            onClick={goBack}
            className="rounded-xl border border-white/10 px-3 py-2 text-sm font-medium text-white/60 transition hover:bg-white/[0.05] hover:text-white"
          >
            ← Back
          </button>
          <div className="flex items-center gap-2">
            {source ? (
              <button
                type="button"
                onClick={() => void share()}
                className="rounded-xl border border-white/10 px-3 py-2 text-xs font-medium text-white/48 transition hover:bg-white/[0.05] hover:text-white"
              >
                {shared ? "Copied" : "Share"}
              </button>
            ) : null}
            {source ? (
              <a
                href={source.siteUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-white/10 px-3 py-2 text-xs font-medium text-white/48 transition hover:bg-white/[0.05] hover:text-white"
              >
                Visit ↗
              </a>
            ) : null}
          </div>
        </header>

        {source === undefined || (source && result === undefined) ? (
          <SourcePageSkeleton />
        ) : source === null ? (
          <div className="py-20 text-center">
            <p className="text-sm text-white/40">Source not found.</p>
            <Link href="/" className="mt-5 inline-flex rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-zinc-950">
              Go to Home
            </Link>
          </div>
        ) : (
          <div className="py-6">
            <SourceProfile source={source} result={result!} />

            <section className="mt-5 overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.025]">
              <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-4 sm:px-5">
                <div>
                  <h2 className="text-sm font-semibold text-white/82">Latest stories</h2>
                  <p className="mt-0.5 text-xs text-white/30">Newest indexed coverage from this source</p>
                </div>
                <span className="shrink-0 text-[11px] text-white/28">{result!.articles.length} shown</span>
              </div>

              {result!.articles.length === 0 ? (
                <div className="px-5 py-14 text-center text-sm text-white/35">
                  No indexed stories from this source yet.
                </div>
              ) : (
                <div>
                  {groups.map((group) => (
                    <section key={group.key}>
                      <div className="border-b border-white/[0.06] bg-white/[0.018] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/28 sm:px-5">
                        {group.label}
                      </div>
                      <div className="divide-y divide-white/[0.06]">
                        {group.articles.map((article) => (
                          <SourceStoryRow
                            key={article._id}
                            article={article}
                            saved={reading.savedSet.has(article._id)}
                            read={reading.readSet.has(article._id)}
                            onOpen={openArticle}
                            onToggleSaved={reading.toggleSaved}
                          />
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

function SourceProfile({
  source,
  result,
}: {
  source: RouteSource;
  result: { articles: Article[]; articleCount: number; countCapped: boolean };
}) {
  const latest = result.articles[0]?.publishedAt;

  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.055] text-sm font-semibold tracking-wide text-cyan-100/80">
          {source.name.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/32">
            <span>{source.category}</span>
            <span>·</span>
            <span>{qualityLabel(source.quality)}</span>
            {source.priority === 1 ? (
              <span className="rounded-full border border-cyan-300/20 bg-cyan-300/[0.06] px-2 py-0.5 text-cyan-100/65">
                Core
              </span>
            ) : null}
          </div>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-[-0.035em] text-white/92 sm:text-3xl">
            {source.name}
          </h1>
          {source.description ? (
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/42">{source.description}</p>
          ) : null}
        </div>
      </div>

      {source.tags && source.tags.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {source.tags.map((tag) => (
            <span key={tag} className="rounded-full border border-white/8 bg-white/[0.035] px-2.5 py-1 text-[10px] text-white/38">
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-5 grid grid-cols-3 overflow-hidden rounded-2xl border border-white/[0.08] bg-black/15">
        <SourceMetric
          label="Indexed"
          value={result.countCapped ? `${result.articleCount}+` : String(result.articleCount)}
        />
        <SourceMetric label="Latest" value={latest ? formatDate(latest) : "—"} />
        <SourceMetric label="Source" value={source.kind.toUpperCase()} last />
      </div>
    </section>
  );
}

function SourceMetric({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <div className={`px-3 py-3 text-center ${last ? "" : "border-r border-white/[0.07]"}`}>
      <div className="text-[10px] uppercase tracking-[0.12em] text-white/25">{label}</div>
      <div className="mt-1 truncate text-xs font-semibold text-white/66">{value}</div>
    </div>
  );
}

function SourceStoryRow({
  article,
  saved,
  read,
  onOpen,
  onToggleSaved,
}: {
  article: Article;
  saved: boolean;
  read: boolean;
  onOpen: (article: Article) => void;
  onToggleSaved: (id: Id<"articles">) => void;
}) {
  const author = cleanAuthor(article.author);

  return (
    <article className={`px-4 py-4 transition sm:px-5 ${read ? "opacity-55" : "opacity-100"}`}>
      <div className="flex items-start gap-3">
        <button type="button" onClick={() => onOpen(article)} className="min-w-0 flex-1 text-left">
          <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-white/30">
            <span>{formatDate(article.publishedAt)}</span>
            {author ? (
              <>
                <span>·</span>
                <span className="max-w-[16rem] truncate">{author}</span>
              </>
            ) : null}
            {typeof article.score === "number" ? (
              <>
                <span>·</span>
                <span>▲ {article.score}</span>
              </>
            ) : null}
            {typeof article.commentCount === "number" ? <span>· {article.commentCount} comments</span> : null}
            {read ? <span>· Read</span> : null}
          </div>
          <h3 className="mt-1.5 text-[15px] font-semibold leading-6 tracking-[-0.018em] text-white/88 transition hover:text-cyan-100 sm:text-base">
            {article.title}
          </h3>
          {article.description ? (
            <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-white/38">{article.description}</p>
          ) : null}
        </button>

        <button
          type="button"
          onClick={() => onToggleSaved(article._id)}
          aria-label={saved ? "Remove from saved" : "Save article"}
          className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border transition ${
            saved
              ? "border-cyan-300/30 bg-cyan-300/10 text-cyan-200"
              : "border-white/8 text-white/28 hover:border-white/18 hover:text-white"
          }`}
        >
          <BookmarkIcon filled={saved} />
        </button>
      </div>
    </article>
  );
}

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-3.5"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 4.75A1.75 1.75 0 0 1 7.75 3h8.5A1.75 1.75 0 0 1 18 4.75V21l-6-3.8L6 21V4.75Z" />
    </svg>
  );
}

function qualityLabel(quality?: SourceQuality) {
  if (quality === "primary") return "Primary source";
  if (quality === "expert") return "Expert source";
  if (quality === "publication") return "Publication";
  if (quality === "community") return "Community";
  return "Source";
}

function cleanAuthor(author?: string) {
  if (!author) return null;
  const cleaned = author.replace(/\s+/g, " ").trim();
  if (!cleaned || cleaned.length > 120) return null;
  return cleaned;
}

function groupArticles(articles: Article[]) {
  const groups = new Map<string, { key: string; label: string; articles: Article[] }>();
  const today = startOfDay(Date.now());
  const yesterday = today - 86_400_000;

  for (const article of articles) {
    const day = startOfDay(article.publishedAt);
    const key = String(day);
    let label: string;
    if (day === today) label = "Today";
    else if (day === yesterday) label = "Yesterday";
    else label = new Date(article.publishedAt).toLocaleDateString(undefined, { month: "long", day: "numeric" });

    const existing = groups.get(key);
    if (existing) existing.articles.push(article);
    else groups.set(key, { key, label, articles: [article] });
  }

  return [...groups.values()];
}

function startOfDay(timestamp: number) {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function SourcePageSkeleton() {
  return (
    <div className="space-y-5 py-6">
      <div className="h-52 animate-pulse rounded-[1.75rem] border border-white/8 bg-white/[0.025]" />
      <div className="overflow-hidden rounded-[1.75rem] border border-white/8 bg-white/[0.02]">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-28 animate-pulse border-b border-white/[0.06] bg-white/[0.015]" />
        ))}
      </div>
    </div>
  );
}
