"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useQuery } from "convex/react";
import { anyApi, type FunctionReference } from "convex/server";
import type { Article } from "./article-types";
import { ArticleReader } from "./article-reader";
import { useReadingState } from "./use-reading-state";

type RouteArticleResult = {
  article: Article;
  sourceSlug: string | null;
};

const getArticleRoute = anyApi.routes.getArticle as FunctionReference<
  "query",
  "public",
  { id: string },
  RouteArticleResult | null
>;

export function ArticleRouteView({ id }: { id: string }) {
  const router = useRouter();
  const reading = useReadingState();
  const result = useQuery(getArticleRoute, { id });
  const articleId = result?.article._id;

  useEffect(() => {
    if (articleId) reading.markRead(articleId);
  }, [articleId, reading.markRead]);

  function goBack() {
    if (window.history.length > 1) router.back();
    else router.push("/");
  }

  if (result === undefined) {
    return <RouteLoading label="Loading story" />;
  }

  if (result === null) {
    return (
      <main className="min-h-screen bg-[#050607] px-4 py-16 text-white">
        <div className="mx-auto max-w-lg rounded-[1.75rem] border border-white/10 bg-white/[0.025] p-7 text-center">
          <h1 className="text-xl font-semibold">Story not found</h1>
          <p className="mt-2 text-sm leading-6 text-white/40">
            This Findit story link is invalid or the indexed article is no longer available.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-zinc-950"
          >
            Go to Home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <ArticleReader
      article={result.article}
      saved={reading.savedSet.has(result.article._id)}
      onClose={goBack}
      onToggleSaved={reading.toggleSaved}
      onOpenSource={
        result.sourceSlug ? () => router.push(`/source/${result.sourceSlug}`) : undefined
      }
    />
  );
}

function RouteLoading({ label }: { label: string }) {
  return (
    <main className="min-h-screen bg-[#050607] px-4 py-12 text-white">
      <div className="mx-auto max-w-3xl space-y-5">
        <div className="h-12 animate-pulse rounded-xl border border-white/8 bg-white/[0.025]" />
        <div className="h-72 animate-pulse rounded-[1.75rem] border border-white/8 bg-white/[0.025]" />
        <p className="text-center text-xs text-white/25">{label}</p>
      </div>
    </main>
  );
}
