"use client";

import UploadForm from "@/components/video/UploadForm";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function UploadPage() {
  const router = useRouter();

  const handleUploadComplete = (videoId: string) => {
    router.push(`/videos/${videoId}`);
  };

  return (
    <div className="py-4">
      <Link
        href="/"
        className="mb-6 inline-flex items-center text-sm font-medium text-slate-600 transition hover:text-slate-900"
      >
        ← Back
      </Link>
      <UploadForm onUploadComplete={handleUploadComplete} />
    </div>
  );
}
