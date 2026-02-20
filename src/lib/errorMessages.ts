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
  // No audio in video
  {
    test: (m) =>
      /does not appear to contain audio|no audio|no speech|empty audio/i.test(m),
    result: {
      title: "No audio detected",
      message: "This video has no detectable speech or audio. Our transcription needs spoken content to generate clips.",
      action: "Upload a video with clear speech, or check that the audio track isn’t muted.",
    },
  },
  // AssemblyAI / transcription API
  {
    test: (m) => /assemblyai|assembly ai|transcription.*(?:failed|error)/i.test(m),
    result: {
      title: "Transcription service error",
      message: "We couldn’t process your video with our transcription service.",
      action: "Try again in a few minutes. If it keeps failing, contact support.",
    },
  },
  {
    test: (m) => /rate limit|429|too many requests|quota/i.test(m),
    result: {
      title: "Too many requests",
      message: "We’re getting a lot of traffic right now.",
      action: "Wait a few minutes and try again.",
    },
  },
  {
    test: (m) => /unauthorized|401|invalid.*api.*key|authentication/i.test(m),
    result: {
      title: "Service configuration error",
      message: "Our transcription service isn’t configured correctly.",
      action: "Please contact support — we’ll fix this soon.",
    },
  },
  // Storage / S3
  {
    test: (m) =>
      /s3|storage|download|file not found|no such key|access denied|ENOENT/i.test(m),
    result: {
      title: "Couldn’t access your video",
      message: "We couldn’t read the video file from storage.",
      action: "Try deleting this video and uploading it again.",
    },
  },
  // FFmpeg / video format
  {
    test: (m) =>
      /ffmpeg|invalid data|codec|format.*not supported|unsupported format/i.test(m),
    result: {
      title: "Video format issue",
      message: "This video file may be corrupted or in an unsupported format.",
      action: "Re-export your video as MP4 and upload again.",
    },
  },
  // Redis / queue
  {
    test: (m) => /redis|ECONNRESET|ECONNREFUSED|connection.*refused/i.test(m),
    result: {
      title: "Service temporarily unavailable",
      message: "Our processing queue isn’t responding.",
      action: "Try again in a few minutes.",
    },
  },
  // Database
  {
    test: (m) => /prisma|database|connection.*timeout|pg_/i.test(m),
    result: {
      title: "Database error",
      message: "We couldn’t save or load your video data.",
      action: "Try again in a few minutes. If it persists, contact support.",
    },
  },
  // Video not found
  {
    test: (m) => /video.*not found|Video.*not found/i.test(m),
    result: {
      title: "Video not found",
      message: "This video may have been deleted or moved.",
      action: "Go back to your videos and try uploading again.",
    },
  },
  // Generic timeout
  {
    test: (m) => /timeout|timed out/i.test(m),
    result: {
      title: "Processing took too long",
      message: "The video took longer than expected to process.",
      action: "Try again. For very long videos, consider splitting them first.",
    },
  },
];

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

  // Unknown error — still show a clear message, optionally with a sanitized hint
  const sanitized = msg.length > 120 ? msg.slice(0, 120) + "…" : msg;
  return {
    title: "Processing failed",
    message: "We ran into an issue while transcribing your video.",
    action: `Try uploading again. If it keeps failing, contact support and mention: "${sanitized}"`,
  };
}
