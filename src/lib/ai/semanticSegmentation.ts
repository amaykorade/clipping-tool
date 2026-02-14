import OpenAI from "openai";
import type { Transcript } from "@/types";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export interface Beat {
  /** 0-based inclusive start sentence index. */
  startSentenceIndex: number;
  /** 0-based inclusive end sentence index. */
  endSentenceIndex: number;
}

/**
 * Use an LLM to find topic/beat boundaries in the transcript.
 * Returns contiguous ranges of sentences that form "one idea" so we only build
 * clip candidates within a single beat (no candidate spanning two topics).
 * On failure or empty result, returns [] so the caller can fall back to no segmentation.
 */
export async function getBeatsFromTranscript(
  transcript: Transcript,
): Promise<Beat[]> {
  const sentences =
    transcript.sentences && Array.isArray(transcript.sentences)
      ? transcript.sentences
      : [];
  if (sentences.length === 0) return [];

  const sentenceGaps = transcript.sentenceGaps;
  const items = sentences.map((s, idx) => ({
    index: idx,
    text: s.text,
    ...(sentenceGaps && sentenceGaps[idx] != null && { gapBeforeSec: sentenceGaps[idx] }),
  }));

  const prompt = `You are analyzing a video transcript to find topic/beat boundaries for short-form clip extraction.

You are given a list of sentences with:
- index (0-based)
- text (the sentence)
- gapBeforeSec (optional): pause in seconds before this sentence (long pause often = new idea)

Your task: identify where the topic or sub-topic changes. Each "beat" is a contiguous block of sentences that form ONE clear idea (e.g. intro, tip 1, story, tip 2, conclusion).

Return a JSON array of beats. Each beat is an object:
- startSentenceIndex (number, 0-based, inclusive)
- endSentenceIndex (number, 0-based, inclusive)

Rules:
- Beats must not overlap and must cover every sentence in order (gaps allowed only if you explicitly leave a sentence out; otherwise prefer contiguous coverage).
- Each beat should be one coherent idea. Prefer more, shorter beats over fewer long ones when the content clearly shifts.
- Use gapBeforeSec: a gap > 1.5 seconds often indicates a natural boundary.
- The first beat must start at index 0; the last beat must end at index ${sentences.length - 1}.

Example: 20 sentences, boundaries at 5, 12, 18 → [{ startSentenceIndex: 0, endSentenceIndex: 5 }, { startSentenceIndex: 6, endSentenceIndex: 12 }, { startSentenceIndex: 13, endSentenceIndex: 18 }, { startSentenceIndex: 19, endSentenceIndex: 19 }]

Transcript sentences (JSON):
${JSON.stringify(items, null, 2)}

Return ONLY a JSON array of beat objects, nothing else.`;

  try {
    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
    });

    const content = res.choices[0]?.message?.content;
    if (!content || typeof content !== "string") {
      console.warn("[semanticSegmentation] No content in response");
      return [];
    }

    let raw = content.trim();
    const codeBlockMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) raw = codeBlockMatch[1].trim();
    const arrayMatch = raw.match(/\[[\s\S]*\]/);
    if (arrayMatch) raw = arrayMatch[0];

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    const beats: Beat[] = [];
    for (const b of parsed) {
      const start = typeof b?.startSentenceIndex === "number" ? b.startSentenceIndex : -1;
      const end = typeof b?.endSentenceIndex === "number" ? b.endSentenceIndex : -1;
      if (start >= 0 && end >= start && end < sentences.length) {
        beats.push({ startSentenceIndex: start, endSentenceIndex: end });
      }
    }

    // Normalize: ensure full coverage and no overlaps (merge/split if needed)
    const normalized = normalizeBeats(beats, sentences.length);
    if (normalized.length === 0) return [];
    return normalized;
  } catch (err) {
    console.warn("[semanticSegmentation] LLM beat detection failed:", err);
    return [];
  }
}

/**
 * Ensure beats cover 0..numSentences-1 with no overlaps, in order.
 * If the model returns gaps or overlaps, we merge/split to get a valid partition.
 */
function normalizeBeats(beats: Beat[], numSentences: number): Beat[] {
  if (numSentences === 0) return [];
  if (beats.length === 0) return [{ startSentenceIndex: 0, endSentenceIndex: numSentences - 1 }];

  const sorted = [...beats].sort(
    (a, b) => a.startSentenceIndex - b.startSentenceIndex,
  );
  const result: Beat[] = [];
  let nextExpected = 0;

  for (const b of sorted) {
    const start = Math.max(b.startSentenceIndex, nextExpected);
    const end = Math.min(b.endSentenceIndex, numSentences - 1);
    if (start <= end) {
      result.push({ startSentenceIndex: start, endSentenceIndex: end });
      nextExpected = end + 1;
    }
  }

  // If we missed the end, extend last beat or add a final beat
  if (nextExpected < numSentences) {
    if (result.length > 0 && result[result.length - 1].endSentenceIndex < numSentences - 1) {
      result[result.length - 1].endSentenceIndex = numSentences - 1;
    } else if (result.length === 0 || result[result.length - 1].endSentenceIndex < nextExpected) {
      result.push({
        startSentenceIndex: nextExpected,
        endSentenceIndex: numSentences - 1,
      });
    }
  }

  return result;
}
