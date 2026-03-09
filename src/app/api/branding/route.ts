import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { getStorage } from "@/lib/storage";

const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_WATERMARK_SIZE = 2 * 1024 * 1024; // 2MB

/** GET /api/branding — get current watermark settings */
export async function GET() {
  const sessionUser = await requireAuth();
  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { plan: true, watermarkKey: true, watermarkPosition: true, watermarkOpacity: true },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let watermarkUrl: string | null = null;
  if (user.watermarkKey) {
    const storage = getStorage();
    watermarkUrl = storage.getUrl(user.watermarkKey);
  }

  return NextResponse.json({
    watermarkUrl,
    watermarkPosition: user.watermarkPosition ?? "bottom-right",
    watermarkOpacity: user.watermarkOpacity ?? 0.6,
    canCustomize: user.plan === "PRO",
  });
}

/** POST /api/branding — upload watermark image (PRO only) */
export async function POST(req: NextRequest) {
  const sessionUser = await requireAuth();
  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { plan: true, watermarkKey: true },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (user.plan !== "PRO") {
    return NextResponse.json({ error: "Custom branding is a PRO feature" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("watermark") as File | null;
  const position = formData.get("position") as string | null;
  const opacity = formData.get("opacity") as string | null;

  // Update position/opacity even without a new file
  const updateData: Record<string, unknown> = {};
  if (position && ["bottom-right", "bottom-left", "top-right", "top-left"].includes(position)) {
    updateData.watermarkPosition = position;
  }
  if (opacity != null) {
    const val = parseFloat(opacity);
    if (!isNaN(val) && val >= 0 && val <= 1) {
      updateData.watermarkOpacity = val;
    }
  }

  if (file) {
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Only PNG, JPEG, and WebP images allowed" }, { status: 400 });
    }
    if (file.size > MAX_WATERMARK_SIZE) {
      return NextResponse.json({ error: "Watermark must be under 2MB" }, { status: 400 });
    }

    const storage = getStorage();
    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const key = `branding/${sessionUser.id}/watermark.${ext}`;

    // Delete old watermark if exists
    if (user.watermarkKey) {
      await storage.delete(user.watermarkKey).catch(() => {});
    }

    await storage.upload(buffer, key, { contentType: file.type });
    updateData.watermarkKey = key;
  }

  if (Object.keys(updateData).length > 0) {
    await prisma.user.update({
      where: { id: sessionUser.id },
      data: updateData,
    });
  }

  return NextResponse.json({ success: true });
}

/** DELETE /api/branding — remove custom watermark */
export async function DELETE() {
  const sessionUser = await requireAuth();
  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { watermarkKey: true },
  });

  if (user?.watermarkKey) {
    const storage = getStorage();
    await storage.delete(user.watermarkKey).catch(() => {});
    await prisma.user.update({
      where: { id: sessionUser.id },
      data: { watermarkKey: null },
    });
  }

  return NextResponse.json({ success: true });
}
