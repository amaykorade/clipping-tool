import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, canAccessVideo } from "@/lib/auth";
import { getStorage } from "@/lib/storage";

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

/** Sanitize for use in filename: keep alphanumeric, spaces, hyphens, underscores. */
function sanitizeFilename(name: string, maxLength = 80): string {
  const sanitized = name.replace(/[^\w\s-]/g, " ").replace(/\s+/g, " ").trim();
  return sanitized.slice(0, maxLength) || "clip";
}

/**
 * GET /api/clips/[id]/download
 * Streams the rendered clip file with Content-Disposition: attachment so the browser downloads it.
 */
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const session = await getSession();

  const clip = await prisma.clip.findUnique({
    where: { id },
    include: { video: { select: { userId: true } } },
  });

  if (!clip || !clip.video) {
    return NextResponse.json({ error: "Clip not found" }, { status: 404 });
  }
  if (!canAccessVideo(clip.video, session)) {
    return NextResponse.json({ error: "Clip not found" }, { status: 404 });
  }

  if (!clip.outputUrl) {
    return NextResponse.json(
      { error: "Clip not rendered yet" },
      { status: 404 },
    );
  }

  const storageKey = extractStorageKeyFromUrl(clip.outputUrl);
  if (!storageKey) {
    return NextResponse.json(
      { error: "Invalid clip file" },
      { status: 500 },
    );
  }

  const storage = getStorage();
  let buffer: Buffer;
  try {
    buffer = await storage.download(storageKey);
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const filename = `${sanitizeFilename(clip.title)}.mp4`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "video/mp4",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.length),
    },
  });
}
