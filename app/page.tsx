import { SourcesList } from "./sources-list";

const topics = ["AI", "Web", "Cloud", "DevOps", "Security", "Open Source"];

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-6xl px-6 py-8 sm:px-8">
        <header className="flex items-center justify-between border-b border-zinc-800 pb-6">
          <a href="#" className="text-xl font-semibold tracking-tight">
            Findit
          </a>
          <span className="rounded-full border border-zinc-800 px-3 py-1 text-xs text-zinc-400">
            Building v0.1
          </span>
        </header>

        <section className="py-20 sm:py-28">
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
            Developer news, without the noise
          </p>
          <h1 className="max-w-4xl text-4xl font-semibold tracking-tight sm:text-6xl">
            Keep up with what is happening in software.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-zinc-400 sm:text-lg">
            Findit brings updates from engineering blogs, open source projects,
            and developer communities into one clean feed.
          </p>
        </section>

        <section className="border-t border-zinc-800 py-10">
          <h2 className="text-sm font-medium text-zinc-400">Topics</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {topics.map((topic) => (
              <span
                key={topic}
                className="rounded-full border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm text-zinc-300"
              >
                {topic}
              </span>
            ))}
          </div>
        </section>

        <section className="border-t border-zinc-800 py-10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-zinc-400">Live sources</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                Original sources first.
              </h2>
            </div>
            <span className="text-sm text-zinc-500">Powered by Convex</span>
          </div>

          <SourcesList />
        </section>

        <footer className="border-t border-zinc-800 py-8 text-sm text-zinc-500">
          Findit. Simple, fast, and free.
        </footer>
      </div>
    </main>
  );
}
