"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";

function toSameOriginUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname + u.search;
  } catch {
    return url;
  }
}

interface Clip {
  id: string;
  title: string;
  startTime: number;
  endTime: number;
  confidence: number | null;
  status: string;
  outputUrl?: string | null;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING: "bg-amber-100 text-amber-800",
    PROCESSING: "bg-blue-100 text-blue-800",
    COMPLETED: "bg-emerald-100 text-emerald-800",
    ERROR: "bg-red-100 text-red-800",
  };
  const style = styles[status] ?? "bg-slate-100 text-slate-700";
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${style}`}
    >
      {status}
    </span>
  );
}

export default function VideoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [video, setVideo] = useState<{ title: string; status: string } | null>(null);
  const [clips, setClips] = useState<Clip[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingVideo, setLoadingVideo] = useState(true);
  const [error, setError] = useState("");
  const [videoErrors, setVideoErrors] = useState<Record<string, boolean>>({});
  const [showTranscript, setShowTranscript] = useState(false);
  const [transcriptData, setTranscriptData] = useState<{
    transcript: {
      words: { text: string; start: number; end: number }[];
      sentences: { text: string; start: number; end: number }[];
    };
    segments: { start: number; end: number; text: string }[];
  } | null>(null);
  const [loadingTranscript, setLoadingTranscript] = useState(false);

  // Shared loader so we can call it on mount and via polling
  const fetchVideo = async (opts: { silent?: boolean } = {}) => {
    if (!opts.silent) {
      setLoadingVideo(true);
    }
    try {
      const res = await fetch(`/api/videos/${id}`);
      if (!res.ok) return;
      const data = await res.json();
      setVideo({ title: data.title, status: data.status });
      setClips(Array.isArray(data.clips) ? data.clips : []);
    } finally {
      if (!opts.silent) {
        setLoadingVideo(false);
      }
    }
  };

  // Initial load
  useEffect(() => {
    fetchVideo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Poll while the video is still processing so the user doesn't have to refresh
  useEffect(() => {
    if (!video || video.status === "READY") return;
    const interval = setInterval(() => {
      fetchVideo({ silent: true });
    }, 4000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video?.status, id]);

  // Clear transcript when switching to another video
  useEffect(() => {
    setTranscriptData(null);
  }, [id]);

  // Fetch transcript in the background once the video is READY,
  // so we can show per-clip transcript snippets without extra clicks.
  useEffect(() => {
    if (!id || !video || video.status !== "READY") return;
    if (transcriptData || loadingTranscript) return; // already loaded or loading
    setLoadingTranscript(true);
    fetch(`/api/videos/${id}/transcript`)
      .then((r) => r.json())
      .then((data) => {
        if (data.transcript !== undefined) setTranscriptData(data);
      })
      .finally(() => setLoadingTranscript(false));
  }, [id, video?.status, transcriptData, loadingTranscript]);

  // Helper: get the exact transcript slice (word-level) for a specific clip.
  // We cut purely by word timings, so this should match what you actually hear.
  const getClipTranscriptText = (clip: Clip) => {
    if (!transcriptData) return "";
    const tol = 0.05;
    const words = transcriptData.transcript.words ?? [];
    const inRange = words.filter(
      (w) =>
        w.end > clip.startTime - tol &&
        w.start < clip.endTime + tol,
    );
    return inRange.map((w) => w.text).join(" ");
  };

  const handleGenerateClips = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/videos/${id}/generate-clips`, {
        method: "POST",
      });
      const contentType = res.headers.get("content-type") ?? "";
      const isJson = contentType.includes("application/json");
      const data = isJson
        ? await res.json()
        : { error: (await res.text()) || "Server error" };
      if (!res.ok) throw new Error(data.error || "Failed");
      setClips(Array.isArray(data.clips) ? data.clips : []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const refreshClips = async () => {
    try {
      const res = await fetch(`/api/videos/${id}`);
      if (res.ok) {
        const data = await res.json();
        setClips(Array.isArray(data.clips) ? data.clips : []);
      }
    } catch (_) {}
  };

  const handleRenderClip = async (clipId: string) => {
    try {
      const res = await fetch(`/api/clips/${clipId}/render`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert("Clip rendering started. Check back in a few minutes.");
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const handleRenderAll = async () => {
    try {
      const res = await fetch(`/api/videos/${id}/render-all-clips`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert(`${data.count} clips queued for rendering.`);
      await refreshClips();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  if (loadingVideo) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
        <p className="mt-4 text-sm text-slate-500">Loading video…</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/"
          className="mb-4 inline-flex items-center text-sm font-medium text-slate-600 transition hover:text-slate-900"
        >
          ← Back
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              {video?.title ?? `Video`}
            </h1>
            <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
              <StatusBadge status={video?.status ?? "—"} />
              <span>9:16 vertical · Reels, TikTok & YouTube Shorts</span>
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              onClick={handleGenerateClips}
              disabled={loading || video?.status !== "READY"}
              title={video?.status !== "READY" ? "Finish transcription first" : undefined}
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
            >
              {loading
                ? "Generating…"
                : clips.length > 0
                  ? "Regenerate clips"
                  : "Generate clips"}
            </button>
            <button
              onClick={handleRenderAll}
              disabled={clips.length === 0}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Render all clips
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>

      {clips.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {clips.map((c) => (
            <article
              key={c.id}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-medium text-slate-900 line-clamp-2">
                    {c.title}
                  </h2>
                  <StatusBadge status={c.status} />
                </div>
                <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                  <span>
                    {c.startTime.toFixed(1)}s – {c.endTime.toFixed(1)}s
                  </span>
                  {c.confidence != null && (
                    <span>{(c.confidence * 100).toFixed(0)}% match</span>
                  )}
                </div>
              </div>

              {c.outputUrl && (
                <div className="relative bg-slate-900">
                  <video
                    src={toSameOriginUrl(c.outputUrl)}
                    controls
                    preload="metadata"
                    playsInline
                    className="aspect-[9/16] w-full max-w-full object-contain"
                    onError={() =>
                      setVideoErrors((prev) => ({ ...prev, [c.id]: true }))
                    }
                    onLoadedData={() =>
                      setVideoErrors((prev) => ({ ...prev, [c.id]: false }))
                    }
                  />
                  {videoErrors[c.id] && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-900/90 p-4 text-center text-sm text-white">
                      <span>Video could not load.</span>
                      <a
                        href={toSameOriginUrl(c.outputUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium underline"
                      >
                        Open in new tab
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Transcript snippet for this clip, based on the transcript we use for generation */}
              {transcriptData && (
                <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-3">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Transcript for this clip
                  </p>
                  <div className="max-h-40 overflow-y-auto rounded-md border border-slate-200 bg-white/60 px-3 py-2">
                    {getClipTranscriptText(c) ? (
                      <p className="text-sm text-slate-700">
                        {getClipTranscriptText(c)}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-500">
                        No transcript slice found for this time range.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {c.status === "PENDING" && (
                <div className="border-t border-slate-100 p-4">
                  <button
                    onClick={() => handleRenderClip(c.id)}
                    className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
                  >
                    Render clip
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-16 text-center">
          <p className="text-slate-600">
            No clips yet. Make sure transcription is done, then click “Generate
            clips”.
          </p>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setShowTranscript((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <span>View transcript & segments (used for clip generation)</span>
          <span className="text-slate-400">{showTranscript ? "▼" : "▶"}</span>
        </button>
        {showTranscript && (
          <div className="border-t border-slate-100 px-4 pb-4 pt-3">
            {loadingTranscript && <p className="text-sm text-slate-500">Loading…</p>}
            {!loadingTranscript && transcriptData && (
              <div className="space-y-6">
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Segments we use for clip suggestions (sentence boundaries)
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    These are fed to the model to pick the best clips. Each segment starts and ends at a full sentence.
                  </p>
                  <ul className="mt-3 space-y-3">
                    {transcriptData.segments.map((seg, i) => (
                      <li key={i} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 text-sm">
                        <span className="font-mono text-xs text-slate-500">
                          [{seg.start.toFixed(1)}s – {seg.end.toFixed(1)}s]
                        </span>
                        <p className="mt-1 text-slate-800">{seg.text}</p>
                      </li>
                    ))}
                  </ul>
                  {transcriptData.segments.length === 0 && (
                    <p className="text-sm text-slate-500">No segments (transcript may be empty or too short).</p>
                  )}
                </section>
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Full transcript
                  </h3>
                  {(transcriptData.transcript.sentences?.length ?? 0) > 0 ? (
                    <ul className="mt-3 space-y-2">
                      {transcriptData.transcript.sentences.map((s, i) => (
                        <li key={i} className="text-sm text-slate-700">
                          <span className="font-mono text-xs text-slate-400">
                            {s.start.toFixed(1)}–{s.end.toFixed(1)}s
                          </span>{" "}
                          {s.text}
                        </li>
                      ))}
                    </ul>
                  ) : (transcriptData.transcript.words?.length ?? 0) > 0 ? (
                    <p className="mt-3 text-sm text-slate-700">
                      {transcriptData.transcript.words.map((w) => w.text).join(" ")}
                    </p>
                  ) : (
                    <p className="mt-3 text-sm text-slate-500">No sentences or words in transcript.</p>
                  )}
                </section>
              </div>
            )}
            {!loadingTranscript && showTranscript && !transcriptData && (
              <p className="text-sm text-slate-500">No transcript yet for this video.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
