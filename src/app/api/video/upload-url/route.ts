import { requireAuth } from "@/lib/auth";
import { createPendingUploadForDirectUpload } from "@/lib/video/upload";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const UploadUrlSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  filename: z.string().min(1, "Filename is required"),
  fileSize: z.number().int().positive().max(500 * 1024 * 1024),
  contentType: z.string().min(1),
});

const ALLOWED_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-matroska",
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
    const body = await request.json();
    const parsed = UploadUrlSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.message },
        { status: 400 },
      );
    }
    const { title, filename, fileSize, contentType } = parsed.data;

    if (!ALLOWED_TYPES.includes(contentType)) {
      return NextResponse.json(
        { error: "Invalid file type (must be MP4, MOV, AVI, or MKV)" },
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
