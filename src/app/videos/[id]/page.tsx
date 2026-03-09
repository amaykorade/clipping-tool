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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast("success", "Rendering started. This clip will be ready in a few minutes.");
      await refreshClips();
    } catch (e) {
      showToast("error", (e as Error).message);
    }
  };

  const handleRenderAll = async () => {
    try {
      const res = await fetch(`/api/videos/${id}/render-all-clips`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
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

  return (
    <div className="mx-auto max-w-4xl space-y-8">
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

      {video?.status === "READY" && hasRenderingClips && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/80 px-5 py-3.5 text-sm text-indigo-800 dark:border-indigo-700/50 dark:bg-indigo-950/40 dark:text-indigo-300">
          {clips.some((c) => c.status === "PROCESSING") ? (
            <><strong>Creating video files...</strong> Clips will appear here when ready.</>
          ) : (
            <><strong>Clips ready.</strong> Click &quot;Create video files&quot; or &quot;Render clip&quot; on each to generate downloadable videos.</>
          )}
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
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            {videoTitle}
          </h1>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <StatusBadge status={video?.status ?? "---"} />
            <span>9:16 vertical</span>
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            onClick={handleGenerateClips}
            disabled={loading || video?.status !== "READY"}
            className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Generating..." : clips.length > 0 ? "Regenerate clips" : "Generate clips"}
          </button>
          {clips.some((c) => c.status === "PENDING") && (
            <button
              onClick={handleRenderAll}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
            >
              Create video files
            </button>
          )}
          {clips.some((c) => c.status === "COMPLETED") && (
            <a
              href={`/api/videos/${id}/download-clips`}
              download
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
            >
              Download all (.zip)
            </a>
          )}
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 shadow-sm transition hover:bg-red-50 dark:border-red-700/50 dark:bg-slate-800 dark:text-red-400 dark:hover:bg-red-950/30"
          >
            Delete
          </button>
        </div>
      </header>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-700/50 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Clips section */}
      <section>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Clips{clips.length > 0 ? ` (${clips.filter((c) => !speakerFilter || c.speaker === speakerFilter).length})` : ""}
          </h2>
          {speakers.length > 1 && (
            <div className="flex gap-1">
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
        </div>

        {clips.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {clips.filter((c) => !speakerFilter || c.speaker === speakerFilter).map((c) => (
              <article key={c.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium text-slate-900 line-clamp-2 dark:text-white">{c.title}</h3>
                    <StatusBadge status={c.status} />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <span>{c.startTime.toFixed(1)}s - {c.endTime.toFixed(1)}s</span>
                    {c.confidence != null && <span>{(c.confidence * 100).toFixed(0)}% match</span>}
                    {c.speaker && (
                      <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                        Speaker {c.speaker}
                      </span>
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
                      onError={() => setVideoErrors((prev) => ({ ...prev, [c.id]: true }))}
                      onLoadedData={() => setVideoErrors((prev) => ({ ...prev, [c.id]: false }))}
                    />
                    {videoErrors[c.id] && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-900/90 p-4 text-center text-sm text-white">
                        <span>Video could not load.</span>
                        <a href={toSameOriginUrl(c.outputUrl)} target="_blank" rel="noopener noreferrer" className="font-medium underline">
                          Open in new tab
                        </a>
                      </div>
                    )}
                    <div className="border-t border-slate-700 p-3">
                      <a
                        href={`/api/clips/${c.id}/download`}
                        download
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-700"
                      >
                        <DownloadIcon className="h-4 w-4" />
                        Download clip
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="flex aspect-[9/16] w-full flex-col items-center justify-center gap-3 bg-slate-100 dark:bg-slate-700/50">
                    {c.status === "PROCESSING" ? (
                      <>
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent dark:border-indigo-400 dark:border-t-transparent" />
                        {c.renderProgress != null && c.renderProgress > 0 ? (
                          <>
                            <div className="mx-4 h-1.5 w-3/4 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-600">
                              <div className="h-full rounded-full bg-indigo-600 transition-all duration-300 dark:bg-indigo-400" style={{ width: `${c.renderProgress}%` }} />
                            </div>
                            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Rendering... {c.renderProgress}%</span>
                          </>
                        ) : (
                          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Rendering...</span>
                        )}
                      </>
                    ) : (
                      <ClipIcon className="h-10 w-10 text-slate-400 dark:text-slate-500" />
                    )}
                  </div>
                )}

                {transcriptData && (
                  <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/80">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Transcript</p>
                    <div className="max-h-32 overflow-y-auto rounded-lg border border-slate-200 bg-white/60 px-3 py-2 dark:border-slate-600 dark:bg-slate-700/50">
                      {getClipTranscriptText(c) ? (
                        <p className="text-sm text-slate-700 dark:text-slate-300">{getClipTranscriptText(c)}</p>
                      ) : (
                        <p className="text-xs text-slate-500 dark:text-slate-400">No transcript for this range.</p>
                      )}
                    </div>
                  </div>
                )}

                {c.status === "PENDING" && (
                  <div className="border-t border-slate-100 p-4 dark:border-slate-700">
                    <button
                      onClick={() => handleRenderClip(c.id)}
                      className="w-full rounded-xl bg-indigo-600 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500"
                    >
                      Render clip
                    </button>
                  </div>
                )}

                {/* Feedback */}
                <div className="flex items-center justify-end gap-1 border-t border-slate-100 px-4 py-2 dark:border-slate-700">
                  <button
                    onClick={async () => {
                      const next = c.feedback === "like" ? null : "like";
                      await fetch(`/api/clips/${c.id}/feedback`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ feedback: next }) });
                      setClips((prev) => prev.map((cl) => cl.id === c.id ? { ...cl, feedback: next } : cl));
                    }}
                    className={`rounded-lg p-1.5 text-sm transition ${c.feedback === "like" ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400" : "text-slate-400 hover:text-green-600 dark:hover:text-green-400"}`}
                    title="More like this"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                    </svg>
                  </button>
                  <button
                    onClick={async () => {
                      const next = c.feedback === "dislike" ? null : "dislike";
                      await fetch(`/api/clips/${c.id}/feedback`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ feedback: next }) });
                      setClips((prev) => prev.map((cl) => cl.id === c.id ? { ...cl, feedback: next } : cl));
                    }}
                    className={`rounded-lg p-1.5 text-sm transition ${c.feedback === "dislike" ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" : "text-slate-400 hover:text-red-600 dark:hover:text-red-400"}`}
                    title="Less like this"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v2a3.5 3.5 0 003.5 3.5h.792c.278 0 .557-.183.644-.447l.876-2.628A1 1 0 0015.906 16H17m-7-2h2m5 0a2 2 0 002-2V6a2 2 0 00-2-2h-2.5" />
                    </svg>
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center dark:border-slate-600 dark:bg-slate-800">
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
      </section>

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

function ClipIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  );
}
