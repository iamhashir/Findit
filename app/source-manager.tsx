"use client";

import { useMemo, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { anyApi, type FunctionReference } from "convex/server";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

type SourceKind = "rss" | "api" | "web";
type SourceQuality = "primary" | "expert" | "publication" | "community";
type HealthStatus = "healthy" | "degraded" | "failing" | "unknown" | "disabled";

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
  description?: string;
  tags?: string[];
  quality?: SourceQuality;
  priority?: number;
};

type SourceHealth = {
  sourceId: Id<"sources">;
  status: HealthStatus;
  lastAttemptAt?: number;
  lastSuccessAt?: number;
  lastFailureAt?: number;
  lastError?: string;
  consecutiveFailures: number;
  totalRuns: number;
  successRate: number;
  averageDiscovered: number;
  averageCreated: number;
  updateRate: number;
  lastDiscovered: number;
  lastCreated: number;
  lastUpdated: number;
  lastSkipped: number;
  lastDurationMs: number;
  lastNeedsBrowser: boolean;
  articleSampleSize: number;
  latestArticleAt?: number;
  missingDescriptionRate: number;
  missingAuthorRate: number;
  missingImageRate: number;
};

type Draft = {
  name: string;
  siteUrl: string;
  feedUrl: string;
  apiUrl: string;
  kind: SourceKind;
  category: string;
};

type ScrapeResult = {
  sourceId: Id<"sources">;
  sourceName: string;
  discovered: number;
  processed: number;
  created: number;
  updated: number;
  unchanged: number;
  skipped: number;
  needsBrowser: boolean;
};

