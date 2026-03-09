import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, canAccessVideo } from "@/lib/auth";

/**
 * POST /api/clips/[id]/feedback
 * Body: { feedback: "like" | "dislike" | null }
 * Stores user preference for this clip, used in future regeneration.
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const session = await getSession();

  const clip = await prisma.clip.findUnique({
    where: { id },
    include: { video: { select: { userId: true } } },
  });

  if (!clip || !clip.video || !canAccessVideo(clip.video, session)) {
    return NextResponse.json({ error: "Clip not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const feedback = body.feedback;

  if (feedback !== "like" && feedback !== "dislike" && feedback !== null) {
    return NextResponse.json({ error: "feedback must be 'like', 'dislike', or null" }, { status: 400 });
  }

  await prisma.clip.update({
    where: { id },
    data: { feedback },
  });

  return NextResponse.json({ success: true, feedback });
}
