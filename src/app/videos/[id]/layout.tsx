import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { getBaseUrl } from "@/lib/seo";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const video = await prisma.video.findUnique({
      where: { id },
      select: { title: true },
    });
    const title = video?.title ?? "Video";
    const description = `${title} — Generate clips for Reels, TikTok and YouTube Shorts with Kllivo.`;

    return {
      title,
      description,
      openGraph: {
        title: `${title} | Kllivo`,
        description,
      },
      robots: {
        index: false, // Private user content
        follow: false,
      },
    };
  } catch {
    return {
      title: "Video",
      robots: { index: false, follow: false },
    };
  }
}

export default function VideoDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
