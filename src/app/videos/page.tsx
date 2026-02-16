"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface VideoItem {
  id: string;
  title: string;
  status: string;
  duration: number;
  thumbnailUrl: string | null;
  createdAt: string;
  _count: { clips: number };
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function formatStatus(status: string): string {
  const map: Record<string, string> = {
    UPLOADED: "Uploaded",
    TRANSCRIBING: "Transcribing",
    READY: "Ready",
    ERROR: "Error",
  };
  return map[status] ?? status;
}

function StatusPill({ status }: { status: string }) {
  const style: Record<string, string> = {
    UPLOADED: "bg-amber-100 text-amber-800",
    TRANSCRIBING: "bg-blue-100 text-blue-800",
    READY: "bg-emerald-100 text-emerald-800",
    ERROR: "bg-red-100 text-red-800",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${style[status] ?? "bg-slate-100 text-slate-700"}`}
    >
      {formatStatus(status)}
    </span>
  );
}

export default function MyVideosPage() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<VideoItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const openDeleteModal = (video: VideoItem) => {
    setDeleteTarget(video);
  };

  const closeDeleteModal = () => {
    setDeleteTarget(null);
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
      alert((e as Error).message);
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
    return (
      <div className="mx-auto max-w-4xl">
        <nav className="mb-8 flex items-center gap-2 text-sm text-slate-500">
          <Link href="/" className="transition hover:text-slate-900">
            Home
          </Link>
          <span aria-hidden>/</span>
          <span className="font-medium text-slate-900">My videos</span>
        </nav>
        <div className="flex flex-col items-center justify-center py-20">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          <p className="mt-4 text-sm text-slate-500">Loading your videos…</p>
        </div>
      </div>
    );
  }

  if (error === "signin") {
    return (
      <div className="mx-auto max-w-2xl">
        <nav className="mb-8 flex items-center gap-2 text-sm text-slate-500">
          <Link href="/" className="transition hover:text-slate-900">
            Home
          </Link>
          <span aria-hidden>/</span>
          <span className="font-medium text-slate-900">My videos</span>
        </nav>
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">My videos</h1>
          <p className="mt-2 text-slate-600">
            Sign in with Google to see your videos and upload new ones.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
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
        <nav className="mb-8 flex items-center gap-2 text-sm text-slate-500">
          <Link href="/" className="transition hover:text-slate-900">
            Home
          </Link>
          <span aria-hidden>/</span>
          <span className="font-medium text-slate-900">My videos</span>
        </nav>
        <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-4 text-red-800">
          <p>{error}</p>
          <Link
            href="/"
            className="mt-3 inline-block text-sm font-medium text-red-700 underline-offset-2 hover:underline"
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
        <nav className="mb-8 flex items-center gap-2 text-sm text-slate-500">
          <Link href="/" className="transition hover:text-slate-900">
            Home
          </Link>
          <span aria-hidden>/</span>
          <span className="font-medium text-slate-900">My videos</span>
        </nav>
        <header className="mb-10">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            My videos
          </h1>
          <p className="mt-2 text-slate-600">
            Your uploaded videos and generated clips in one place.
          </p>
        </header>
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <VideoIcon className="h-8 w-8 text-slate-400" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-slate-900">No videos yet</h2>
          <p className="mt-2 text-slate-600">
            Upload your first video and we’ll transcribe it and suggest the best clips for Reels, TikTok and Shorts.
          </p>
          <Link
            href="/upload"
            className="mt-6 inline-flex rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
          >
            Upload video
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <nav className="mb-8 flex items-center gap-2 text-sm text-slate-500">
        <Link href="/" className="transition hover:text-slate-900">
          Home
        </Link>
        <span aria-hidden>/</span>
        <span className="font-medium text-slate-900">My videos</span>
      </nav>

      <header className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            My videos
          </h1>
          <p className="mt-2 text-slate-600">
            {videos.length} {videos.length === 1 ? "video" : "videos"} · Click to open and generate clips
          </p>
        </div>
        <Link
          href="/upload"
          className="inline-flex shrink-0 items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
        >
          Upload video
        </Link>
      </header>

      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {videos.map((v) => (
          <li key={v.id}>
            <div className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-300 hover:shadow">
              <Link href={`/videos/${v.id}`} className="block">
                <div className="aspect-video w-full overflow-hidden bg-slate-100">
                  {v.thumbnailUrl ? (
                    <img
                      src={v.thumbnailUrl}
                      alt=""
                      className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-400">
                      <VideoIcon className="h-12 w-12" />
                    </div>
                  )}
                </div>
              </Link>
              <div className="flex items-start justify-between gap-2 p-4">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 line-clamp-2">{v.title}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <StatusPill status={v.status} />
                    <span className="text-xs text-slate-500">
                      {formatDuration(v.duration)}
                    </span>
                    <span className="text-xs text-slate-500">
                      · {v._count.clips} {v._count.clips === 1 ? "clip" : "clips"}
                    </span>
                  </div>
                </div>
                <div className="ml-1 flex flex-col items-end gap-1">
                  <button
                    type="button"
                    onClick={() => openDeleteModal(v)}
                    className="rounded-full p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    aria-label="Delete video"
                  >
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 7h12M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7m-7 0h8m-9 0 1 12a1.5 1.5 0 0 0 1.5 1.5h5a1.5 1.5 0 0 0 1.5-1.5l1-12"
                      />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 11v6M14 11v6" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {deleteTarget && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h2 className="text-base font-semibold text-slate-900">
              Delete this video?
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              This will permanently remove{" "}
              <span className="font-medium">"{deleteTarget.title || "Untitled video"}"</span>,
              its original file, and all generated clips. This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeDeleteModal}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => performDelete(deleteTarget.id)}
                disabled={deletingId === deleteTarget.id}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 disabled:opacity-70"
              >
                {deletingId === deleteTarget.id ? "Deleting…" : "Delete"}
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
