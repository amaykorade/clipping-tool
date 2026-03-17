import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, canAccessVideo } from "@/lib/auth";
import { getStorage } from "@/lib/storage";
import { getSafeApiErrorMessage } from "@/lib/errorMessages";

interface TranscriptWord {
  text: string;
  start: number;
  end: number;
  confidence: number;
  speaker: string | null;
}

interface Transcript {
  words: TranscriptWord[];
  sentences: { text: string; start: number; end: number }[];
}

/**
 * GET /api/clips/[id]/editor-data
 * Returns all data the clip editor UI needs: clip info, video source URL,
 * and transcript words for the clip's time range with padding.
 */
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const session = await getSession();

  try {
    const clip = await prisma.clip.findUnique({
      where: { id },
      include: {
        video: {
          select: {
            id: true,
            userId: true,
            storageKey: true,
            duration: true,
            transcript: true,
          },
        },
      },
    });

    if (!clip || !clip.video) {
      return NextResponse.json({ error: "Clip not found" }, { status: 404 });
    }
    if (!canAccessVideo(clip.video, session)) {
      return NextResponse.json({ error: "Clip not found" }, { status: 404 });
    }

    const video = clip.video;
    const storage = getStorage();
    const storageUrl = video.storageKey ? storage.getUrl(video.storageKey) : null;

    // Extract words for the clip's time range with +-10s padding
    const PADDING_SECONDS = 10;
    const paddingStart = Math.max(0, clip.startTime - PADDING_SECONDS);
    const paddingEnd = Math.min(
      video.duration ?? clip.endTime + PADDING_SECONDS,
      clip.endTime + PADDING_SECONDS,
    );

    let words: TranscriptWord[] = [];
    if (video.transcript) {
      const transcript = video.transcript as unknown as Transcript;
      if (transcript.words && Array.isArray(transcript.words)) {
        words = transcript.words.filter(
          (w) => w.end >= paddingStart && w.start <= paddingEnd,
        );
      }
    }

    return NextResponse.json({
      clip: {
        id: clip.id,
        title: clip.title,
        startTime: clip.startTime,
        endTime: clip.endTime,
        editedStartTime: clip.editedStartTime,
        editedEndTime: clip.editedEndTime,
        captionStyle: clip.captionStyle,
        captionEdits: clip.captionEdits,
        captionPositionX: clip.captionPositionX,
        captionPositionY: clip.captionPositionY,
        captionScale: clip.captionScale,
        captionColor: clip.captionColor,
        aspectRatio: clip.aspectRatio,
        cropMode: clip.cropMode,
        confidence: clip.confidence,
        status: clip.status,
        outputUrl: clip.outputUrl,
      },
      video: {
        id: video.id,
        duration: video.duration,
        storageUrl,
      },
      words,
      paddingStart,
      paddingEnd,
    });
  } catch (error) {
    console.error("[API] Editor data error:", error);
    return NextResponse.json(
      { error: getSafeApiErrorMessage(error as Error) },
      { status: 500 },
    );
  }
}
