import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, canAccessVideo } from "@/lib/auth";
import { segmentTranscript } from "@/lib/ai/clipSegmentation";
import type { Transcript } from "@/types";

/** Format seconds as SRT timestamp: HH:MM:SS,mmm */
function toSrtTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.round((sec % 1) * 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
}

/** Format seconds as VTT timestamp: HH:MM:SS.mmm */
function toVttTime(sec: number): string {
  return toSrtTime(sec).replace(",", ".");
}

type TimedEntry = { text: string; start: number; end: number };

function buildSrt(entries: TimedEntry[]): string {
  return entries
    .map((e, i) => `${i + 1}\n${toSrtTime(e.start)} --> ${toSrtTime(e.end)}\n${e.text}`)
    .join("\n\n");
}

function buildVtt(entries: TimedEntry[]): string {
  const cues = entries
    .map((e) => `${toVttTime(e.start)} --> ${toVttTime(e.end)}\n${e.text}`)
    .join("\n\n");
  return `WEBVTT\n\n${cues}`;
}

function buildTxt(entries: TimedEntry[]): string {
  return entries.map((e) => e.text).join("\n");
}

/** YouTube-style chapter timestamps: 00:00 Title */
function buildChapters(segments: TimedEntry[]): string {
  return segments
    .map((s) => {
      const sec = Math.floor(s.start);
      const m = Math.floor(sec / 60);
      const ss = sec % 60;
      const ts = sec >= 3600
        ? `${Math.floor(sec / 3600)}:${String(m % 60).padStart(2, "0")}:${String(ss).padStart(2, "0")}`
        : `${m}:${String(ss).padStart(2, "0")}`;
      // First ~60 chars of text as chapter title
      const title = s.text.replace(/\n/g, " ").slice(0, 60).trim();
      return `${ts} ${title}`;
    })
    .join("\n");
}

/**
 * GET /api/videos/[id]/transcript
 * Returns the stored transcript and the segments we use for clip generation,
 * so you can see exactly what we're feeding to the model.
 */
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const session = await getSession();
  const video = await prisma.video.findUnique({
    where: { id },
    select: { transcript: true, status: true, userId: true },
  });
  if (!video) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }
  if (!canAccessVideo(video, session)) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }
  const transcript = video.transcript as Transcript | null;
  if (!transcript) {
    return NextResponse.json({
      transcript: { words: [], sentences: [] },
      segments: [],
    });
  }

  // Segments we actually use for clip generation (sentence-boundary segmentation)
  let segments: { start: number; end: number; text: string }[] = [];
  try {
    const segs = segmentTranscript(transcript, {
      minDurationSec: 20,
      maxDurationSec: 90,
      maxGapSec: 2,
    });
    segments = segs.map((s) => ({ start: s.start, end: s.end, text: s.text }));
  } catch (e) {
    console.warn("[transcript API] segmentTranscript failed:", e);
  }

  const t = transcript as {
    words?: { text: string; start: number; end: number; speaker?: string }[];
    sentences?: { text: string; start: number; end: number }[];
  };

  // Extract unique speakers from word-level labels
  const speakerSet = new Set<string>();
  if (t.words) {
    for (const w of t.words) {
      if (w.speaker) speakerSet.add(w.speaker);
    }
  }
  const speakers = [...speakerSet].sort();

  // Export format: ?format=srt|vtt|txt|chapters
  const format = _req.nextUrl.searchParams.get("format");
  if (format && ["srt", "vtt", "txt", "chapters"].includes(format)) {
    if (format === "chapters") {
      if (segments.length === 0) {
        return NextResponse.json({ error: "No segments available" }, { status: 404 });
      }
      const body = buildChapters(segments);
      return new NextResponse(body, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Content-Disposition": `attachment; filename="chapters.txt"`,
        },
      });
    }

    const entries = (t.sentences?.length ? t.sentences : t.words) ?? [];
    if (entries.length === 0) {
      return NextResponse.json({ error: "No transcript data" }, { status: 404 });
    }

    let body: string;
    let contentType: string;
    let ext: string;

    switch (format) {
      case "srt":
        body = buildSrt(entries);
        contentType = "application/x-subrip";
        ext = "srt";
        break;
      case "vtt":
        body = buildVtt(entries);
        contentType = "text/vtt";
        ext = "vtt";
        break;
      default:
        body = buildTxt(entries);
        contentType = "text/plain";
        ext = "txt";
        break;
    }

    return new NextResponse(body, {
      headers: {
        "Content-Type": `${contentType}; charset=utf-8`,
        "Content-Disposition": `attachment; filename="transcript.${ext}"`,
      },
    });
  }

  return NextResponse.json({
    transcript: {
      words: t.words ?? [],
      sentences: t.sentences ?? [],
    },
    segments,
    speakers,
  });
}
