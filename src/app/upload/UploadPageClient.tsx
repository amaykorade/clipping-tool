"use client";

import UploadForm from "@/components/video/UploadForm";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function UploadPageClient() {
  const router = useRouter();

  const handleUploadComplete = (videoId: string) => {
    router.push(`/videos/${videoId}`);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <nav className="mb-8 flex items-center gap-2 text-sm text-slate-500">
        <Link href="/" className="transition hover:text-slate-900">
          Home
        </Link>
        <span aria-hidden>/</span>
        <span className="font-medium text-slate-900">Upload</span>
      </nav>

      <header className="mb-10">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Upload video
        </h1>
        <p className="mt-2 text-slate-600">
          Add a long-form video. We’ll transcribe it, find the best moments, and generate
          ready-to-post clips for Reels, TikTok and Shorts.
        </p>
      </header>

      <UploadForm onUploadComplete={handleUploadComplete} />

      <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
        <p>
          <strong className="font-medium text-slate-700">Processing in the background.</strong>{" "}
          After upload you can leave this page. We’ll transcribe and generate clips automatically — check My videos or come back here later.
        </p>
      </div>
    </div>
  );
}
