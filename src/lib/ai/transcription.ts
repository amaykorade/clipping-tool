import { Transcript, TranscriptWord } from "assemblyai";
import axios from "axios";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const ASSEMBLY_API_URL = "https://api.assemblyai.com/v2";
const API_KEY = process.env.ASSEMBLYAI_API_KEY!;

if (!API_KEY) {
  console.warn("[Transcription] ASSEMBLYAI_API_KEY not set");
}

export interface TranscriptionJob {
  id: string;
  status: "queued" | "processing" | "completed" | "error";
}

export interface LocalTranscript {
  words: TranscriptWord[];
  sentences: { text: string; start: number; end: number }[];
  /** Gap in seconds before each sentence; sentenceGaps[0] = 0. */
  sentenceGaps?: number[];
}

export interface ProcessedSentence {
  text: string;
  start: number;
  end: number;
}

// Upload local file data directly to AssemblyAI and start a transcription.
export async function startTranscriptionFromBuffer(
  fileData: Buffer,
): Promise<TranscriptionJob> {
  // 1) Upload binary data to AssemblyAI
  const uploadRes = await axios.post(
    `${ASSEMBLY_API_URL}/upload`,
    fileData,
    {
      headers: {
        authorization: API_KEY,
        "content-type": "application/octet-stream",
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    },
  );

  const uploadUrl: string = uploadRes.data.upload_url;

  // 2) Start a transcript using the uploaded URL
  const res = await axios.post(
    `${ASSEMBLY_API_URL}/transcript`,
    {
      audio_url: uploadUrl,
      speaker_labels: true,
      punctuate: true,
      format_text: true,
    },
    { headers: { authorization: API_KEY } },
  );

  return { id: res.data.id, status: res.data.status };
}

/**
 * Fallback: extract audio to a plain WAV file using ffmpeg, then upload that.
 * This helps when the provider says "file does not appear to contain audio"
 * for some video containers/codecs.
 */
export async function extractAudioAndStartTranscription(
  fileData: Buffer,
): Promise<TranscriptionJob> {
  const id = uuidv4();
  const inputPath = path.join("/tmp", `transcribe-src-${id}.mp4`);
  const outputPath = path.join("/tmp", `transcribe-audio-${id}.wav`);

  await fs.writeFile(inputPath, fileData);

  await new Promise<void>((resolve, reject) => {
    ffmpeg(inputPath)
      .noVideo()
      .audioCodec("pcm_s16le")
      .format("wav")
      .on("end", () => resolve())
      .on("error", (err) => reject(err))
      .save(outputPath);
  });

  const audioBuffer = await fs.readFile(outputPath);

  // Cleanup temp files
  await fs.unlink(inputPath).catch(() => {});
  await fs.unlink(outputPath).catch(() => {});

  // Now start transcription from the extracted audio buffer
  return startTranscriptionFromBuffer(audioBuffer);
}

// Legacy function kept for potential future external URLs
export async function startTranscription(
  fileUrl: string,
): Promise<TranscriptionJob> {
  const res = await axios.post(
    `${ASSEMBLY_API_URL}/transcript`,
    {
      audio_url: fileUrl,
      speaker_labels: true,
      punctuate: true,
      format_text: true,
    },
    { headers: { authorization: API_KEY } },
  );

  return { id: res.data.id, status: res.data.status };
}

export async function getTranscriptionResult(id: string): Promise<{
  status: "queued" | "processing" | "completed" | "error";
  text?: string;
  words?: TranscriptWord[];
  error?: string;
}> {
  const res = await axios.get(`${ASSEMBLY_API_URL}/transcript/${id}`, {
    headers: { authorization: API_KEY },
  });

  const data = res.data;

  if (data.status === "completed") {
    const words: TranscriptWord[] = (data.words || []).map((w: any) => ({
      text: w.text,
      start: w.start / 1000,
      end: w.end / 1000,
      confidence: w.confidence,
      ...(w.speaker != null && { speaker: String(w.speaker) }),
    }));

    return {
      status: "completed",
      text: data.text,
      words,
    };
  }

  if (data.status === "error") {
    return { status: "error", error: data.error };
  }

  return { status: data.status };
}

// Poll until transcription completes or times out.

export async function waitForTranscription(
  id: string,
  opts: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<{ transcript: LocalTranscript; rawText: string }> {
  const timeoutMs = opts.timeoutMs ?? 15 * 60_000;
  const intervalMs = opts.intervalMs ?? 10_000;
  const start = Date.now();

  while (true) {
    const result = await getTranscriptionResult(id);

    if (result.status === "completed" && result.words) {
      const sentences = buildSentences(result.words);
      const sentenceGaps = computeSentenceGaps(sentences);
      return {
        rawText: result.text || "",
        transcript: { words: result.words, sentences, sentenceGaps },
      };
    }

    if (result.status === "error") {
      throw new Error(result.error || "Transcription failed");
    }

    if (Date.now() - start > timeoutMs) {
      throw new Error("Transcription timeout");
    }

    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

// Very simple sentence builder from word timestamps.

function buildSentences(words: TranscriptWord[]): ProcessedSentence[] {
  const sentences: ProcessedSentence[] = [];
  let current: { text: string[]; start: number; end: number } | null = null;

  // Support both Latin and Devanagari sentence enders so Hindi works correctly.
  const sentenceEnders = new Set<string>([
    ".",
    "!",
    "?",
    "।", // Hindi danda
    "॥",
  ]);

  for (const w of words) {
    if (!current) {
      current = { text: [], start: w.start, end: w.end };
    }
    current.text.push(w.text);
    current.end = w.end;

    const lastChar = w.text.slice(-1);
    if (sentenceEnders.has(lastChar)) {
      sentences.push({
        text: current.text.join(" "),
        start: current.start,
        end: current.end,
      });
      current = null;
    }
  }

  if (current) {
    sentences.push({
      text: current.text.join(" "),
      start: current.start,
      end: current.end,
    });
  }

  return sentences;
}

/** Gap in seconds before each sentence (pause after previous). sentenceGaps[0] = 0. */
function computeSentenceGaps(
  sentences: { start: number; end: number }[],
): number[] {
  if (sentences.length === 0) return [];
  const gaps: number[] = [0];
  for (let i = 1; i < sentences.length; i++) {
    gaps.push(sentences[i].start - sentences[i - 1].end);
  }
  return gaps;
}
