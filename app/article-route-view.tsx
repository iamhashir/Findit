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

  if (result === undefined) return <RouteLoading />;

  if (result === null) {
    return (
      <main className="app-canvas flex min-h-screen items-center justify-center px-4 text-white">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold text-white/78">Story not found</h1>
          <p className="mt-2 text-sm leading-6 text-white/35">This article is no longer available in the index.</p>
          <Link href="/" className="mt-6 inline-flex rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-zinc-950">
            Home
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
      onOpenSource={result.sourceSlug ? () => router.push(`/source/${result.sourceSlug}`) : undefined}
    />
  );
}

function RouteLoading() {
  return (
    <main className="app-canvas min-h-screen px-4 py-12 text-white">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="h-10 w-10 animate-pulse rounded-lg bg-white/[0.035]" />
        <div className="h-11 w-5/6 animate-pulse rounded-lg bg-white/[0.04]" />
        <div className="h-11 w-2/3 animate-pulse rounded-lg bg-white/[0.03]" />
        <div className="h-80 animate-pulse rounded-2xl bg-white/[0.025]" />
      </div>
    </main>
  );
}
