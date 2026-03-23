import { JobStatus, JobType } from "@/generated/prisma";
import { getSession, requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSafeApiErrorMessage } from "@/lib/errorMessages";
import { formatFileSize, getMaxUploadSizeBytes, getMaxVideosForCycle, getNextPlanWithHigherUpload, getPlanLimits, MAX_ACTIVE_JOBS_PER_USER } from "@/lib/plans";
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rateLimit";
import { savePendingUpload } from "@/lib/video/upload";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Validation schema
const UploadSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
});

// Upload a video file (requires login)
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    const rl = checkRateLimit(`upload:${user.id}`, RATE_LIMITS.upload);
    if (!rl.ok) return rateLimitResponse(rl.retryAfterMs);

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const title = formData.get("title") as String | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const validation = UploadSchema.safeParse({ title });
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.message },
        { status: 400 },
      );
    }

    // Check file size against plan limit
    const userWithPlan = await prisma.user.findUnique({
      where: { id: user.id },
      select: { plan: true },
    });
    const plan = (userWithPlan?.plan ?? "FREE") as "FREE" | "STARTER" | "PRO";
    const maxBytes = getMaxUploadSizeBytes(plan);
    if (file.size > maxBytes) {
      const nextPlan = getNextPlanWithHigherUpload(plan);
      const hint = nextPlan
        ? ` Upgrade to ${getPlanLimits(nextPlan).label} for ${formatFileSize(getMaxUploadSizeBytes(nextPlan))}.`
        : "";
      return NextResponse.json(
        {
          error: `File is ${formatFileSize(file.size)}. Your plan allows up to ${formatFileSize(maxBytes)} per video.${hint}`,
        },
        { status: 400 },
      );
    }

    // Check file type
    const allowedTypes = [
      "video/mp4",
      "video/quicktime", // .mov
      "video/x-msvideo", // .avi
      "video/x-matroska", // .mkv
      "video/webm", // .webm
      "video/x-m4v", // .m4v
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Supported: MP4, MOV, AVI, MKV, WebM, M4V." },
        { status: 400 },
      );
    }

    const priority = userWithPlan ? getPlanLimits(userWithPlan.plan).jobPriority : 1;

    // Check concurrent job limit before saving file
    const activeJobs = await prisma.job.count({
      where: {
        video: { userId: user.id },
        status: { in: [JobStatus.QUEUED, JobStatus.RUNNING] },
      },
    });
    if (activeJobs >= MAX_ACTIVE_JOBS_PER_USER) {
      return NextResponse.json(
        { error: `You have ${activeJobs} jobs in progress. Please wait for some to finish before uploading more.` },
        { status: 429 },
      );
    }

    // Fast path: save to pending storage only; worker will do ffmpeg + finalize
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const result = await savePendingUpload({
      title: validation.data.title,
      originalFileName: file.name,
      fileBuffer: buffer,
      userId: user.id,
    });

    // Create Job row with same id as BullMQ job id later
    const dbJob = await prisma.job.create({
      data: {
        type: JobType.TRANSCRIBE,
        status: JobStatus.QUEUED,
        videoId: result.videoId,
        progress: 0,
        maxRetries: 3,
      },
    });

    // Add to queue; pass DB job id and priority (higher = faster processing)
    const { videoQueue } = await import("@/lib/queue");
    const bullJob = await videoQueue.add(
      "transcribe",
      { type: JobType.TRANSCRIBE, videoId: result.videoId },
      { jobId: dbJob.id, priority },
    );

    return NextResponse.json({
      success: true,
      video: {
        id: result.videoId,
        title: validation.data.title,
        url: result.url,
        thumbnailUrl: result.thumbnailUrl,
        metadata: result.metadata,
      },
    });
  } catch (error) {
    const err = error as Error;
    console.error("[API] Upload error:", error);
    return NextResponse.json(
      { error: getSafeApiErrorMessage(err) },
      { status: err?.message === "Unauthorized" ? 401 : 500 },
    );
  }
}

export async function GET() {
  const storageType = process.env.STORAGE_TYPE || "local";
  let maxFileSize = getMaxUploadSizeBytes("FREE");
  let videosUsed = 0;
  let videosMax = 1;
  let planLabel = "Free";
  try {
    const session = await getSession();
    if (session?.user?.id) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { plan: true, totalVideosUploaded: true, billingInterval: true },
      });
      if (user) {
        const plan = (user.plan ?? "FREE") as "FREE" | "STARTER" | "PRO";
        maxFileSize = getMaxUploadSizeBytes(plan);
        videosUsed = user.totalVideosUploaded;
        videosMax = getMaxVideosForCycle(plan, (user.billingInterval as "monthly" | "yearly" | null) ?? null);
        planLabel = getPlanLimits(plan).label;
      }
    }
  } catch {
    // Fallback to FREE limit
  }
  return NextResponse.json({
    uploadStrategy: storageType === "s3" ? "presigned" : "direct",
    maxFileSize,
    maxFileSizeLabel: formatFileSize(maxFileSize),
    videosUsed,
    videosMax,
    planLabel,
    allowedTypes: [
      "video/mp4",
      "video/quicktime",
      "video/x-msvideo",
      "video/x-matroska",
      "video/webm",
      "video/x-m4v",
    ],
    allowedExtensions: [".mp4", ".mov", ".avi", ".mkv", ".webm", ".m4v"],
  });
}
