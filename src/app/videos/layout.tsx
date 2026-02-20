import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Videos",
  description:
    "Your video library. Upload videos, get AI-generated clips for Reels, TikTok and YouTube Shorts.",
};

export default function VideosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
