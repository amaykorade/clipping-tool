"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import { VideosGridSkeleton } from "@/components/ui/Skeleton";

interface VideoItem {
  id: string;
  title: string;
  status: string;
  duration: number;
  thumbnailUrl: string | null;
  createdAt: string;
  _count: { clips: number };
}

interface SearchResult {
  videoId: string;
  title: string;
  thumbnailUrl: string | null;
  duration: number;
  matches: { text: string; timestamp: number }[];
  matchCount: number;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

export default function MyVideosPage() {
  const { showToast } = useToast();
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<VideoItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);

  const handleSearch = async () => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults(null);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/videos/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setSearchResults(data.results);
    } catch {
      showToast("error", "Search failed");
    } finally {
      setSearching(false);
    }
  };

  const performDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/videos/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete video");
      }
      setVideos((prev) => prev.filter((v) => v.id !== id));
      setDeleteTarget(null);
    } catch (e) {
      showToast("error", (e as Error).message || "Failed to delete video.");
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    fetch("/api/videos")
      .then((res) => {
        if (res.status === 401) {
          setError("signin");
          return [];
        }
        if (!res.ok) throw new Error("Failed to load videos");
        return res.json();
      })
      .then((data) => setVideos(data.videos ?? []))
      .catch((e) => setError(e instanceof Error ? e.message : "Error"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <VideosGridSkeleton />;
  }

  if (error === "signin") {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">My videos</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Sign in with Google to see your videos and upload new ones.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex rounded-xl bg-purple-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-600"
          >
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-4 text-red-800 dark:border-red-700/50 dark:bg-red-950/50 dark:text-red-300">
          <p>{error}</p>
          <Link
            href="/"
            className="mt-3 inline-block text-sm font-medium text-red-700 underline-offset-2 hover:underline dark:text-red-400"
          >
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="mx-auto max-w-2xl">
        <header className="mb-10">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            My videos
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Your uploaded videos and generated clips in one place.
          </p>
        </header>
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm dark:border-slate-600 dark:bg-slate-800">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700">
            <VideoIcon className="h-8 w-8 text-slate-400 dark:text-slate-500" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">No videos yet</h2>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Upload your first video and we'll transcribe it and suggest the best clips for Reels, TikTok and Shorts.
          </p>
          <Link
            href="/upload"
            className="mt-6 inline-flex rounded-xl bg-purple-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-600"
          >
            Upload video
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            My videos
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            {videos.length} {videos.length === 1 ? "video" : "videos"} · Click to open and generate clips
          </p>
        </div>
        <Link
          href="/upload"
          className="inline-flex shrink-0 items-center justify-center rounded-xl bg-purple-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-600"
        >
          Upload video
        </Link>
      </header>

      {/* Transcript search */}
      <div className="mb-6">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSearch(); }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (e.target.value.trim().length < 2) setSearchResults(null);
            }}
            placeholder="Search across all transcripts..."
            className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-purple-600 dark:focus:ring-purple-900/30"
          />
          <button
            type="submit"
            disabled={searching || searchQuery.trim().length < 2}
            className="rounded-xl bg-purple-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-purple-600 disabled:opacity-50"
          >
            {searching ? "Searching..." : "Search"}
          </button>
        </form>

        {searchResults && (
          <div className="mt-4 space-y-3">
            {searchResults.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No matches found for &ldquo;{searchQuery}&rdquo;</p>
            ) : (
              <>
                <p className="text-sm text-slate-500 dark:text-slate-400">{searchResults.length} video{searchResults.length !== 1 ? "s" : ""} matched</p>
                {searchResults.map((r) => (
                  <div key={r.videoId} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                    <Link href={`/videos/${r.videoId}`} className="font-medium text-purple-700 hover:underline dark:text-purple-400">
                      {r.title}
                    </Link>
                    <span className="ml-2 text-xs text-slate-400">{r.matchCount} match{r.matchCount !== 1 ? "es" : ""}</span>
                    <ul className="mt-2 space-y-1">
                      {r.matches.slice(0, 3).map((m, i) => (
                        <li key={i} className="text-sm text-slate-600 dark:text-slate-300">
                          <span className="mr-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                            {formatDuration(m.timestamp)}
                          </span>
                          {m.text.length > 120 ? m.text.slice(0, 120) + "..." : m.text}
                        </li>
                      ))}
                      {r.matches.length > 3 && (
                        <li className="text-xs text-slate-400">+{r.matches.length - 3} more</li>
                      )}
                    </ul>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {videos.map((v) => (
          <li key={v.id}>
            <div className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-300 hover:shadow dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600">
              <Link href={`/videos/${v.id}`} className="block">
                <div className="aspect-video w-full overflow-hidden bg-slate-100 dark:bg-slate-700">
                  {v.thumbnailUrl ? (
                    <img
                      src={v.thumbnailUrl}
                      alt=""
                      className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-400 dark:text-slate-500">
                      <VideoIcon className="h-12 w-12" />
                    </div>
                  )}
                </div>
              </Link>
              <div className="flex items-start justify-between gap-2 p-4">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 line-clamp-2 dark:text-white">{v.title}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <StatusBadge status={v.status} />
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {formatDuration(v.duration)}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      · {v._count.clips} {v._count.clips === 1 ? "clip" : "clips"}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(v)}
                  className="rounded-full p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50 dark:hover:text-red-400"
                  aria-label="Delete video"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7m-7 0h8m-9 0 1 12a1.5 1.5 0 0 0 1.5 1.5h5a1.5 1.5 0 0 0 1.5-1.5l1-12" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 11v6M14 11v6" />
                  </svg>
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Delete this video?
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              This will permanently remove{" "}
              <span className="font-medium">"{deleteTarget.title || "Untitled video"}"</span>,
              its original file, and all generated clips. This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => performDelete(deleteTarget.id)}
                disabled={deletingId === deleteTarget.id}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 disabled:opacity-70"
              >
                {deletingId === deleteTarget.id ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function VideoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z"
      />
    </svg>
  );
}
