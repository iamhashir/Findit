import { Suspense } from "react";
import { MainApp } from "../main-app";

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchRouteFallback />}>
      <MainApp view="search" />
    </Suspense>
  );
}

function SearchRouteFallback() {
  return (
    <main className="min-h-screen bg-[#050607] px-4 py-6 text-white">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="h-12 animate-pulse rounded-xl border border-white/8 bg-white/[0.025]" />
        <div className="h-48 animate-pulse rounded-[1.75rem] border border-white/8 bg-white/[0.025]" />
      </div>
    </main>
  );
}
