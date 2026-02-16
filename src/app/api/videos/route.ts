import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

/** GET /api/videos — list videos owned by the current user. */
export async function GET() {
  try {
    const user = await requireAuth();
    const videos = await prisma.video.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        status: true,
        duration: true,
        thumbnailUrl: true,
        createdAt: true,
        _count: { select: { clips: true } },
      },
    });
    return NextResponse.json({ videos });
  } catch (e) {
    const err = e as Error;
    if (err.message === "Unauthorized") {
      return NextResponse.json({ error: "Please sign in" }, { status: 401 });
    }
    throw e;
  }
}
