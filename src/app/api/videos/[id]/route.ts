import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, requireAuth } from "@/lib/auth";
import { getStorage } from "@/lib/storage";
import { toUserFriendlyError } from "@/lib/errorMessages";

function extractStorageKeyFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const prefix = "/upload/";
    const idx = u.pathname.indexOf(prefix);
    if (idx === -1) {
      // Fallback: strip leading slash
      return u.pathname.replace(/^\//, "");
    }
    return u.pathname.slice(idx + prefix.length);
  } catch {
    return null;
  }
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const session = await getSession();
  const video = await prisma.video.findUnique({
    where: { id },
    include: {
      clips: {
        orderBy: { startTime: "asc" },
      },
      jobs: {
        where: { status: "FAILED" },
        orderBy: { updatedAt: "desc" },
        take: 1,
        select: { error: true },
      },
    },
  });
  if (!video) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }
  // If video is owned, only the owner can access it
  if (video.userId && video.userId !== session?.user?.id) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }
  const rawError = video.status === "ERROR" ? video.jobs[0]?.error ?? null : null;
  const errorDisplay = rawError ? toUserFriendlyError(rawError) : null;

  return NextResponse.json({
    id: video.id,
    title: video.title,
    status: video.status,
    duration: video.duration,
    originalUrl: video.originalUrl,
    thumbnailUrl: video.thumbnailUrl,
    transcribedAt: video.transcribedAt,
    clips: video.clips.map((c) => ({
      id: c.id,
      title: c.title,
      startTime: c.startTime,
      endTime: c.endTime,
      confidence: c.confidence,
      status: c.status,
      outputUrl: c.outputUrl,
    })),
    errorMessage: rawError,
    errorDisplay,
  });
}

// DELETE /api/videos/:id — cancel any further processing by deleting the video,
// its clips and all associated stored files for the current user.
export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const user = await requireAuth();

  const video = await prisma.video.findFirst({
    where: { id, userId: user.id },
    include: {
      clips: true,
    },
  });

  if (!video) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  const storage = getStorage();
  const deletions: Promise<unknown>[] = [];

  // Original video file
  if (video.storageKey) {
    deletions.push(storage.delete(video.storageKey).catch(() => {}));
  }

  // Thumbnail (if any)
  const thumbKey = extractStorageKeyFromUrl(video.thumbnailUrl);
  if (thumbKey) {
    deletions.push(storage.delete(thumbKey).catch(() => {}));
  }

  // Clip files (short videos)
  for (const clip of video.clips) {
    const key = extractStorageKeyFromUrl(clip.outputUrl ?? undefined);
    if (key) {
      deletions.push(storage.delete(key).catch(() => {}));
    }
  }

  await Promise.allSettled(deletions);

  // Deleting the video will cascade to clips and jobs (see Prisma schema)
  await prisma.video.delete({ where: { id: video.id } });

  return NextResponse.json({ ok: true });
}

