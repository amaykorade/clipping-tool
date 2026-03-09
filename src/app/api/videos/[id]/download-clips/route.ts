import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, canAccessVideo } from "@/lib/auth";
import { getStorage } from "@/lib/storage";
import archiver from "archiver";
import { PassThrough } from "stream";

function extractStorageKeyFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const prefix = "/upload/";
    const idx = u.pathname.indexOf(prefix);
    if (idx === -1) return u.pathname.replace(/^\//, "");
    return u.pathname.slice(idx + prefix.length);
  } catch {
    return null;
  }
}

function sanitizeFilename(name: string, maxLength = 60): string {
  return name.replace(/[^\w\s-]/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength) || "clip";
}

/**
 * GET /api/videos/[id]/download-clips
 * Downloads all completed clips as a ZIP file.
 */
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const session = await getSession();

  const video = await prisma.video.findUnique({
    where: { id },
    select: {
      title: true,
      userId: true,
      clips: {
        where: { status: "COMPLETED", outputUrl: { not: null } },
        select: { id: true, title: true, outputUrl: true },
      },
    },
  });

  if (!video) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }
  if (!canAccessVideo(video, session)) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  const clips = video.clips.filter((c) => c.outputUrl);
  if (clips.length === 0) {
    return NextResponse.json({ error: "No rendered clips to download" }, { status: 404 });
  }

  const storage = getStorage();
  const passThrough = new PassThrough();
  const archive = archiver("zip", { zlib: { level: 1 } }); // fast compression for video

  archive.pipe(passThrough);

  // Add each clip to the ZIP
  const usedNames = new Set<string>();
  for (const clip of clips) {
    const key = extractStorageKeyFromUrl(clip.outputUrl!);
    if (!key) continue;

    try {
      const buffer = await storage.download(key);
      let filename = `${sanitizeFilename(clip.title)}.mp4`;
      // Deduplicate filenames
      if (usedNames.has(filename)) {
        filename = `${sanitizeFilename(clip.title)}-${clip.id.slice(0, 6)}.mp4`;
      }
      usedNames.add(filename);
      archive.append(buffer, { name: filename });
    } catch (e) {
      console.warn(`[Download] Failed to add clip ${clip.id} to ZIP:`, e);
    }
  }

  archive.finalize();

  const videoTitle = sanitizeFilename(video.title);

  // Convert Node stream to Web ReadableStream
  const webStream = new ReadableStream({
    start(controller) {
      passThrough.on("data", (chunk) => controller.enqueue(chunk));
      passThrough.on("end", () => controller.close());
      passThrough.on("error", (err) => controller.error(err));
    },
  });

  return new NextResponse(webStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${videoTitle}-clips.zip"`,
    },
  });
}
