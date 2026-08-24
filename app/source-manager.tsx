"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

type SourceKind = "rss" | "api" | "web";

type Source = {
  _id: Id<"sources">;
  name: string;
  siteUrl: string;
  feedUrl?: string;
  apiUrl?: string;
  kind: SourceKind;
  category: string;
  enabled: boolean;
  recommended?: boolean;
};

type Draft = {
  name: string;
  siteUrl: string;
  feedUrl: string;
  apiUrl: string;
  kind: SourceKind;
  category: string;
};

const emptyDraft: Draft = {
  name: "",
  siteUrl: "",
  feedUrl: "",
  apiUrl: "",
  kind: "rss",
  category: "",
};

export function SourceManager() {
  const sources = useQuery(api.sources.listAll, {}) as Source[] | undefined;
  const ensureRecommended = useMutation(api.sources.ensureRecommended);
  const createSource = useMutation(api.sources.create);
  const updateSource = useMutation(api.sources.update);
  const setEnabled = useMutation(api.sources.setEnabled);

  const bootstrapped = useRef(false);
  const [editingId, setEditingId] = useState<Id<"sources"> | "new" | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (sources === undefined || bootstrapped.current) return;
    if (sources.filter((source) => source.recommended).length >= 10) return;

    bootstrapped.current = true;
    void ensureRecommended({}).catch(() => {
      bootstrapped.current = false;
    });
  }, [ensureRecommended, sources]);

  function startAdd() {
    setError("");
    setDraft(emptyDraft);
    setEditingId("new");
  }

  function startEdit(source: Source) {
    setError("");
    setDraft({
      name: source.name,
      siteUrl: source.siteUrl,
      feedUrl: source.feedUrl ?? "",
      apiUrl: source.apiUrl ?? "",
      kind: source.kind,
      category: source.category,
    });
    setEditingId(source._id);
  }

  async function save() {
    if (!draft.name.trim() || !draft.siteUrl.trim() || !draft.category.trim()) {
      setError("Name, category and website are required.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = {
        name: draft.name,
        siteUrl: draft.siteUrl,
        feedUrl: draft.feedUrl,
        apiUrl: draft.apiUrl,
        kind: draft.kind,
        category: draft.category,
      };

      if (editingId === "new") {
        await createSource(payload);
      } else if (editingId) {
        await updateSource({ id: editingId, ...payload });
      }

      setEditingId(null);
      setDraft(emptyDraft);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save source.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.03]">
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-4 sm:px-5">
        <div className="flex items-center gap-2.5">
          <h2 className="text-base font-semibold tracking-tight">Sources</h2>
          <span className="rounded-full bg-white/[0.07] px-2 py-0.5 text-[11px] text-white/45">
            {sources?.length ?? "—"}
          </span>
        </div>
        <button
          type="button"
          onClick={startAdd}
          className="rounded-xl bg-white px-3.5 py-2 text-xs font-semibold text-zinc-950 transition hover:bg-cyan-100"
        >
          Add
        </button>
      </div>

      {editingId && (
        <div className="border-b border-white/[0.07] bg-black/20 p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name" value={draft.name} onChange={(name) => setDraft({ ...draft, name })} />
            <Field
              label="Category"
              value={draft.category}
              onChange={(category) => setDraft({ ...draft, category })}
            />
            <Field
              label="Website"
              value={draft.siteUrl}
              onChange={(siteUrl) => setDraft({ ...draft, siteUrl })}
              wide
            />
            <label className="grid gap-1.5">
              <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/35">Type</span>
              <select
                value={draft.kind}
                onChange={(event) => setDraft({ ...draft, kind: event.target.value as SourceKind })}
                className="h-11 rounded-xl border border-white/10 bg-[#0d0f11] px-3 text-sm text-white outline-none focus:border-cyan-300/40"
              >
                <option value="rss">RSS</option>
                <option value="api">API</option>
                <option value="web">Web</option>
              </select>
            </label>
            {draft.kind === "rss" && (
              <Field
                label="RSS URL"
                value={draft.feedUrl}
                onChange={(feedUrl) => setDraft({ ...draft, feedUrl })}
              />
            )}
            {draft.kind === "api" && (
              <Field
                label="API URL"
                value={draft.apiUrl}
                onChange={(apiUrl) => setDraft({ ...draft, apiUrl })}
              />
            )}
          </div>

          {error && <p className="mt-3 text-xs text-red-300">{error}</p>}

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="rounded-xl bg-cyan-300 px-4 py-2.5 text-xs font-semibold text-zinc-950 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setEditingId(null)}
              className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-medium text-white/55"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="divide-y divide-white/[0.06]">
        {sources === undefined
          ? [0, 1, 2, 3, 4].map((item) => (
              <div key={item} className="h-[72px] animate-pulse bg-white/[0.02]" />
            ))
          : sources.map((source) => (
              <div key={source._id} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
                <button
                  type="button"
                  role="switch"
                  aria-checked={source.enabled}
                  onClick={() => void setEnabled({ id: source._id, enabled: !source.enabled })}
                  className={`relative h-6 w-10 shrink-0 rounded-full transition ${
                    source.enabled ? "bg-cyan-300" : "bg-white/10"
                  }`}
                >
                  <span
                    className={`absolute top-1 size-4 rounded-full transition ${
                      source.enabled ? "left-5 bg-zinc-950" : "left-1 bg-white/50"
                    }`}
                  />
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <p className="truncate text-sm font-medium text-white/85">{source.name}</p>
                    {source.recommended && (
                      <span className="shrink-0 rounded-full border border-cyan-300/15 px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.12em] text-cyan-100/55">
                        Top 10
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-white/30">
                    {source.category} · {source.kind.toUpperCase()}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => startEdit(source)}
                  className="rounded-lg px-2.5 py-2 text-xs font-medium text-white/45 transition hover:bg-white/[0.06] hover:text-white"
                >
                  Edit
                </button>
              </div>
            ))}
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  wide = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  wide?: boolean;
}) {
  return (
    <label className={`grid gap-1.5 ${wide ? "sm:col-span-2" : ""}`}>
      <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/35">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-xl border border-white/10 bg-[#0d0f11] px-3 text-sm text-white outline-none placeholder:text-white/20 focus:border-cyan-300/40"
      />
    </label>
  );
}
