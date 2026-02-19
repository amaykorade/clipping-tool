import { JobStatus, JobType } from "@/generated/prisma";
import { prisma } from "@/lib/db";
import { savePendingUpload } from "@/lib/video/upload";
import { requireAuth } from "@/lib/auth";
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

    // Check file size (500MB limit)
    const MAX_FILE_SIZE = 500 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large (maximum 500MB)" },
        { status: 400 },
      );
    }

    // Check file type
    const allowedTypes = [
      "video/mp4",
      "video/quicktime", // .mov
      "video/x-msvideo", // .avi
      "video/x-matroska", // .mkv
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type (must be MP4, MOV, AVI, or MKV)" },
        { status: 400 },
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

    const userWithPlan = await prisma.user.findUnique({
      where: { id: user.id },
      select: { plan: true },
    });
    const { getPlanLimits } = await import("@/lib/plans");
    const priority = userWithPlan ? getPlanLimits(userWithPlan.plan).jobPriority : 1;

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
    if (err.message === "Unauthorized") {
      return NextResponse.json({ error: "Please sign in to upload" }, { status: 401 });
    }
    console.error("[API] Upload error:", error);
    return NextResponse.json(
      { error: err.message || "Upload failed" },
      { status: 500 },
    );
  }
}

export async function GET() {
  const storageType = process.env.STORAGE_TYPE || "local";
  return NextResponse.json({
    uploadStrategy: storageType === "s3" ? "presigned" : "direct",
    maxFileSize: 500 * 1024 * 1024, // 500MB
    allowedTypes: [
      "video/mp4",
      "video/quicktime",
      "video/x-msvideo",
      "video/x-matroska",
    ],
    allowedExtensions: [".mp4", ".mov", ".avi", ".mkv"],
  });
}
