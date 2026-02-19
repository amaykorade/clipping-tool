"use client";

import { useRef, useState, useEffect } from "react";

interface UploadFormProps {
  onUploadComplete?: (videoId: string) => void;
}

type UploadStrategy = "direct" | "presigned";

export default function UploadForm({ onUploadComplete }: UploadFormProps) {
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [uploadStrategy, setUploadStrategy] = useState<UploadStrategy>("direct");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/video/upload")
      .then((r) => r.json())
      .then((d) => setUploadStrategy(d.uploadStrategy || "direct"))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file || !title) {
      setError("Please provide both title and file");
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

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!uploading) setDragActive(e.type === "dragenter" || e.type === "dragover");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (uploading) return;
    const f = e.dataTransfer.files?.[0];
    if (f && /^video\//.test(f.type)) setFile(f);
  };

  const openFileDialog = () => {
    if (!uploading) fileInputRef.current?.click();
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <form onSubmit={handleSubmit} className="p-6 sm:p-8">
        <div className="space-y-8">
          {/* Title */}
          <div>
            <label
              htmlFor="upload-title"
              className="block text-sm font-medium text-slate-900"
            >
              Video title
            </label>
            <p className="mt-0.5 text-sm text-slate-500">
              A short name for this video (e.g. episode name or topic).
            </p>
            <input
              id="upload-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Episode 12 — Product launch"
              className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder-slate-400 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-50 disabled:text-slate-500"
              disabled={uploading}
            />
          </div>

          {/* File drop zone */}
          <div>
            <label className="block text-sm font-medium text-slate-900">
              Video file
            </label>
            <p className="mt-0.5 text-sm text-slate-500">
              MP4, MOV, AVI or MKV · max 500MB
            </p>
            <input
              ref={fileInputRef}
              id="upload-file"
              type="file"
              accept="video/mp4,video/quicktime,video/x-msvideo,video/x-matroska"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="hidden"
              disabled={uploading}
            />
            <div
              role="button"
              tabIndex={0}
              onClick={openFileDialog}
              onKeyDown={(e) => e.key === "Enter" && openFileDialog()}
              className={`mt-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition sm:py-12 ${
                dragActive
                  ? "border-indigo-400 bg-indigo-50/50"
                  : file
                    ? "border-slate-200 bg-slate-50/50"
                    : "border-slate-200 bg-slate-50/30 hover:border-slate-300 hover:bg-slate-50/50"
              } ${uploading ? "pointer-events-none opacity-70" : "cursor-pointer"}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {file ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
                    <UploadIcon className="h-6 w-6 text-indigo-600" />
                  </div>
                  <p className="font-medium text-slate-900">{file.name}</p>
                  <p className="text-sm text-slate-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  {!uploading && (
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
                    MP4, MOV, AVI, MKV · up to 500MB
                  </p>
                </>
              )}
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
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
                  className="h-full rounded-full bg-indigo-600 transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={uploading || !file || !title}
            className="w-full rounded-xl bg-indigo-600 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none"
          >
            {uploading ? "Uploading…" : "Upload video"}
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
