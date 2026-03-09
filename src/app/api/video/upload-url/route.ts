import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatFileSize, getMaxUploadSizeBytes, getNextPlanWithHigherUpload, getPlanLimits } from "@/lib/plans";
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rateLimit";
import { createPendingUploadForDirectUpload } from "@/lib/video/upload";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const MAX_HARD = 10 * 1024 * 1024 * 1024; // 10 GB hard cap
const UploadUrlSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  filename: z.string().min(1, "Filename is required"),
  fileSize: z.number().int().positive().max(MAX_HARD),
  contentType: z.string().min(1),
});

const ALLOWED_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-matroska",
  "video/webm",
  "video/x-m4v",
];

/**
 * POST /api/video/upload-url
 * Returns a presigned S3 PUT URL for direct browser upload. Call this first,
 * then PUT the file to uploadUrl, then call POST /api/video/upload-complete.
 * Only used when STORAGE_TYPE=s3.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    const rl = checkRateLimit(`upload:${user.id}`, RATE_LIMITS.upload);
    if (!rl.ok) return rateLimitResponse(rl.retryAfterMs);

    const body = await request.json();
    const parsed = UploadUrlSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.message },
        { status: 400 },
      );
    }
    const { title, filename, fileSize, contentType } = parsed.data;

    const userWithPlan = await prisma.user.findUnique({
      where: { id: user.id },
      select: { plan: true },
    });
    const plan = (userWithPlan?.plan ?? "FREE") as "FREE" | "STARTER" | "PRO";
    const maxBytes = getMaxUploadSizeBytes(plan);
    if (fileSize > maxBytes) {
      const nextPlan = getNextPlanWithHigherUpload(plan);
      const hint = nextPlan
        ? ` Upgrade to ${getPlanLimits(nextPlan).label} for ${formatFileSize(getMaxUploadSizeBytes(nextPlan))}.`
        : "";
      return NextResponse.json(
        {
          error: `File is ${formatFileSize(fileSize)}. Your plan allows up to ${formatFileSize(maxBytes)} per video.${hint}`,
        },
        { status: 400 },
      );
    }

    if (!ALLOWED_TYPES.includes(contentType)) {
      return NextResponse.json(
        { error: "Invalid file type. Supported: MP4, MOV, AVI, MKV, WebM, M4V." },
        { status: 400 },
      );
    }

    const result = await createPendingUploadForDirectUpload({
      title,
      originalFileName: filename,
      fileSize,
      contentType,
      userId: user.id,
    });

    return NextResponse.json({
      videoId: result.videoId,
      uploadUrl: result.uploadUrl,
    });
  } catch (error) {
    const err = error as Error;
    if (err.message === "Unauthorized") {
      return NextResponse.json({ error: "Please sign in to upload" }, { status: 401 });
    }
    if (err.message.includes("Direct upload requires")) {
      return NextResponse.json(
        { error: "Direct upload is not configured. Use regular upload." },
        { status: 400 },
      );
    }
    console.error("[API] Upload URL error:", error);
    return NextResponse.json(
      { error: err.message || "Failed to create upload URL" },
      { status: 500 },
    );
  }
}
