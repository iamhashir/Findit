"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { anyApi, type FunctionReference } from "convex/server";
import {
  ArrowLeft,
  ArrowUpRight,
  Bookmark,
  Check,
  MessageCircle,
  Share2,
} from "lucide-react";
import { motion } from "motion/react";
import type { Id } from "../convex/_generated/dataModel";
import { api } from "../convex/_generated/api";
import { formatDate } from "./article-card";
import type { Article } from "./article-types";
import { SourceAvatar } from "./source-avatar";
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
    source ? { sourceId: source._id, limit: 40 } : "skip",
  ) as { articles: Article[]; articleCount: number; countCapped: boolean } | undefined;

  const groups = useMemo(() => groupArticles(result?.articles ?? []), [result?.articles]);

  useEffect(() => {
    if (source && sourceKey !== source.slug) router.replace(`/source/${source.slug}`);
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
      // Ignore canceled native share sheets.
    }
  }

  return (
    <main className="app-canvas min-h-screen text-white">
      <div className="mx-auto min-h-screen w-full max-w-5xl px-4 pb-16 sm:px-6 lg:px-8">
        <header className="sticky top-0 z-30 -mx-4 flex h-14 items-center justify-between border-b border-white/[0.07] bg-[#0a0a0a]/92 px-4 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <button
            type="button"
            onClick={goBack}
            aria-label="Go back"
            className="flex size-9 items-center justify-center rounded-lg text-white/42 transition hover:bg-white/[0.055] hover:text-white"
          >
            <ArrowLeft className="size-[18px]" />
          </button>

          <div className="flex items-center gap-1">
            {source ? (
              <button
                type="button"
                onClick={() => void share()}
                aria-label="Share source"
                className="flex size-9 items-center justify-center rounded-lg text-white/40 transition hover:bg-white/[0.055] hover:text-white"
              >
                {shared ? <Check className="size-4" /> : <Share2 className="size-4" />}
              </button>
            ) : null}
            {source ? (
              <a
                href={source.siteUrl}
                target="_blank"
                rel="noreferrer"
                aria-label={`Open ${source.name}`}
                className="flex size-9 items-center justify-center rounded-lg text-white/40 transition hover:bg-white/[0.055] hover:text-white"
              >
                <ArrowUpRight className="size-4" />
              </a>
            ) : null}
          </div>
        </header>

        {source === undefined || (source && result === undefined) ? (
          <SourcePageSkeleton />
        ) : source === null ? (
          <div className="flex min-h-[65vh] flex-col items-center justify-center text-center">
            <h1 className="text-xl font-semibold text-white/75">Source not found</h1>
            <Link href="/" className="mt-5 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-zinc-950">
              Home
            </Link>
          </div>
        ) : (
          <div className="py-7 sm:py-10">
            <SourceProfile source={source} result={result!} />

            <section className="mt-9">
              <div className="flex items-end justify-between gap-4 border-b border-white/[0.075] pb-4">
                <div>
                  <h2 className="text-lg font-semibold tracking-[-0.025em] text-white/82">Latest stories</h2>
                  <p className="mt-0.5 text-xs text-white/30">{result!.articles.length} shown</p>
                </div>
              </div>

              {result!.articles.length === 0 ? (
                <div className="py-16 text-center text-sm text-white/32">No indexed stories yet.</div>
              ) : (
                <div>
                  {groups.map((group) => (
                    <section key={group.key}>
                      <div className="sticky top-14 z-10 border-b border-white/[0.05] bg-[#0a0a0a]/95 py-2.5 text-[10px] font-semibold uppercase tracking-[0.13em] text-white/25 backdrop-blur-xl">
                        {group.label}
                      </div>
                      <div>
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
    <section className="border-b border-white/[0.075] pb-8 sm:pb-10">
      <div className="flex items-start gap-4 sm:gap-5">
        <SourceAvatar url={source.siteUrl} name={source.name} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-medium uppercase tracking-[0.11em] text-white/28">
            <span>{source.category}</span>
            <span>·</span>
            <span>{qualityLabel(source.quality)}</span>
            {source.priority === 1 ? (
              <span className="rounded-md bg-white/[0.055] px-1.5 py-0.5 text-white/36">Core</span>
            ) : null}
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-[-0.055em] text-white sm:text-[2.6rem]">{source.name}</h1>
          {source.description ? (
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/40 sm:text-[15px]">{source.description}</p>
          ) : null}
        </div>
      </div>

      {source.tags && source.tags.length > 0 ? (
        <div className="mt-5 flex flex-wrap gap-1.5">
          {source.tags.map((tag) => (
            <span key={tag} className="rounded-md bg-white/[0.04] px-2 py-1 text-[10px] text-white/32">
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-xs">
        <SourceMetric label="Indexed" value={result.countCapped ? `${result.articleCount}+` : String(result.articleCount)} />
        <SourceMetric label="Latest" value={latest ? formatDate(latest) : "—"} />
        <SourceMetric label="Type" value={source.kind.toUpperCase()} />
      </div>
    </section>
  );
}

function SourceMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-white/25">{label}</span>
      <span className="font-semibold text-white/58">{value}</span>
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
    <motion.article
      layout
      className={`group border-b border-white/[0.065] py-4.5 transition-opacity sm:py-5 ${read ? "opacity-50" : "opacity-100"}`}
    >
      <div className="flex items-start gap-3">
        <button type="button" onClick={() => onOpen(article)} className="min-w-0 flex-1 text-left">
          <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-white/28">
            <span>{formatDate(article.publishedAt)}</span>
            {author ? (
              <>
                <span>·</span>
                <span className="max-w-[16rem] truncate">{author}</span>
              </>
            ) : null}
            {typeof article.score === "number" ? <><span>·</span><span>▲ {article.score}</span></> : null}
            {typeof article.commentCount === "number" ? (
              <span className="flex items-center gap-1">
                <span>·</span><MessageCircle className="size-3" /> {article.commentCount}
              </span>
            ) : null}
            {read ? <><span>·</span><span>Read</span></> : null}
          </div>
          <h3 className="mt-1.5 text-[15px] font-semibold leading-6 tracking-[-0.02em] text-white/82 transition group-hover:text-white sm:text-base">
            {article.title}
          </h3>
          {article.description ? (
            <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-white/35">{article.description}</p>
          ) : null}
        </button>

        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          onClick={() => onToggleSaved(article._id)}
          aria-label={saved ? "Remove from saved" : "Save article"}
          className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg transition ${
            saved ? "bg-white text-zinc-950" : "text-white/25 hover:bg-white/[0.055] hover:text-white"
          }`}
        >
          <Bookmark className="size-4" fill={saved ? "currentColor" : "none"} />
        </motion.button>
      </div>
    </motion.article>
  );
}

function qualityLabel(quality?: SourceQuality) {
  if (quality === "primary") return "Primary";
  if (quality === "expert") return "Expert";
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
    <div className="space-y-8 py-8 sm:py-10">
      <div className="h-44 animate-pulse border-b border-white/[0.07] bg-white/[0.01]" />
      <div>
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-28 animate-pulse border-b border-white/[0.06] bg-white/[0.01]" />
        ))}
      </div>
    </div>
  );
}
