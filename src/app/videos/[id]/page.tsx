"use client";

import { use, useState, useEffect } from "react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import { VideoDetailSkeleton } from "@/components/ui/Skeleton";

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
      lines.push(`[${s.start.toFixed(1)}s - ${s.end.toFixed(1)}s] ${s.text}`);
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
  thumbnailUrl?: string | null;
  renderProgress?: number | null;
  speaker?: string | null;
  feedback?: string | null;
}

export default function VideoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { showToast } = useToast();
  const [video, setVideo] = useState<{
    title: string;
    status: string;
    transcribeProgress?: number | null;
    errorDisplay?: { title: string; message: string; action: string } | null;
  } | null>(null);
  const [clips, setClips] = useState<Clip[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingVideo, setLoadingVideo] = useState(true);
  const [error, setError] = useState("");
  const [videoErrors, setVideoErrors] = useState<Record<string, boolean>>({});
  const [showTranscript, setShowTranscript] = useState(false);
  const [speakerFilter, setSpeakerFilter] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  type TranscriptData = {
    transcript: {
      words: { text: string; start: number; end: number }[];
      sentences: { text: string; start: number; end: number }[];
    };
    segments: { start: number; end: number; text: string }[];
  };
  const [transcriptData, setTranscriptData] = useState<TranscriptData | null>(null);
  const [loadingTranscript, setLoadingTranscript] = useState(false);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);

  const fetchVideo = async (opts: { silent?: boolean } = {}) => {
    if (!opts.silent) setLoadingVideo(true);
    try {
      const res = await fetch(`/api/videos/${id}`);
      if (!res.ok) return;
      const data = await res.json();
      setVideo({
        title: data.title,
        status: data.status,
        transcribeProgress: data.transcribeProgress ?? null,
        errorDisplay: data.errorDisplay ?? null,
      });
      setClips(Array.isArray(data.clips) ? data.clips : []);
    } finally {
      if (!opts.silent) setLoadingVideo(false);
    }
  };

  useEffect(() => { fetchVideo(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasRenderingClips = clips.some((c) => c.status === "PENDING" || c.status === "PROCESSING");
  const shouldPoll =
    video &&
    video.status !== "ERROR" &&
    (video.status === "UPLOADED" || video.status === "TRANSCRIBING" || (video.status === "READY" && hasRenderingClips));

  useEffect(() => {
    if (!shouldPoll) return;
    const interval = setInterval(() => fetchVideo({ silent: true }), 4000);
    return () => clearInterval(interval);
  }, [shouldPoll, id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { setTranscriptData(null); }, [id]);

  useEffect(() => {
    if (!id || !video || video.status !== "READY") return;
    if (transcriptData || loadingTranscript) return;
    setLoadingTranscript(true);
    fetch(`/api/videos/${id}/transcript`)
      .then(async (r) => {
        const text = await r.text();
        if (!text) return null;
        try { return JSON.parse(text) as TranscriptData | null; } catch { return null; }
      })
      .then((data) => { if (data?.transcript != null && data?.segments != null) setTranscriptData(data); })
      .catch(() => {})
      .finally(() => setLoadingTranscript(false));
  }, [id, video?.status, transcriptData, loadingTranscript]);

  useEffect(() => {
    if (!selectedClipId) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setSelectedClipId(null); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedClipId]);

  const getClipTranscriptText = (clip: Clip) => {
    if (!transcriptData) return "";
    const tol = 0.05;
    const words = transcriptData.transcript.words ?? [];
    return words.filter((w) => w.end > clip.startTime - tol && w.start < clip.endTime + tol).map((w) => w.text).join(" ");
  };

  const handleGenerateClips = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/videos/${id}/generate-clips`, { method: "POST" });
      const contentType = res.headers.get("content-type") ?? "";
      const isJson = contentType.includes("application/json");
      const data = isJson ? await res.json() : { error: (await res.text()) || "Server error" };
      if (!res.ok) throw new Error(data.error || "Failed");
      setClips(Array.isArray(data.clips) ? data.clips : []);
      showToast("success", "Clips regenerated. New clips appear below.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const refreshClips = async () => {
    try {
      const res = await fetch(`/api/videos/${id}`);
      if (res.ok) { const data = await res.json(); setClips(Array.isArray(data.clips) ? data.clips : []); }
    } catch { /* ignore */ }
  };

  const handleRenderClip = async (clipId: string) => {
    try {
      const res = await fetch(`/api/clips/${clipId}/render`, { method: "POST" });
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (!res.ok) throw new Error(data.error || "Render request failed");
      showToast("success", "Rendering started. This clip will be ready in a few minutes.");
      await refreshClips();
    } catch (e) {
      showToast("error", (e as Error).message);
    }
  };

  const handleRenderAll = async () => {
    try {
      const res = await fetch(`/api/videos/${id}/render-all-clips`, { method: "POST" });
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (!res.ok) throw new Error(data.error || "Render request failed");
      showToast("success", `${data.count} clip${data.count === 1 ? "" : "s"} queued for rendering.`);
      await refreshClips();
    } catch (e) {
      showToast("error", (e as Error).message);
    }
  };

  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

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
      showToast("error", (e as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  if (loadingVideo) return <VideoDetailSkeleton />;

  const isProcessing = video?.status === "UPLOADED" || video?.status === "TRANSCRIBING" || video?.status === "ANALYZING";
  const videoTitle = video?.title ?? "Video";
  const speakers = [...new Set(clips.map((c) => c.speaker).filter(Boolean))] as string[];
  const filteredClips = clips.filter((c) => !speakerFilter || c.speaker === speakerFilter);
  const readyClips = filteredClips.filter((c) => c.status === "COMPLETED");
  const pendingClips = filteredClips.filter((c) => c.status !== "COMPLETED");
  const selectedClip = selectedClipId ? clips.find((c) => c.id === selectedClipId) ?? null : null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Status banners */}
      {video?.status === "ERROR" && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 dark:border-red-700/50 dark:bg-red-950/40">
          <h3 className="font-semibold text-red-800 dark:text-red-300">
            {video.errorDisplay?.title ?? "Processing failed"}
          </h3>
          <p className="mt-1.5 text-sm text-red-700 dark:text-red-400">
            {video.errorDisplay?.message ?? "Something went wrong while processing your video."}
          </p>
          <p className="mt-1 text-sm text-red-700 dark:text-red-400">
            {video.errorDisplay?.action ?? "Delete this video and upload it again to retry."}
          </p>
        </div>
      )}

      {isProcessing && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/80 px-5 py-4 dark:border-indigo-700/50 dark:bg-indigo-950/40">
          <p className="text-sm font-medium text-indigo-800 dark:text-indigo-300">
            We&apos;re processing your video. Clips will appear here in a few minutes.
          </p>
          <p className="mt-1 text-sm text-indigo-700/90 dark:text-indigo-400">
            You can leave this page. Status updates every few seconds.
          </p>
          {video?.transcribeProgress != null && video.transcribeProgress >= 0 && video.transcribeProgress < 100 && (
            <div className="mt-3">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-indigo-200 dark:bg-indigo-800">
                <div className="h-full bg-indigo-600 transition-all duration-500 dark:bg-indigo-400" style={{ width: `${video.transcribeProgress}%` }} />
              </div>
              <p className="mt-1.5 text-xs text-indigo-700/80 dark:text-indigo-400">{video.transcribeProgress}% complete</p>
            </div>
          )}
        </div>
      )}

      {/* Header */}
      <header>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {videoTitle}
            </h1>
            <div className="mt-1.5 flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
              <StatusBadge status={video?.status ?? "---"} />
              {clips.length > 0 && (
                <span>{readyClips.length} of {filteredClips.length} rendered</span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              onClick={handleGenerateClips}
              disabled={loading || video?.status !== "READY"}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Generating..." : clips.length > 0 ? "Regenerate clips" : "Generate clips"}
            </button>
            {clips.some((c) => c.status === "PENDING") && (
              <button
                onClick={handleRenderAll}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
              >
                Render all
              </button>
            )}
            {clips.some((c) => c.status === "COMPLETED") && (
              <a
                href={`/api/videos/${id}/download-clips`}
                download
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
              >
                <DownloadIcon className="h-4 w-4" />
                Download all
              </a>
            )}
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:border-red-700/50 dark:bg-slate-800 dark:text-red-400 dark:hover:bg-red-950/30"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
            </button>
          </div>
        </div>

        {/* Speaker filter pills */}
        {speakers.length > 1 && (
          <div className="mt-4 flex gap-1.5">
            <button
              onClick={() => setSpeakerFilter(null)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                speakerFilter === null
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
              }`}
            >
              All
            </button>
            {speakers.map((s) => (
              <button
                key={s}
                onClick={() => setSpeakerFilter(s === speakerFilter ? null : s)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  speakerFilter === s
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                }`}
              >
                Speaker {s}
              </button>
            ))}
          </div>
        )}
      </header>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-700/50 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Clips gallery */}
      {clips.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filteredClips.map((c) => (
            <article
              key={c.id}
              role={c.status === "COMPLETED" ? "button" : undefined}
              tabIndex={c.status === "COMPLETED" ? 0 : undefined}
              onClick={() => { if (c.status === "COMPLETED") setSelectedClipId(c.id); }}
              onKeyDown={(e) => { if (c.status === "COMPLETED" && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); setSelectedClipId(c.id); } }}
              className={`group relative overflow-hidden rounded-xl border bg-white shadow-sm transition dark:bg-slate-800 ${
                c.status === "COMPLETED"
                  ? "cursor-pointer border-slate-200 hover:shadow-lg hover:border-indigo-300 dark:border-slate-700 dark:hover:border-indigo-500"
                  : "border-slate-200 dark:border-slate-700"
              }`}
            >
              {/* Vertical thumbnail */}
              <div className="relative aspect-[9/16] w-full overflow-hidden bg-slate-100 dark:bg-slate-700/50">
                {c.status === "COMPLETED" && (c.thumbnailUrl || c.outputUrl) ? (
                  <>
                    {c.thumbnailUrl ? (
                      <img
                        src={toSameOriginUrl(c.thumbnailUrl)}
                        alt={c.title}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <video
                        src={toSameOriginUrl(c.outputUrl!)}
                        preload="metadata"
                        muted
                        playsInline
                        className="h-full w-full object-cover"
                      />
                    )}
                    {/* Hover overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition duration-300 group-hover:bg-black/30">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 opacity-0 shadow-xl transition duration-300 group-hover:opacity-100 dark:bg-slate-900/80">
                        <PlayIcon className="ml-0.5 h-5 w-5 text-slate-900 dark:text-white" />
                      </div>
                    </div>
                    {/* Gradient bottom fade for text readability */}
                    <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 to-transparent" />
                  </>
                ) : c.status === "PROCESSING" ? (
                  <div className="flex h-full flex-col items-center justify-center gap-3 p-4">
                    <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-indigo-200 border-t-indigo-600 dark:border-indigo-800 dark:border-t-indigo-400" />
                    {c.renderProgress != null && c.renderProgress > 0 ? (
                      <div className="w-full max-w-[8rem]">
                        <div className="h-1 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-600">
                          <div className="h-full rounded-full bg-indigo-600 transition-all duration-500 dark:bg-indigo-400" style={{ width: `${c.renderProgress}%` }} />
                        </div>
                        <p className="mt-1.5 text-center text-xs font-medium text-slate-500 dark:text-slate-400">{c.renderProgress}%</p>
                      </div>
                    ) : (
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Rendering...</p>
                    )}
                  </div>
                ) : (
                  /* PENDING state */
                  <div className="flex h-full flex-col items-center justify-center gap-3 p-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200/80 dark:bg-slate-600/50">
                      <ClipIcon className="h-6 w-6 text-slate-400 dark:text-slate-500" />
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRenderClip(c.id); }}
                      className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-500"
                    >
                      Render clip
                    </button>
                  </div>
                )}

                {/* Overlaid metadata badges — shown on all states */}
                <div className="absolute top-2 left-2 right-2 flex items-start justify-between">
                  {c.confidence != null && (
                    <span className="rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
                      {(c.confidence * 100).toFixed(0)}%
                    </span>
                  )}
                  {c.speaker && (
                    <span className="rounded-md bg-indigo-600/80 px-1.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
                      S{c.speaker}
                    </span>
                  )}
                </div>

                {/* Duration badge — bottom right */}
                <span className="absolute bottom-2 right-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-white backdrop-blur-sm">
                  {Math.floor((c.endTime - c.startTime) / 60)}:{String(Math.round((c.endTime - c.startTime) % 60)).padStart(2, "0")}
                </span>
              </div>

              {/* Card footer */}
              <div className="px-3 py-2.5">
                <h4 className="text-[13px] font-semibold leading-snug text-slate-900 line-clamp-2 dark:text-white">{c.title}</h4>
                {c.status === "COMPLETED" && (
                  <div className="mt-2 flex items-center gap-1.5">
                    <a
                      href={`/api/clips/${c.id}/download`}
                      download
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex flex-1 items-center justify-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700 transition hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                    >
                      <DownloadIcon className="h-3 w-3" />
                      Download
                    </a>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const next = c.feedback === "like" ? null : "like";
                        fetch(`/api/clips/${c.id}/feedback`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ feedback: next }) });
                        setClips((prev) => prev.map((cl) => cl.id === c.id ? { ...cl, feedback: next } : cl));
                      }}
                      className={`rounded-md p-1 transition ${c.feedback === "like" ? "bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400" : "text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"}`}
                      title="More like this"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const next = c.feedback === "dislike" ? null : "dislike";
                        fetch(`/api/clips/${c.id}/feedback`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ feedback: next }) });
                        setClips((prev) => prev.map((cl) => cl.id === c.id ? { ...cl, feedback: next } : cl));
                      }}
                      className={`rounded-md p-1 transition ${c.feedback === "dislike" ? "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400" : "text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"}`}
                      title="Less like this"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v2a3.5 3.5 0 003.5 3.5h.792c.278 0 .557-.183.644-.447l.876-2.628A1 1 0 0015.906 16H17m-7-2h2m5 0a2 2 0 002-2V6a2 2 0 00-2-2h-2.5" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-20 text-center dark:border-slate-600 dark:bg-slate-800">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700">
            <ClipIcon className="h-7 w-7 text-slate-400 dark:text-slate-500" />
          </div>
          <p className="mt-4 font-medium text-slate-900 dark:text-white">No clips yet</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {video?.status === "READY"
              ? "Click Generate clips to find the best moments."
              : "Clips will appear here automatically in a few minutes."}
          </p>
        </div>
      )}

      {/* Clip detail modal */}
      {selectedClip && selectedClip.outputUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setSelectedClipId(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="relative mx-4 flex max-h-[92vh] w-full max-w-sm flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button — floating */}
            <button
              onClick={() => setSelectedClipId(null)}
              aria-label="Close"
              className="absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/70"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Video player */}
            <div className="relative flex-1 overflow-y-auto">
              <div className="relative bg-black">
                <video
                  key={selectedClip.id}
                  src={toSameOriginUrl(selectedClip.outputUrl)}
                  controls
                  autoPlay
                  preload="metadata"
                  playsInline
                  className="aspect-[9/16] w-full object-contain"
                  onError={() => setVideoErrors((prev) => ({ ...prev, [selectedClip.id]: true }))}
                  onLoadedData={() => setVideoErrors((prev) => ({ ...prev, [selectedClip.id]: false }))}
                />
                {videoErrors[selectedClip.id] && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/90 p-4 text-center text-sm text-white">
                    <span>Video could not load.</span>
                    <a href={toSameOriginUrl(selectedClip.outputUrl!)} target="_blank" rel="noopener noreferrer" className="font-medium text-indigo-400 underline">
                      Open in new tab
                    </a>
                  </div>
                )}
              </div>

              {/* Info + actions */}
              <div className="space-y-3 p-4">
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">{selectedClip.title}</h3>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                    <span>{selectedClip.startTime.toFixed(1)}s – {selectedClip.endTime.toFixed(1)}s</span>
                    {selectedClip.confidence != null && <span>{(selectedClip.confidence * 100).toFixed(0)}% match</span>}
                    {selectedClip.speaker && <span>Speaker {selectedClip.speaker}</span>}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <a
                    href={`/api/clips/${selectedClip.id}/download`}
                    download
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
                  >
                    <DownloadIcon className="h-4 w-4" />
                    Download
                  </a>
                  <button
                    onClick={async () => {
                      const next = selectedClip.feedback === "like" ? null : "like";
                      await fetch(`/api/clips/${selectedClip.id}/feedback`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ feedback: next }) });
                      setClips((prev) => prev.map((cl) => cl.id === selectedClip.id ? { ...cl, feedback: next } : cl));
                    }}
                    className={`rounded-lg p-2.5 transition ${selectedClip.feedback === "like" ? "bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400" : "bg-slate-100 text-slate-400 hover:text-green-600 dark:bg-slate-700 dark:hover:text-green-400"}`}
                    title="More like this"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                    </svg>
                  </button>
                  <button
                    onClick={async () => {
                      const next = selectedClip.feedback === "dislike" ? null : "dislike";
                      await fetch(`/api/clips/${selectedClip.id}/feedback`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ feedback: next }) });
                      setClips((prev) => prev.map((cl) => cl.id === selectedClip.id ? { ...cl, feedback: next } : cl));
                    }}
                    className={`rounded-lg p-2.5 transition ${selectedClip.feedback === "dislike" ? "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400" : "bg-slate-100 text-slate-400 hover:text-red-600 dark:bg-slate-700 dark:hover:text-red-400"}`}
                    title="Less like this"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v2a3.5 3.5 0 003.5 3.5h.792c.278 0 .557-.183.644-.447l.876-2.628A1 1 0 0015.906 16H17m-7-2h2m5 0a2 2 0 002-2V6a2 2 0 00-2-2h-2.5" />
                    </svg>
                  </button>
                </div>

                {/* Transcript */}
                {transcriptData && getClipTranscriptText(selectedClip) && (
                  <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Transcript</p>
                    <div className="max-h-28 overflow-y-auto rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-700/50">
                      <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">{getClipTranscriptText(selectedClip)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transcript section */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center justify-between gap-3 px-5 py-4">
          <button
            type="button"
            onClick={() => setShowTranscript((v) => !v)}
            className="flex items-center gap-2 font-medium text-slate-900 dark:text-white"
          >
            <svg className={`h-4 w-4 text-slate-400 transition-transform ${showTranscript ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
            Transcript & segments
          </button>
          {transcriptData && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowExportMenu((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
              >
                <DownloadIcon className="h-4 w-4" />
                Export
                <svg className="h-3 w-3 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showExportMenu && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowExportMenu(false)} />
                  <div className="absolute right-0 top-full z-40 mt-1 w-48 rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-600 dark:bg-slate-800">
                    <button onClick={() => { downloadTranscriptTxt(transcriptData, videoTitle); setShowExportMenu(false); }} className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700">
                      Download .txt
                    </button>
                    <button onClick={() => { downloadTranscriptJson(transcriptData, videoTitle); setShowExportMenu(false); }} className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700">
                      Download .json
                    </button>
                    <a href={`/api/videos/${id}/transcript?format=srt`} download onClick={() => setShowExportMenu(false)} className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700">
                      Download .srt
                    </a>
                    <a href={`/api/videos/${id}/transcript?format=vtt`} download onClick={() => setShowExportMenu(false)} className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700">
                      Download .vtt
                    </a>
                    <a href={`/api/videos/${id}/transcript?format=chapters`} download onClick={() => setShowExportMenu(false)} className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700">
                      YouTube chapters
                    </a>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
        {showTranscript && (
          <div className="border-t border-slate-100 px-5 pb-5 pt-4 dark:border-slate-700">
            {loadingTranscript && <p className="text-sm text-slate-500 dark:text-slate-400">Loading transcript...</p>}
            {!loadingTranscript && transcriptData && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Segments</h3>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Sentence boundaries used for clip suggestions.</p>
                  <ul className="mt-3 space-y-3">
                    {transcriptData.segments.map((seg, i) => (
                      <li key={i} className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 text-sm dark:border-slate-600 dark:bg-slate-700/50">
                        <span className="font-mono text-xs text-slate-500 dark:text-slate-400">[{seg.start.toFixed(1)}s - {seg.end.toFixed(1)}s]</span>
                        <p className="mt-1 text-slate-800 dark:text-slate-200">{seg.text}</p>
                      </li>
                    ))}
                  </ul>
                  {transcriptData.segments.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">No segments.</p>}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Full transcript</h3>
                  {(transcriptData.transcript.sentences?.length ?? 0) > 0 ? (
                    <ul className="mt-3 space-y-2">
                      {transcriptData.transcript.sentences.map((s, i) => (
                        <li key={i} className="text-sm text-slate-700 dark:text-slate-300">
                          <span className="font-mono text-xs text-slate-400">{s.start.toFixed(1)}-{s.end.toFixed(1)}s</span>{" "}{s.text}
                        </li>
                      ))}
                    </ul>
                  ) : (transcriptData.transcript.words?.length ?? 0) > 0 ? (
                    <p className="mt-3 text-sm text-slate-700 dark:text-slate-300">
                      {transcriptData.transcript.words.map((w) => w.text).join(" ")}
                    </p>
                  ) : (
                    <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">No transcript content.</p>
                  )}
                </div>
              </div>
            )}
            {!loadingTranscript && showTranscript && !transcriptData && (
              <p className="text-sm text-slate-500 dark:text-slate-400">No transcript for this video yet.</p>
            )}
          </div>
        )}
      </section>

      {/* Delete modal */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          onClick={() => setShowDeleteModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              {isProcessing ? "Cancel processing & delete video?" : "Delete this video?"}
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              This will permanently remove <span className="font-medium">&quot;{videoTitle}&quot;</span>, its original file, and all generated clips.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-70 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={performDeleteVideo}
                disabled={deleting}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 disabled:opacity-70"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5.14v14l11-7-11-7z" />
    </svg>
  );
}

function ClipIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  );
}
