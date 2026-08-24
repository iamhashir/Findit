"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { anyApi, type FunctionReference } from "convex/server";
import type { Id } from "../convex/_generated/dataModel";
import { api } from "../convex/_generated/api";
import { ArticleCard } from "./article-card";
import type { Article } from "./article-types";
import { useReadingState } from "./use-reading-state";

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
            {source && (
              <button
                type="button"
                onClick={() => void share()}
                className="rounded-xl border border-white/10 px-3 py-2 text-xs font-medium text-white/48 transition hover:bg-white/[0.05] hover:text-white"
              >
                {shared ? "Copied" : "Share"}
              </button>
            )}
            {source && (
              <a
                href={source.siteUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-white/10 px-3 py-2 text-xs font-medium text-white/48 transition hover:bg-white/[0.05] hover:text-white"
              >
                Visit source ↗
              </a>
            )}
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
            <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-5 sm:p-6">
              <div className="flex items-start gap-4">
                <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.055] text-sm font-semibold tracking-wide text-cyan-100/80">
                  {source.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-white/32">
                    <span>{source.category}</span>
                    <span>·</span>
                    <span>{source.kind}</span>
                  </div>
                  <h1 className="mt-1.5 text-2xl font-semibold tracking-[-0.035em] text-white/92 sm:text-3xl">
                    {source.name}
                  </h1>
                  <p className="mt-2 text-sm text-white/38">
                    {result!.countCapped ? `${result!.articleCount}+` : result!.articleCount} indexed {result!.articleCount === 1 ? "story" : "stories"}
                  </p>
                </div>
              </div>
            </section>

            <section className="mt-5 rounded-[1.75rem] border border-white/10 bg-white/[0.025] p-4 sm:p-5">
              <div className="mb-1 flex items-center justify-between px-1">
                <h2 className="text-sm font-semibold text-white/82">Latest from {source.name}</h2>
                <span className="text-[11px] text-white/28">{result!.articles.length} shown</span>
              </div>

              {result!.articles.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 px-5 py-12 text-center text-sm text-white/35">
                  No indexed stories from this source yet.
                </div>
              ) : (
                <div>
                  {result!.articles.map((article) => (
                    <ArticleCard
                      key={article._id}
                      article={article}
                      saved={reading.savedSet.has(article._id)}
                      read={reading.readSet.has(article._id)}
                      onOpen={openArticle}
                      onToggleSaved={reading.toggleSaved}
                    />
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

function SourcePageSkeleton() {
  return (
    <div className="space-y-5 py-6">
      <div className="h-36 animate-pulse rounded-[1.75rem] border border-white/8 bg-white/[0.025]" />
      <div className="rounded-[1.75rem] border border-white/8 bg-white/[0.02] p-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-28 animate-pulse border-b border-white/[0.06] bg-white/[0.015]" />
        ))}
      </div>
    </div>
  );
}
