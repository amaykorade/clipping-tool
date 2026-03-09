import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { getPlanLimits } from "@/lib/plans";
import type { Plan } from "@/lib/plans";

/**
 * GET /api/analytics
 * User-facing analytics: usage stats, clip performance, storage.
 */
export async function GET() {
  const user = await requireAuth();

  const [
    videoCount,
    clipCount,
    completedClipCount,
    totalStorageBytes,
    recentVideos,
    topClips,
  ] = await Promise.all([
    prisma.video.count({ where: { userId: user.id } }),
    prisma.clip.count({ where: { video: { userId: user.id } } }),
    prisma.clip.count({ where: { video: { userId: user.id }, status: "COMPLETED" } }),
    prisma.video.aggregate({
      where: { userId: user.id },
      _sum: { fileSize: true },
    }),
    prisma.video.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        createdAt: true,
        duration: true,
        _count: { select: { clips: true } },
      },
    }),
    prisma.clip.findMany({
      where: { video: { userId: user.id }, confidence: { not: null } },
      orderBy: { confidence: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        confidence: true,
        status: true,
        video: { select: { id: true, title: true } },
      },
    }),
  ]);

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { plan: true, totalVideosUploaded: true, billingInterval: true },
  });

  const plan = (dbUser?.plan ?? "FREE") as Plan;
  const limits = getPlanLimits(plan);
  const storageBytes = totalStorageBytes._sum.fileSize ?? 0;
  const avgClipsPerVideo = videoCount > 0 ? Math.round(clipCount / videoCount * 10) / 10 : 0;

  return NextResponse.json({
    plan,
    usage: {
      videosUploaded: dbUser?.totalVideosUploaded ?? 0,
      videoLimit: limits.maxVideos,
      storageUsedMB: Math.round(storageBytes / 1024 / 1024),
      storageLimitMB: limits.maxUploadSizeMB * limits.maxVideos,
      totalClips: clipCount,
      completedClips: completedClipCount,
      avgClipsPerVideo,
    },
    recentVideos: recentVideos.map((v) => ({
      id: v.id,
      title: v.title,
      createdAt: v.createdAt,
      duration: v.duration,
      clipCount: v._count.clips,
    })),
    topClips: topClips.map((c) => ({
      id: c.id,
      title: c.title,
      confidence: c.confidence,
      status: c.status,
      videoId: c.video.id,
      videoTitle: c.video.title,
    })),
  });
}
