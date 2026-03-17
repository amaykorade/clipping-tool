import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, canAccessVideo } from "@/lib/auth";
import { getSafeApiErrorMessage } from "@/lib/errorMessages";
import { z } from "zod";

const editSchema = z
  .object({
    editedStartTime: z.number().min(0).optional(),
    editedEndTime: z.number().min(0).optional(),
    captionStyle: z
      .enum(["none", "modern", "bold", "minimal", "karaoke", "outline"])
      .optional(),
    captionEdits: z.record(z.string(), z.string()).optional(),
    captionPositionX: z.number().min(0).max(100).optional(),
    captionPositionY: z.number().min(0).max(100).optional(),
    captionScale: z.number().min(0.5).max(2.0).optional(),
    captionColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    aspectRatio: z.enum(["VERTICAL", "SQUARE", "LANDSCAPE"]).optional(),
    cropMode: z.enum(["FILL", "FIT"]).optional(),
  })
  .refine(
    (data) => {
      if (
        data.editedStartTime !== undefined &&
        data.editedEndTime !== undefined
      ) {
        return data.editedEndTime > data.editedStartTime;
      }
      return true;
    },
    { message: "editedEndTime must be greater than editedStartTime" },
  );

/**
 * PUT /api/clips/[id]/edit
 * Saves editor changes to a clip (trim points, captions, style) without re-rendering.
 */
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const session = await getSession();

  try {
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

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 },
      );
    }

    const parsed = editSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Invalid input";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const data = parsed.data;

    // If only one of the edited times is provided, validate against the existing/original value
    if (data.editedStartTime !== undefined && data.editedEndTime === undefined) {
      const effectiveEnd = clip.editedEndTime ?? clip.endTime;
      if (data.editedStartTime >= effectiveEnd) {
        return NextResponse.json(
          { error: "editedStartTime must be less than the clip end time" },
          { status: 400 },
        );
      }
    }
    if (data.editedEndTime !== undefined && data.editedStartTime === undefined) {
      const effectiveStart = clip.editedStartTime ?? clip.startTime;
      if (data.editedEndTime <= effectiveStart) {
        return NextResponse.json(
          { error: "editedEndTime must be greater than the clip start time" },
          { status: 400 },
        );
      }
    }

    const updated = await prisma.clip.update({
      where: { id },
      data: {
        ...(data.editedStartTime !== undefined && {
          editedStartTime: data.editedStartTime,
        }),
        ...(data.editedEndTime !== undefined && {
          editedEndTime: data.editedEndTime,
        }),
        ...(data.captionStyle !== undefined && {
          captionStyle: data.captionStyle,
        }),
        ...(data.captionEdits !== undefined && {
          captionEdits: data.captionEdits,
        }),
        ...(data.captionPositionX !== undefined && {
          captionPositionX: data.captionPositionX,
        }),
        ...(data.captionPositionY !== undefined && {
          captionPositionY: data.captionPositionY,
        }),
        ...(data.captionScale !== undefined && {
          captionScale: data.captionScale,
        }),
        ...(data.captionColor !== undefined && {
          captionColor: data.captionColor,
        }),
        ...(data.aspectRatio !== undefined && {
          aspectRatio: data.aspectRatio,
        }),
        ...(data.cropMode !== undefined && {
          cropMode: data.cropMode,
        }),
      },
      select: {
        id: true,
        title: true,
        startTime: true,
        endTime: true,
        editedStartTime: true,
        editedEndTime: true,
        captionStyle: true,
        captionEdits: true,
        captionPositionX: true,
        captionPositionY: true,
        captionScale: true,
        captionColor: true,
        aspectRatio: true,
        cropMode: true,
        confidence: true,
        status: true,
      },
    });

    return NextResponse.json({ success: true, clip: updated });
  } catch (error) {
    console.error("[API] Edit clip error:", error);
    return NextResponse.json(
      { error: getSafeApiErrorMessage(error as Error) },
      { status: 500 },
    );
  }
}
