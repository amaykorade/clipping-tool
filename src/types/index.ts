import {
  Video,
  Clip,
  Job,
  VideoStatus,
  ClipStatus,
  AspectRatio,
} from "../generated/prisma";

// Re-export both the types and runtime enum values from the generated client.
export { Video, Clip, Job, VideoStatus, ClipStatus, AspectRatio };

export interface VideoWithClips extends Video {
  clips: Clip[];
  _count: {
    clips: number;
  };
}

export interface JobWithVideo extends Job {
  video: Video | null;
}

export interface UploadVideoRequest {
  title: string;
  file?: File;
  youtubeUrl?: string;
}

export interface UploadVideoResponse {
  video: Video;
  jobId: string;
}

export interface GenerateClipsResponse {
  clips: Clip[];
  jobId: string;
}

export interface TranscriptWord {
  text: string;
  start: number;
  end: number;
  confidence: number;
  /** Speaker label from provider (e.g. AssemblyAI when speaker_labels: true). */
  speaker?: string;
}

export interface Transcript {
  words: TranscriptWord[];
  sentences: {
    text: string;
    start: number;
    end: number;
  }[];
  /**
   * Gap in seconds before each sentence (pause after previous sentence).
   * sentenceGaps[0] = 0; sentenceGaps[i] = sentences[i].start - sentences[i-1].end.
   * Used as a signal for "boundary between ideas" (e.g. long pause > 1.5s).
   */
  sentenceGaps?: number[];
}

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  fps: number;
  bitrate: number;
  codec: string;
}

export interface ClipSuggestion {
  startTime: number;
  endTime: number;
  title: string;
  keywords: string[];
  confidence: number;
  reason: string; // Why this clip is good
}
