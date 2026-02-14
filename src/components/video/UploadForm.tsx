"use client";

import { useState } from "react";

interface UploadFormProps {
  onUploadComplete?: (videoId: string) => void;
}

export default function UploadForm({ onUploadComplete }: UploadFormProps) {
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

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

      setTitle("");
      setFile(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-xl font-semibold text-slate-900">Upload video</h2>
        <p className="mt-1 text-sm text-slate-500">
          MP4, MOV, AVI or MKV · max 500MB
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-slate-700"
            >
              Video title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Episode 12 — Product launch"
              className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 placeholder-slate-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
              disabled={uploading}
            />
          </div>

          <div>
            <label
              htmlFor="file"
              className="block text-sm font-medium text-slate-700"
            >
              File
            </label>
            <div className="mt-1.5">
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50/50 px-6 py-8 transition hover:border-slate-400 hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-60">
                <input
                  id="file"
                  type="file"
                  accept="video/mp4,video/quicktime,video/x-msvideo,video/x-matroska"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="hidden"
                  disabled={uploading}
                />
                {file ? (
                  <span className="text-sm font-medium text-slate-700">
                    {file.name}
                  </span>
                ) : (
                  <span className="text-sm text-slate-500">
                    Click or drag to select a video
                  </span>
                )}
                {file && (
                  <span className="mt-1 text-xs text-slate-400">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                )}
              </label>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {uploading && (
            <div className="space-y-2">
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-indigo-600 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-center text-sm text-slate-500">
                {progress < 100 ? "Uploading…" : "Processing…"}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={uploading || !file || !title}
            className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
          >
            {uploading ? "Uploading…" : "Upload video"}
          </button>
        </form>
      </div>
    </div>
  );
}
