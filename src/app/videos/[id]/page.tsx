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

type TranscriptPayload = {
  transcript: {
    words: { text: string; start: number; end: number }[];
    sentences: { text: string; start: number; end: number }[];
  };
  segments: { start: number; end: number; text: string }[];
};

function downloadTranscriptTxt(data: TranscriptPayload, videoTitle: string) {
  const lines: string[] = [];
  const sentences = data.transcript.sentences ?? [];
  if (sentences.length > 0) {
    for (const s of sentences) {
      lines.push(`[${s.start.toFixed(1)}s – ${s.end.toFixed(1)}s] ${s.text}`);
    }
  } else {
    const words = data.transcript.words ?? [];
    lines.push(words.map((w) => w.text).join(" "));
  }
  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${sanitizeDownloadFilename(videoTitle)}-transcript.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadTranscriptJson(data: TranscriptPayload, videoTitle: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${sanitizeDownloadFilename(videoTitle)}-transcript.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function sanitizeDownloadFilename(name: string): string {
  return name.replace(/[^\w\s-]/g, " ").replace(/\s+/g, "-").trim().slice(0, 80) || "video";
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  );
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

function formatStatus(status: string): string {
  const map: Record<string, string> = {
    UPLOADED: "Uploaded",
    TRANSCRIBING: "Transcribing",
    READY: "Ready",
    PENDING: "Pending",
    PROCESSING: "Rendering",
    COMPLETED: "Ready",
    ERROR: "Error",
  };
  return map[status] ?? status;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    UPLOADED: "bg-amber-100 text-amber-800",
    TRANSCRIBING: "bg-blue-100 text-blue-800",
    READY: "bg-emerald-100 text-emerald-800",
    PENDING: "bg-amber-100 text-amber-800",
    PROCESSING: "bg-blue-100 text-blue-800",
    COMPLETED: "bg-emerald-100 text-emerald-800",
    ERROR: "bg-red-100 text-red-800",
  };
  const style = styles[status] ?? "bg-slate-100 text-slate-700";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`}
    >
      {formatStatus(status)}
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
  type TranscriptData = {
    transcript: {
      words: { text: string; start: number; end: number }[];
      sentences: { text: string; start: number; end: number }[];
    };
    segments: { start: number; end: number; text: string }[];
  };
  const [transcriptData, setTranscriptData] = useState<TranscriptData | null>(null);
  const [loadingTranscript, setLoadingTranscript] = useState(false);

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

  useEffect(() => {
    fetchVideo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!video || video.status === "READY") return;
    const interval = setInterval(() => {
      fetchVideo({ silent: true });
    }, 4000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video?.status, id]);

  useEffect(() => {
    setTranscriptData(null);
  }, [id]);

  useEffect(() => {
    if (!id || !video || video.status !== "READY") return;
    if (transcriptData || loadingTranscript) return;
    setLoadingTranscript(true);
    fetch(`/api/videos/${id}/transcript`)
      .then(async (r) => {
        const text = await r.text();
        if (!text) return null;
        try {
          return JSON.parse(text) as TranscriptData | null;
        } catch {
          return null;
        }
      })
      .then((data) => {
        if (data?.transcript != null && data?.segments != null) setTranscriptData(data);
      })
      .catch(() => {})
      .finally(() => setLoadingTranscript(false));
  }, [id, video?.status, transcriptData, loadingTranscript]);

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

  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleDeleteVideo = async () => {
    setShowDeleteModal(true);
  };

  const performDeleteVideo = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/videos/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete video");
      }
      window.location.href = "/videos";
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  if (loadingVideo) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-col items-center justify-center py-20">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          <p className="mt-4 text-sm text-slate-500">Loading video…</p>
        </div>
      </div>
    );
  }

  const isProcessing =
    video?.status === "UPLOADED" || video?.status === "TRANSCRIBING" || video?.status === "ANALYZING";
  const videoTitle = video?.title ?? "Video";

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      {isProcessing && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/80 px-4 py-3 text-sm text-indigo-800">
          <strong>Processing in the background.</strong> You can leave this page — we’ll transcribe and generate clips automatically. Status updates every few seconds.
        </div>
      )}

      <header className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {videoTitle}
          </h1>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <StatusBadge status={video?.status ?? "—"} />
            <span>9:16 vertical · Reels, TikTok & Shorts</span>
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
          <button
            type="button"
            onClick={handleDeleteVideo}
            className="rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 shadow-sm transition hover:bg-red-50"
          >
            {isProcessing ? "Cancel & delete video" : "Delete video"}
          </button>
        </div>
      </header>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <section>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Clips</h2>
        {clips.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {clips.map((c) => (
              <article
                key={c.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium text-slate-900 line-clamp-2">
                      {c.title}
                    </h3>
                    <StatusBadge status={c.status} />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span>
                      {c.startTime.toFixed(1)}s – {c.endTime.toFixed(1)}s
                    </span>
                    {c.confidence != null && (
                      <span>{(c.confidence * 100).toFixed(0)}% match</span>
                    )}
                  </div>
                </div>

                {c.outputUrl ? (
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
                    <div className="border-t border-slate-100 p-3">
                      <a
                        href={`/api/clips/${c.id}/download`}
                        download
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                      >
                        <DownloadIcon className="h-4 w-4" />
                        Download clip
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="flex aspect-[9/16] w-full items-center justify-center bg-slate-100">
                    <ClipIcon className="h-10 w-10 text-slate-400" />
                  </div>
                )}

                {transcriptData && (
                  <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-3">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Transcript
                    </p>
                    <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-200 bg-white/60 px-3 py-2">
                      {getClipTranscriptText(c) ? (
                        <p className="text-sm text-slate-700">
                          {getClipTranscriptText(c)}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-500">
                          No transcript for this range.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {c.status === "PENDING" && (
                  <div className="border-t border-slate-100 p-4">
                    <button
                      onClick={() => handleRenderClip(c.id)}
                      className="w-full rounded-xl bg-indigo-600 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500"
                    >
                      Render clip
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
              <ClipIcon className="h-7 w-7 text-slate-400" />
            </div>
            <p className="mt-4 font-medium text-slate-900">No clips yet</p>
            <p className="mt-1 text-sm text-slate-600">
              {video?.status === "READY"
                ? "Click “Generate clips” to find the best moments."
                : "Wait for transcription to finish, then click “Generate clips”."}
            </p>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4">
          <button
            type="button"
            onClick={() => setShowTranscript((v) => !v)}
            className="flex flex-1 items-center justify-between font-medium text-slate-900 hover:bg-slate-50 -m-2 rounded-lg p-2"
          >
            <span>Transcript & segments</span>
            <span className="text-slate-400">{showTranscript ? "▼" : "▶"}</span>
          </button>
          {transcriptData && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => downloadTranscriptTxt(transcriptData, videoTitle)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <DownloadIcon className="h-4 w-4" />
                Download (.txt)
              </button>
              <button
                type="button"
                onClick={() => downloadTranscriptJson(transcriptData, videoTitle)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <DownloadIcon className="h-4 w-4" />
                Download (.json)
              </button>
            </div>
          )}
        </div>
        {showTranscript && (
          <div className="border-t border-slate-100 px-5 pb-5 pt-4">
            {loadingTranscript && (
              <p className="text-sm text-slate-500">Loading transcript…</p>
            )}
            {!loadingTranscript && transcriptData && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Segments (used for clip suggestions)
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Sentence boundaries fed to the model. Each segment is a full sentence.
                  </p>
                  <ul className="mt-3 space-y-3">
                    {transcriptData.segments.map((seg, i) => (
                      <li
                        key={i}
                        className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 text-sm"
                      >
                        <span className="font-mono text-xs text-slate-500">
                          [{seg.start.toFixed(1)}s – {seg.end.toFixed(1)}s]
                        </span>
                        <p className="mt-1 text-slate-800">{seg.text}</p>
                      </li>
                    ))}
                  </ul>
                  {transcriptData.segments.length === 0 && (
                    <p className="text-sm text-slate-500">No segments.</p>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
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
                    <p className="mt-3 text-sm text-slate-500">No transcript content.</p>
                  )}
                </div>
              </div>
            )}
            {!loadingTranscript && showTranscript && !transcriptData && (
              <p className="text-sm text-slate-500">No transcript for this video yet.</p>
            )}
          </div>
        )}
      </section>

      {showDeleteModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h2 className="text-base font-semibold text-slate-900">
              {isProcessing ? "Cancel processing & delete video?" : "Delete this video?"}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              This will permanently remove{" "}
              <span className="font-medium">"{videoTitle}"</span>, its original file,
              and all generated clips. This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-70"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={performDeleteVideo}
                disabled={deleting}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 disabled:opacity-70"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ClipIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
      />
    </svg>
  );
}
