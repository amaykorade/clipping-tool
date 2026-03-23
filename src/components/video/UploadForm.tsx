"use client";

import { useRef, useState, useEffect } from "react";

interface UploadFormProps {
  onUploadComplete?: (videoId: string) => void;
}

type UploadStrategy = "direct" | "presigned";
type Mode = "file" | "url";

export default function UploadForm({ onUploadComplete }: UploadFormProps) {
  const [mode, setMode] = useState<Mode>("file");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [uploadStrategy, setUploadStrategy] = useState<UploadStrategy>("direct");
  const [maxFileSize, setMaxFileSize] = useState<number>(500 * 1024 * 1024);
  const [maxFileSizeLabel, setMaxFileSizeLabel] = useState<string>("500 MB");
  const [videosUsed, setVideosUsed] = useState<number>(0);
  const [videosMax, setVideosMax] = useState<number>(1);
  const [planLabel, setPlanLabel] = useState<string>("Free");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const busy = uploading || importing;
  const quotaReached = videosUsed >= videosMax;

  useEffect(() => {
    fetch("/api/video/upload")
      .then((r) => r.json())
      .then((d) => {
        setUploadStrategy(d.uploadStrategy || "direct");
        setMaxFileSize(d.maxFileSize ?? 500 * 1024 * 1024);
        setMaxFileSizeLabel(d.maxFileSizeLabel ?? "500 MB");
        setVideosUsed(d.videosUsed ?? 0);
        setVideosMax(d.videosMax ?? 1);
        setPlanLabel(d.planLabel ?? "Free");
      })
      .catch(() => {});
  }, []);

  const handleFileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file || !title) {
      setError("Please provide both title and file");
      return;
    }

    if (file.size > maxFileSize) {
      setError(`File is too large. Your plan allows up to ${maxFileSizeLabel} per video. Upgrade to increase the limit.`);
      return;
    }

    setUploading(true);
    setError("");
    setProgress(0);

    try {
      if (uploadStrategy === "presigned") {
        const urlRes = await fetch("/api/video/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            filename: file.name,
            fileSize: file.size,
            contentType: file.type,
          }),
        });
        if (!urlRes.ok) {
          const d = await urlRes.json();
          throw new Error(d.error || "Failed to get upload URL");
        }
        const { videoId, uploadUrl } = await urlRes.json();

        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) {
            setProgress(Math.round((ev.loaded / ev.total) * 90));
          }
        };
        await new Promise<void>((resolve, reject) => {
          xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error("Upload failed")));
          xhr.onerror = () => reject(new Error("Upload failed"));
          xhr.send(file);
        });

        setProgress(95);
        const completeRes = await fetch("/api/video/upload-complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoId }),
        });
        if (!completeRes.ok) {
          const d = await completeRes.json();
          throw new Error(d.error || "Failed to complete upload");
        }

        setProgress(100);
        onUploadComplete?.(videoId);
      } else {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("title", title);

        const response = await fetch("/api/video/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const contentType = response.headers.get("content-type") ?? "";
          const message = contentType.includes("application/json")
            ? (await response.json()).error
            : await response.text();
          throw new Error(message || "Upload failed");
        }

        const data = await response.json();

        setProgress(100);
        onUploadComplete?.(data.video.id);
      }

      setTitle("");
      setFile(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!youtubeUrl.trim()) {
      setError("Please paste a YouTube URL");
      return;
    }

    setImporting(true);
    setError("");

    try {
      const response = await fetch("/api/video/import-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: youtubeUrl.trim(),
          ...(title.trim() && { title: title.trim() }),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Import failed");
      }

      const data = await response.json();
      setYoutubeUrl("");
      setTitle("");
      onUploadComplete?.(data.video.id);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setImporting(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!busy) setDragActive(e.type === "dragenter" || e.type === "dragover");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (busy) return;
    const f = e.dataTransfer.files?.[0];
    if (f && /^video\//.test(f.type)) setFile(f);
  };

  const openFileDialog = () => {
    if (!busy) fileInputRef.current?.click();
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      {/* Quota banner */}
      {quotaReached ? (
        <div className="rounded-t-2xl border-b border-red-200 bg-red-50 px-6 py-4 dark:border-red-800/50 dark:bg-red-950/40">
          <p className="text-sm font-medium text-red-800 dark:text-red-300">
            You&apos;ve used all {videosMax} video{videosMax === 1 ? "" : "s"} on your {planLabel} plan.{" "}
            <a href="/pricing" className="font-semibold underline underline-offset-2 hover:text-red-900 dark:hover:text-red-200">
              Upgrade to upload more
            </a>
          </p>
        </div>
      ) : (
        <div className="rounded-t-2xl border-b border-slate-100 bg-slate-50/50 px-6 py-3 dark:border-slate-700 dark:bg-slate-800/50">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {videosUsed} of {videosMax} video{videosMax === 1 ? "" : "s"} used this cycle
            <span className="mx-1.5 text-slate-300 dark:text-slate-600">·</span>
            {planLabel} plan
          </p>
        </div>
      )}

      {/* Mode toggle */}
      <div className="flex gap-1 border-b border-slate-200 px-6 pt-6 sm:px-8 sm:pt-8 dark:border-slate-700">
        <button
          type="button"
          onClick={() => { setMode("file"); setError(""); }}
          className={`rounded-t-lg px-4 py-2.5 text-sm font-medium transition ${
            mode === "file"
              ? "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
              : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          <span className="flex items-center gap-2">
            <UploadIcon className="h-4 w-4" />
            Upload file
          </span>
        </button>
        <button
          type="button"
          onClick={() => { setMode("url"); setError(""); }}
          className={`rounded-t-lg px-4 py-2.5 text-sm font-medium transition ${
            mode === "url"
              ? "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
              : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          <span className="flex items-center gap-2">
            <YoutubeIcon className="h-4 w-4" />
            YouTube URL
          </span>
        </button>
      </div>

      <form onSubmit={mode === "file" ? handleFileSubmit : handleUrlSubmit} className="p-6 sm:p-8">
        <div className="space-y-8">
          {/* Title */}
          <div>
            <label
              htmlFor="upload-title"
              className="block text-sm font-medium text-slate-900 dark:text-white"
            >
              Video title
            </label>
            <p className="mt-0.5 text-sm text-slate-500">
              {mode === "url"
                ? "Optional — leave blank to use the YouTube title."
                : "A short name for this video (e.g. episode name or topic)."}
            </p>
            <input
              id="upload-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={mode === "url" ? "Leave blank to use YouTube title" : "e.g. Episode 12 — Product launch"}
              className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder-slate-400 transition focus:border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-600/20 disabled:bg-slate-50 disabled:text-slate-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder-slate-500 dark:disabled:bg-slate-800"
              disabled={busy}
            />
          </div>

          {mode === "file" ? (
            /* File drop zone */
            <div>
              <label className="block text-sm font-medium text-slate-900 dark:text-white">
                Video file
              </label>
              <p className="mt-0.5 text-sm text-slate-500">
                MP4, MOV, AVI or MKV · up to {maxFileSizeLabel}
              </p>
              <input
                ref={fileInputRef}
                id="upload-file"
                type="file"
                accept="video/mp4,video/quicktime,video/x-msvideo,video/x-matroska"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="hidden"
                disabled={busy}
              />
              <div
                role="button"
                tabIndex={0}
                onClick={openFileDialog}
                onKeyDown={(e) => e.key === "Enter" && openFileDialog()}
                className={`mt-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition sm:py-12 ${
                  dragActive
                    ? "border-purple-500 bg-purple-50/50"
                    : file
                      ? "border-slate-200 bg-slate-50/50"
                      : "border-slate-200 bg-slate-50/30 hover:border-slate-300 hover:bg-slate-50/50"
                } ${busy ? "pointer-events-none opacity-70" : "cursor-pointer"}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                {file ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                      <UploadIcon className="h-6 w-6 text-purple-700" />
                    </div>
                    <p className="font-medium text-slate-900 dark:text-white">{file.name}</p>
                    <p className="text-sm text-slate-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    {!busy && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openFileDialog();
                        }}
                        className="mt-1 text-sm font-medium text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline"
                      >
                        Choose a different file
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                      <UploadIcon className="h-7 w-7 text-slate-400" />
                    </div>
                    <p className="mt-3 font-medium text-slate-700">
                      {dragActive ? "Drop your video here" : "Click to upload or drag and drop"}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      MP4, MOV, AVI, MKV · up to {maxFileSizeLabel}
                    </p>
                  </>
                )}
              </div>
            </div>
          ) : (
            /* YouTube URL input */
            <div>
              <label
                htmlFor="youtube-url"
                className="block text-sm font-medium text-slate-900 dark:text-white"
              >
                YouTube URL
              </label>
              <p className="mt-0.5 text-sm text-slate-500">
                Paste a link to any public YouTube video.
              </p>
              <div className="relative mt-2">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <YoutubeIcon className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="youtube-url"
                  type="url"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  className="block w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-slate-900 placeholder-slate-400 transition focus:border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-600/20 disabled:bg-slate-50 disabled:text-slate-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder-slate-500 dark:disabled:bg-slate-800"
                  disabled={busy}
                />
              </div>
              <p className="mt-2 text-xs text-slate-400">
                Supports youtube.com/watch, youtu.be, and youtube.com/shorts links
              </p>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-700/50 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </div>
          )}

          {uploading && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700">
                  {progress < 100 ? "Uploading…" : "Processing…"}
                </span>
                <span className="text-slate-500">{Math.round(progress)}%</span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-purple-700 transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {importing && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-800/80">
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-700 border-t-transparent" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Fetching video info from YouTube…
                </span>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={
              busy ||
              quotaReached ||
              (mode === "file" ? !file || !title : !youtubeUrl.trim())
            }
            className="w-full rounded-xl bg-purple-700 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-purple-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
          >
            {mode === "file"
              ? uploading
                ? "Uploading…"
                : "Upload video"
              : importing
                ? "Importing…"
                : "Import from YouTube"}
          </button>
        </div>
      </form>
    </div>
  );
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
      />
    </svg>
  );
}

function YoutubeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}
