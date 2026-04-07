/**
 * Converts technical worker/API errors into clear, actionable messages for users.
 */

export interface UserFriendlyError {
  title: string;
  message: string;
  action: string;
}

const ERROR_PATTERNS: Array<{
  test: RegExp | ((msg: string) => boolean);
  result: UserFriendlyError;
}> = [
  // Video resolution too low
  {
    test: (m) => /resolution too low/i.test(m),
    result: {
      title: "Video quality too low",
      message: "Your video resolution is below the minimum we need to generate clips.",
      action: "Re-export your video at 480p or higher and upload again.",
    },
  },
  // Video too short
  {
    test: (m) => /too short/i.test(m),
    result: {
      title: "Video is too short",
      message: "We need at least a few seconds of content to find clip-worthy moments.",
      action: "Upload a longer video — ideally 2 minutes or more for the best clips.",
    },
  },
  // Video too long
  {
    test: (m) => /too long.*maximum/i.test(m),
    result: {
      title: "Video is too long",
      message: "Your video exceeds the maximum length we can process right now.",
      action: "Trim your video to under 1 hour, or split it into parts and upload each one.",
    },
  },
  // No audio in video
  {
    test: (m) =>
      /does not appear to contain audio|no audio|no speech|empty audio|must have audio/i.test(m),
    result: {
      title: "No audio detected",
      message: "We couldn’t find any speech in your video. We need spoken content to generate clips.",
      action: "Make sure your video has an audio track that isn’t muted, then upload again.",
    },
  },
  // AssemblyAI / transcription API
  {
    test: (m) => /assemblyai|assembly ai|transcription.*(?:failed|error)/i.test(m),
    result: {
      title: "Transcription service error",
      message: "Our speech-to-text service had trouble processing your video.",
      action: "Try again in a few minutes. If it keeps failing, the audio might be unclear — try a video with clearer speech.",
    },
  },
  // OpenAI / clip generation
  {
    test: (m) => /openai|gpt|clip.*scor|clip.*generat/i.test(m),
    result: {
      title: "Clip generation error",
      message: "Our AI had trouble analyzing your video for clip-worthy moments.",
      action: "Try generating clips again. If it keeps failing, contact support.",
    },
  },
  {
    test: (m) => /rate limit|429|too many requests|quota/i.test(m),
    result: {
      title: "Too many requests",
      message: "You’re sending requests too quickly.",
      action: "Wait a couple of minutes and try again.",
    },
  },
  {
    test: (m) => /unauthorized|401|invalid.*api.*key|authentication/i.test(m),
    result: {
      title: "Service configuration error",
      message: "Something is wrong on our end.",
      action: "Please contact support — we’ll fix this as soon as possible.",
    },
  },
  // Storage / S3
  {
    test: (m) =>
      /s3|storage|download.*fail|file not found|no such key|access denied|ENOENT/i.test(m),
    result: {
      title: "Couldn’t access your video",
      message: "We had trouble reading your video file.",
      action: "Try deleting this video and uploading it again.",
    },
  },
  // FFmpeg / video format
  {
    test: (m) =>
      /ffmpeg|invalid data|codec|format.*not supported|unsupported format/i.test(m),
    result: {
      title: "Unsupported video format",
      message: "We couldn’t read your video file. It might be in an unsupported format or corrupted.",
      action: "Re-export your video as MP4 (H.264) and upload again. Most video editors support this.",
    },
  },
  // Redis / queue
  {
    test: (m) => /redis|ECONNRESET|ECONNREFUSED|connection.*refused|max requests limit exceeded|max_requests_limit|upstash/i.test(m),
    result: {
      title: "Service temporarily unavailable",
      message: "Our servers are having a brief hiccup.",
      action: "Try again in a few minutes. Your video is safe.",
    },
  },
  // Database
  {
    test: (m) => /prisma|database|connection.*timeout|pg_/i.test(m),
    result: {
      title: "Temporary server issue",
      message: "We’re having trouble saving your data. Your video is safe.",
      action: "Try again in a few minutes. If it keeps happening, contact support.",
    },
  },
  // Video not found
  {
    test: (m) => /video.*not found|Video.*not found/i.test(m),
    result: {
      title: "Video not found",
      message: "This video may have been deleted or the link is no longer valid.",
      action: "Go back to your videos page and try again.",
    },
  },
  // Generic timeout
  {
    test: (m) => /timeout|timed out/i.test(m),
    result: {
      title: "Processing took too long",
      message: "Your video took longer than expected to process.",
      action: "Try again — if your video is very long, consider trimming it to under 30 minutes for best results.",
    },
  },
  // Clip rendering
  {
    test: (m) => /render.*fail|rendering.*error|Compression failed/i.test(m),
    result: {
      title: "Clip rendering failed",
      message: "We had trouble creating the video file for your clip.",
      action: "Try rendering again. If it keeps failing, try a different aspect ratio or format.",
    },
  },
];

/**
 * Returns a short message safe to return in API responses (e.g. upload, queue).
 * Never exposes internal errors (Redis, Upstash, etc.) to the client.
 */
export function getSafeApiErrorMessage(err: Error | null | undefined): string {
  const msg = (err?.message ?? "").trim();
  if (!msg) return "Something went wrong. Please try again.";
  if (/redis|ECONNRESET|ECONNREFUSED|connection.*refused|max requests limit exceeded|max_requests_limit|upstash/i.test(msg)) {
    return "Our processing queue isn't responding. Please try again in a few minutes.";
  }
  if (/prisma|database|connection.*timeout|pg_/i.test(msg)) {
    return "We couldn't save that. Please try again in a few minutes.";
  }
  if (err?.message === "Unauthorized") return "Please sign in.";
  return "Something went wrong. Please try again.";
}

/**
 * Returns a user-friendly error for display. Falls back to a generic message
 * if the error doesn't match any known pattern.
 */
export function toUserFriendlyError(rawError: string | null | undefined): UserFriendlyError {
  const msg = (rawError ?? "").trim();
  if (!msg) {
    return {
      title: "Processing failed",
      message: "Something went wrong while processing your video.",
      action: "Try deleting this video and uploading it again. If the problem continues, contact support.",
    };
  }

  for (const { test, result } of ERROR_PATTERNS) {
    const matches = typeof test === "function" ? test(msg) : test.test(msg);
    if (matches) return result;
  }

  // Unknown error — still show a clear message without leaking internal details
  return {
    title: "Processing failed",
    message: "We ran into an issue while transcribing your video.",
    action: "Try uploading again. If it keeps failing, contact support.",
  };
}
