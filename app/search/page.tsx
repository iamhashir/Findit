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
    <main className="app-canvas min-h-screen px-4 pb-32 text-white sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="flex h-[65px] items-center justify-between border-b border-white/[0.065]">
          <div className="h-5 w-20 animate-pulse rounded-lg bg-white/[0.05]" />
          <div className="size-10 animate-pulse rounded-2xl border border-white/[0.08] bg-white/[0.025]" />
        </div>
        <div className="space-y-6 py-8">
          <div className="space-y-2 px-1">
            <div className="h-3 w-20 animate-pulse rounded-full bg-cyan-300/[0.08]" />
            <div className="h-8 w-56 animate-pulse rounded-xl bg-white/[0.045]" />
            <div className="h-4 w-72 max-w-full animate-pulse rounded-lg bg-white/[0.025]" />
          </div>
          <div className="glass-panel rounded-[1.45rem] p-2.5">
            <div className="h-14 animate-pulse rounded-2xl bg-black/20" />
            <div className="mt-2 flex gap-2">
              {[0, 1, 2, 3].map((item) => (
                <div key={item} className="h-7 w-20 animate-pulse rounded-full bg-white/[0.035]" />
              ))}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="h-40 animate-pulse rounded-[1.55rem] border border-white/[0.08] bg-white/[0.02]" />
            <div className="h-40 animate-pulse rounded-[1.55rem] border border-white/[0.08] bg-white/[0.02]" />
          </div>
        </div>
      </div>
    </main>
  );
}