const scraperApi = {
  scrapeSource: (anyApi as any).ingestion.syncSource as FunctionReference<
    "action",
    "public",
    { sourceId: Id<"sources">; maxArticles?: number },
    ScrapeResult
  >,
  scrapeAll: (anyApi as any).ingestion.syncAll as FunctionReference<
    "action",
    "public",
    { maxSources?: number; maxArticlesPerSource?: number; dueOnly?: boolean },
    ScrapeResult[]
  >,
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
  const dashboard = useQuery(api.sources.sourceDashboard, {}) as
    | { sources: Source[]; health: SourceHealth[] }
    | undefined;
  const sources = dashboard?.sources;
  const healthRows = dashboard?.health;
  const createSource = useMutation(api.sources.create);
  const updateSource = useMutation(api.sources.update);
  const setEnabled = useMutation(api.sources.setEnabled);
  const scrapeSource = useAction(scraperApi.scrapeSource);
  const scrapeAll = useAction(scraperApi.scrapeAll);

  const [editingId, setEditingId] = useState<Id<"sources"> | "new" | null>(null);
  const [expandedHealthId, setExpandedHealthId] = useState<Id<"sources"> | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [syncingId, setSyncingId] = useState<Id<"sources"> | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [sourceQuery, setSourceQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [healthFilter, setHealthFilter] = useState("All");

  const healthBySource = useMemo(
    () => new Map((healthRows ?? []).map((item) => [item.sourceId, item])),
    [healthRows],
  );

  const healthCounts = useMemo(() => {
    const rows = healthRows ?? [];
    return {
      healthy: rows.filter((item) => item.status === "healthy").length,
      attention: rows.filter((item) => item.status === "degraded" || item.status === "failing").length,
      failing: rows.filter((item) => item.status === "failing").length,
      unchecked: rows.filter((item) => item.status === "unknown").length,
    };
  }, [healthRows]);

  const categories = useMemo(() => {
    if (!sources) return [];
    return Array.from(new Set(sources.map((source) => source.category))).sort();
  }, [sources]);

  const visibleSources = useMemo(() => {
    if (!sources) return [];
    const needle = sourceQuery.trim().toLowerCase();
    return sources.filter((source) => {
      const health = healthBySource.get(source._id);
      if (categoryFilter !== "All" && source.category !== categoryFilter) return false;
      if (healthFilter !== "All" && health?.status !== healthFilter) return false;
      if (!needle) return true;
      const haystack = [source.name, source.category, ...(source.tags ?? [])].join(" ").toLowerCase();
      return haystack.includes(needle);
    });
  }, [categoryFilter, healthBySource, healthFilter, sourceQuery, sources]);

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
      if (editingId === "new") await createSource(payload);
      else if (editingId) await updateSource({ id: editingId, ...payload });
      setEditingId(null);
      setDraft(emptyDraft);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save source.");
    } finally {
      setSaving(false);
    }
  }

  async function syncOne(source: Source) {
    setSyncingId(source._id);
    setStatus("");
    setError("");
    try {
      const result = await scrapeSource({ sourceId: source._id, maxArticles: 6 });
      setStatus(
        result.needsBrowser
          ? `${source.name}: browser needed`
          : `${source.name}: ${result.created} new · ${result.updated} changed · ${result.unchanged} unchanged`,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sync failed.");
    } finally {
      setSyncingId(null);
    }
  }

  async function syncEnabled() {
    setSyncingAll(true);
    setStatus("");
    setError("");
    try {
      const results = await scrapeAll({
        maxSources: 20,
        maxArticlesPerSource: 4,
        dueOnly: true,
      });
      const created = results.reduce((sum, item) => sum + item.created, 0);
      const updated = results.reduce((sum, item) => sum + item.updated, 0);
      const unchanged = results.reduce((sum, item) => sum + item.unchanged, 0);
      const browser = results.filter((item) => item.needsBrowser).length;
      setStatus(
        `${results.length} due sources · ${created} new · ${updated} changed · ${unchanged} unchanged${
          browser ? ` · ${browser} need browser` : ""
        }`,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sync failed.");
    } finally {
      setSyncingAll(false);
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
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void syncEnabled()}
            disabled={syncingAll}
            className="rounded-xl border border-white/10 px-3 py-2 text-xs font-medium text-white/60 transition hover:bg-white/[0.05] hover:text-white disabled:opacity-40"
          >
            {syncingAll ? "Syncing…" : "Sync due"}
          </button>
          <button
            type="button"
            onClick={startAdd}
            className="rounded-xl bg-white px-3.5 py-2 text-xs font-semibold text-zinc-950 transition hover:bg-cyan-100"
          >
            Add
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px border-b border-white/[0.07] bg-white/[0.07] sm:grid-cols-4">
        <HealthStat label="Healthy" value={healthRows ? healthCounts.healthy : null} />
        <HealthStat label="Attention" value={healthRows ? healthCounts.attention : null} />
        <HealthStat label="Failing" value={healthRows ? healthCounts.failing : null} />
        <HealthStat label="Unchecked" value={healthRows ? healthCounts.unchecked : null} />
      </div>

      {(status || error) && (
        <div className={`border-b border-white/[0.07] px-4 py-2.5 text-xs sm:px-5 ${error ? "text-red-300" : "text-white/45"}`}>
          {error || status}
        </div>
      )}

      {editingId && (
        <div className="border-b border-white/[0.07] bg-black/20 p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name" value={draft.name} onChange={(name) => setDraft({ ...draft, name })} />
            <Field label="Category" value={draft.category} onChange={(category) => setDraft({ ...draft, category })} />
            <Field label="Website" value={draft.siteUrl} onChange={(siteUrl) => setDraft({ ...draft, siteUrl })} wide />
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
            {draft.kind === "rss" && <Field label="RSS URL" value={draft.feedUrl} onChange={(feedUrl) => setDraft({ ...draft, feedUrl })} />}
            {draft.kind === "api" && <Field label="API URL" value={draft.apiUrl} onChange={(apiUrl) => setDraft({ ...draft, apiUrl })} />}
          </div>

          {error && <p className="mt-3 text-xs text-red-300">{error}</p>}

          <div className="mt-4 flex gap-2">
            <button type="button" onClick={() => void save()} disabled={saving} className="rounded-xl bg-cyan-300 px-4 py-2.5 text-xs font-semibold text-zinc-950 disabled:opacity-50">
              {saving ? "Saving…" : "Save"}
            </button>
            <button type="button" onClick={() => setEditingId(null)} className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-medium text-white/55">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-2 border-b border-white/[0.07] bg-black/10 p-3 sm:grid-cols-[1fr_auto_auto] sm:px-5">
        <input
          value={sourceQuery}
          onChange={(event) => setSourceQuery(event.target.value)}
          placeholder="Search sources, categories, tags"
          className="h-10 rounded-xl border border-white/10 bg-white/[0.035] px-3 text-xs text-white outline-none placeholder:text-white/25 focus:border-cyan-300/35"
        />
        <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="h-10 rounded-xl border border-white/10 bg-[#0d0f11] px-3 text-xs text-white/65 outline-none">
          <option value="All">All categories</option>
          {categories.map((category) => <option key={category} value={category}>{category}</option>)}
        </select>
        <select value={healthFilter} onChange={(event) => setHealthFilter(event.target.value)} className="h-10 rounded-xl border border-white/10 bg-[#0d0f11] px-3 text-xs text-white/65 outline-none">
          <option value="All">All health</option>
          <option value="healthy">Healthy</option>
          <option value="degraded">Degraded</option>
          <option value="failing">Failing</option>
          <option value="unknown">Unchecked</option>
          <option value="disabled">Disabled</option>
        </select>
      </div>

      <div className="divide-y divide-white/[0.06]">
        {sources === undefined
          ? [0, 1, 2, 3, 4].map((item) => <div key={item} className="h-[82px] animate-pulse bg-white/[0.02]" />)
          : visibleSources.map((source) => {
              const health = healthBySource.get(source._id);
              const expanded = expandedHealthId === source._id;
              return (
                <div key={source._id}>
                  <div className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={source.enabled}
                      onClick={() => void setEnabled({ id: source._id, enabled: !source.enabled })}
                      className={`relative h-6 w-10 shrink-0 rounded-full transition ${source.enabled ? "bg-cyan-300" : "bg-white/10"}`}
                    >
                      <span className={`absolute top-1 size-4 rounded-full transition ${source.enabled ? "left-5 bg-zinc-950" : "left-1 bg-white/50"}`} />
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                        <HealthDot status={health?.status ?? (source.enabled ? "unknown" : "disabled")} />
                        <p className="truncate text-sm font-medium text-white/85">{source.name}</p>
                        {source.quality ? <span className="shrink-0 rounded-full border border-white/10 px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.1em] text-white/38">{qualityLabel(source.quality)}</span> : null}
                        {source.priority === 1 ? <span className="shrink-0 rounded-full border border-cyan-300/15 px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.1em] text-cyan-100/55">Core</span> : null}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-white/30">
                        {source.category} · {source.kind.toUpperCase()}
                        {health?.lastAttemptAt ? ` · sync ${relativeTime(health.lastAttemptAt)}` : " · not checked"}
                        {health ? ` · +${health.lastCreated}/${health.lastUpdated} changed` : ""}
                      </p>
                    </div>

                    <button type="button" onClick={() => setExpandedHealthId(expanded ? null : source._id)} className="rounded-lg px-2.5 py-2 text-xs font-medium text-white/45 transition hover:bg-white/[0.06] hover:text-white">
                      {expanded ? "Hide" : "Audit"}
                    </button>
                    <button type="button" onClick={() => void syncOne(source)} disabled={syncingId === source._id || !source.enabled} className="rounded-lg px-2.5 py-2 text-xs font-medium text-white/45 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-30">
                      {syncingId === source._id ? "…" : "Sync"}
                    </button>
                    <button type="button" onClick={() => startEdit(source)} className="hidden rounded-lg px-2.5 py-2 text-xs font-medium text-white/45 transition hover:bg-white/[0.06] hover:text-white sm:block">
                      Edit
                    </button>
                  </div>

                  {expanded ? <HealthAudit health={health} source={source} /> : null}
                </div>
              );
            })}
        {sources !== undefined && visibleSources.length === 0 ? <div className="px-5 py-12 text-center text-sm text-white/35">No sources match these filters.</div> : null}
      </div>
    </section>
  );
}

function HealthAudit({ health, source }: { health?: SourceHealth; source: Source }) {
  if (!health || health.status === "unknown") {
    return (
      <div className="border-t border-white/[0.05] bg-black/15 px-5 py-4 text-xs text-white/38">
        No sync audit exists yet. Run this source once to establish a health baseline.
      </div>
    );
  }

  return (
    <div className="border-t border-white/[0.05] bg-black/15 px-5 py-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <AuditMetric label="Health" value={healthLabel(health.status)} />
        <AuditMetric label="Success rate" value={percent(health.successRate)} />
        <AuditMetric label="Avg discovered" value={health.averageDiscovered.toFixed(1)} />
        <AuditMetric label="Avg new" value={health.averageCreated.toFixed(1)} />
        <AuditMetric label="Last duration" value={durationLabel(health.lastDurationMs)} />
        <AuditMetric label="Update rate" value={percent(health.updateRate)} />
        <AuditMetric label="Last skipped" value={String(health.lastSkipped)} />
        <AuditMetric label="Highlight sample" value={String(health.articleSampleSize)} />
      </div>

      <div className="mt-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/28">Latest highlight completeness</p>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <QualityMetric label="Missing summary" value={health.missingDescriptionRate} />
          <QualityMetric label="Missing author" value={health.missingAuthorRate} />
          <QualityMetric label="Missing image" value={health.missingImageRate} />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-white/30">
        <span>Last success: {health.lastSuccessAt ? relativeTime(health.lastSuccessAt) : "never"}</span>
        <span>Latest article: {health.latestArticleAt ? relativeTime(health.latestArticleAt) : "none"}</span>
        <span>{source.kind.toUpperCase()} ingestion</span>
        {health.lastNeedsBrowser ? <span className="text-amber-200/60">Browser extraction needed</span> : null}
      </div>

      {health.lastError && health.consecutiveFailures > 0 ? (
        <div className="mt-3 rounded-xl border border-red-300/10 bg-red-300/[0.035] px-3 py-2 text-xs leading-5 text-red-200/70">
          {health.lastError}
        </div>
      ) : null}
    </div>
  );
}

function HealthStat({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="bg-[#0b0d0f] px-4 py-3.5">
      <p className="text-[10px] uppercase tracking-[0.13em] text-white/28">{label}</p>
      <p className="mt-1 text-xl font-semibold tracking-[-0.03em] text-white/80">{value ?? "—"}</p>
    </div>
  );
}

function HealthDot({ status }: { status: HealthStatus }) {
  const className =
    status === "healthy"
      ? "bg-emerald-300"
      : status === "failing"
        ? "bg-red-300"
        : status === "degraded"
          ? "bg-amber-300"
          : "bg-white/20";
  return <span title={healthLabel(status)} className={`size-2 shrink-0 rounded-full ${className}`} />;
}

function AuditMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.12em] text-white/25">{label}</p>
      <p className="mt-1 text-sm font-medium text-white/65">{value}</p>
    </div>
  );
}

function QualityMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2.5">
      <p className="text-[10px] text-white/28">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white/62">{percent(value)}</p>
    </div>
  );
}

function healthLabel(status: HealthStatus) {
  if (status === "healthy") return "Healthy";
  if (status === "degraded") return "Degraded";
  if (status === "failing") return "Failing";
  if (status === "disabled") return "Disabled";
  return "Unchecked";
}

function qualityLabel(quality: SourceQuality) {
  if (quality === "primary") return "Primary";
  if (quality === "expert") return "Expert";
  if (quality === "publication") return "Publication";
  return "Community";
}

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function durationLabel(milliseconds: number) {
  if (milliseconds < 1_000) return `${milliseconds}ms`;
  return `${(milliseconds / 1_000).toFixed(1)}s`;
}

function relativeTime(timestamp: number) {
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function Field({ label, value, onChange, wide = false }: { label: string; value: string; onChange: (value: string) => void; wide?: boolean }) {
  return (
    <label className={`grid gap-1.5 ${wide ? "sm:col-span-2" : ""}`}>
      <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/35">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} className="h-11 rounded-xl border border-white/10 bg-[#0d0f11] px-3 text-sm text-white outline-none placeholder:text-white/20 focus:border-cyan-300/40" />
    </label>
  );
}
