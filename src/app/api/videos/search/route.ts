import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import type { Transcript } from "@/types";

/**
 * GET /api/videos/search?q=pricing
 * Search across all of the user's video transcripts.
 * Returns matching videos with context snippets and timestamps.
 */
export async function GET(req: NextRequest) {
  const user = await requireAuth();
  const q = req.nextUrl.searchParams.get("q")?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ error: "Query must be at least 2 characters" }, { status: 400 });
  }

  // Find videos whose plain-text transcript contains the query (case-insensitive)
  const videos = await prisma.video.findMany({
    where: {
      userId: user.id,
      transcriptText: { contains: q, mode: "insensitive" },
    },
    select: {
      id: true,
      title: true,
      thumbnailUrl: true,
      duration: true,
      transcript: true,
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  // Build results with context snippets and timestamps
  const results = videos.map((v) => {
    const transcript = v.transcript as Transcript | null;
    const matches: { text: string; timestamp: number }[] = [];

    if (transcript?.sentences) {
      const qLower = q.toLowerCase();
      for (const s of transcript.sentences) {
        if (s.text.toLowerCase().includes(qLower)) {
          matches.push({ text: s.text, timestamp: s.start });
        }
      }
    }

    return {
      videoId: v.id,
      title: v.title,
      thumbnailUrl: v.thumbnailUrl,
      duration: v.duration,
      matches,
      matchCount: matches.length,
    };
  });

  return NextResponse.json({ query: q, results, total: results.length });
}
