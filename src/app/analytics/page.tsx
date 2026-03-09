"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/Skeleton";

interface Analytics {
  plan: string;
  usage: {
    videosUploaded: number;
    videoLimit: number;
    storageUsedMB: number;
    storageLimitMB: number;
    totalClips: number;
    completedClips: number;
    avgClipsPerVideo: number;
  };
  recentVideos: {
    id: string;
    title: string;
    createdAt: string;
    duration: number;
    clipCount: number;
  }[];
  topClips: {
    id: string;
    title: string;
    confidence: number | null;
    status: string;
    videoId: string;
    videoTitle: string;
  }[];
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="text-slate-600 dark:text-slate-300">{label}</span>
        <span className="text-slate-500 dark:text-slate-400">{value} / {max}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div
          className={`h-full rounded-full transition-all ${pct >= 90 ? "bg-red-500" : "bg-indigo-600"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-4xl">
        <p className="text-slate-500">Sign in to view analytics.</p>
      </div>
    );
  }

  const { usage } = data;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Analytics</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {data.plan} plan overview
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Videos uploaded" value={usage.videosUploaded} sub={`of ${usage.videoLimit} limit`} />
        <StatCard label="Total clips" value={usage.totalClips} />
        <StatCard label="Rendered clips" value={usage.completedClips} />
        <StatCard label="Avg clips / video" value={usage.avgClipsPerVideo} />
      </div>

      {/* Usage bars */}
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="font-semibold text-slate-900 dark:text-white">Usage</h2>
        <ProgressBar label="Videos" value={usage.videosUploaded} max={usage.videoLimit} />
        <ProgressBar label="Storage (MB)" value={usage.storageUsedMB} max={usage.storageLimitMB} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent videos */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h2 className="mb-3 font-semibold text-slate-900 dark:text-white">Recent videos</h2>
          {data.recentVideos.length === 0 ? (
            <p className="text-sm text-slate-400">No videos yet</p>
          ) : (
            <ul className="space-y-2">
              {data.recentVideos.map((v) => (
                <li key={v.id} className="flex items-center justify-between text-sm">
                  <Link href={`/videos/${v.id}`} className="truncate text-indigo-600 hover:underline">
                    {v.title}
                  </Link>
                  <span className="ml-2 shrink-0 text-xs text-slate-400">{v.clipCount} clips</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Top clips */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h2 className="mb-3 font-semibold text-slate-900 dark:text-white">Top clips by score</h2>
          {data.topClips.length === 0 ? (
            <p className="text-sm text-slate-400">No scored clips yet</p>
          ) : (
            <ul className="space-y-2">
              {data.topClips.map((c) => (
                <li key={c.id} className="flex items-center justify-between text-sm">
                  <Link href={`/videos/${c.videoId}`} className="truncate text-indigo-600 hover:underline">
                    {c.title}
                  </Link>
                  <span className="ml-2 shrink-0 rounded bg-indigo-50 px-1.5 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                    {c.confidence != null ? `${(c.confidence * 100).toFixed(0)}%` : "—"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
