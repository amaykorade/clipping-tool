import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import UploadPageClient from "./UploadPageClient";

export const metadata: Metadata = {
  title: "Upload Video",
  description:
    "Upload your long-form video. We transcribe, find the best moments, and give you clip-ready shorts for Reels, TikTok and YouTube Shorts.",
};

export default async function UploadPage() {
  const session = await getSession();
  if (!session?.user) {
    redirect("/?upload=signin");
  }
  return <UploadPageClient />;
}
