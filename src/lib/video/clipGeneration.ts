import { prisma } from "@/lib/db";
import { segmentTranscript } from "@/lib/ai/clipSegmentation";
import { scoreAndTitleSegments } from "@/lib/ai/clipScoring";
import { Clip, VideoStatus, ClipStatus } from "@/types";

export async function generateClipsForVideo(videoId: string): Promise<Clip[]> {
  const video = await prisma.video.findUnique({
    where: { id: videoId },
  });

  if (!video) throw new Error("Video not found");
  if (!video.transcript) throw new Error("Video has no transcript yet");

  const transcript = video.transcript as any;

  // Step 1: Segment
  const segments = segmentTranscript(transcript);

  if (!segments.length) {
    throw new Error("No suitable segments found");
  }

  // Step 2: Score + title
  const suggestions = await scoreAndTitleSegments(
    segments.map((s) => ({
      start: s.start,
      end: s.end,
      text: s.text,
    })),
    { maxClips: 10 },
  );

  if (!suggestions.length) {
    throw new Error("No clip suggestions returned");
  }

  // Step 3: Persist as Clip rows
  const createdClips: Clip[] = [];

  for (const s of suggestions) {
    const duration = s.endTime - s.startTime;

    const clip = await prisma.clip.create({
      data: {
        videoId: video.id,
        title: s.title,
        startTime: s.startTime,
        endTime: s.endTime,
        duration,
        confidence: s.confidence,
        keywords: s.keywords,
        // default config for now
        aspectRatio: "VERTICAL",
        status: ClipStatus.PENDING,
      },
    });

    createdClips.push(clip);
  }

  // Mark video as ANALYZING or READY based on your pipeline
  await prisma.video.update({
    where: { id: video.id },
    data: { status: VideoStatus.ANALYZING },
  });

  return createdClips;
}
