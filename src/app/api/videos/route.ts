import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/** GET /api/videos — list videos owned by the current user.
 *  Supports pagination: ?page=1&limit=20
 *  Returns all videos if no page param (backward compatible). */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = request.nextUrl;
    const pageParam = searchParams.get("page");
    const limitParam = searchParams.get("limit");

    const where = { userId: user.id };
    const select = {
      id: true,
      title: true,
      status: true,
      duration: true,
      thumbnailUrl: true,
      createdAt: true,
      _count: { select: { clips: true } },
    };

    // If page param is provided, use pagination
    if (pageParam) {
      const page = Math.max(1, parseInt(pageParam) || 1);
      const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(limitParam ?? "") || DEFAULT_LIMIT));
      const skip = (page - 1) * limit;

      const [videos, total] = await Promise.all([
        prisma.video.findMany({
          where,
          orderBy: { createdAt: "desc" },
          select,
          skip,
          take: limit,
        }),
        prisma.video.count({ where }),
      ]);

      return NextResponse.json({
        videos,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: skip + limit < total,
        },
      });
    }

    // No page param — return capped list (backward compatible shape, prevents huge responses)
    const videos = await prisma.video.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select,
      take: MAX_LIMIT,
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
