import OpenAI from "openai";
import { ClipSuggestion } from "@/types";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

interface ScoreOptions {
  maxClips?: number;
  language?: string;
}

/**
 * Ask the model to:
 * - score each segment,
 * - write a short title,
 * - pick the best N.
 */
export async function scoreAndTitleSegments(
  segments: { start: number; end: number; text: string }[],
  opts: ScoreOptions = {},
): Promise<ClipSuggestion[]> {
  const maxClips = opts.maxClips ?? 10;

  if (!segments.length) return [];

  const prompt = buildPrompt(segments, maxClips);

  // Use Chat Completions API for reliable text response (choices[0].message.content)
  const res = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.4,
  });

  const content = res.choices[0]?.message?.content;
  if (!content || typeof content !== "string") {
    console.warn("[clipScoring] No content in response", res);
    return [];
  }

  let raw = content.trim();

  // Strip markdown code block if present
  const codeBlockMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) raw = codeBlockMatch[1].trim();
  const arrayMatch = raw.match(/\[[\s\S]*\]/);
  if (arrayMatch) raw = arrayMatch[0];

  let parsed: ClipSuggestion[] = [];
  try {
    const parsedUnknown = JSON.parse(raw) as unknown;
    if (Array.isArray(parsedUnknown)) {
      parsed = parsedUnknown;
    } else if (
      parsedUnknown &&
      typeof parsedUnknown === "object" &&
      "clips" in parsedUnknown &&
      Array.isArray((parsedUnknown as { clips: unknown }).clips)
    ) {
      parsed = (parsedUnknown as { clips: ClipSuggestion[] }).clips;
    } else if (parsedUnknown && typeof parsedUnknown === "object") {
      const firstArray = Object.values(parsedUnknown).find(
        (v): v is ClipSuggestion[] => Array.isArray(v) && v.length > 0,
      );
      if (firstArray) parsed = firstArray;
    }
    if (parsed.length === 0) {
      console.warn("[clipScoring] Parsed 0 clips. Raw response (first 500):", raw?.slice(0, 500));
    }
  } catch (e) {
    console.warn(
      "[clipScoring] Failed to parse model response as JSON:",
      raw?.slice(0, 400),
      e,
    );
    parsed = [];
  }

  // Helper: snap a model suggestion back to the nearest original segment
  const snapToSegment = (start: number, end: number) => {
    if (!segments.length) {
      return { start, end, duration: Math.max(0, end - start) };
    }
    let best = segments[0];
    let bestScore =
      Math.abs(best.start - start) + Math.abs(best.end - end);
    for (let i = 1; i < segments.length; i++) {
      const s = segments[i];
      const score =
        Math.abs(s.start - start) + Math.abs(s.end - end);
      if (score < bestScore) {
        best = s;
        bestScore = score;
      }
    }
    return {
      start: best.start,
      end: best.end,
      duration: best.end - best.start,
    };
  };

  // Map suggestions back to segment boundaries, filter by confidence and duration,
  // then sort by confidence (highest first)
  const decorated = parsed
    .filter(
      (c) =>
        typeof c.startTime === "number" &&
        typeof c.endTime === "number" &&
        c.endTime > c.startTime,
    )
    .map((c) => {
      const snapped = snapToSegment(c.startTime, c.endTime);
      return {
        ...c,
        confidence: c.confidence ?? 0.5,
        snappedStart: snapped.start,
        snappedEnd: snapped.end,
        duration: snapped.duration,
      };
    })
    // keep only reasonably strong clips and reasonable durations for shorts
    .filter(
      (c) =>
        c.confidence >= 0.6 &&
        c.duration >= 25 && // at least ~25s to avoid ultra-short, contextless clips
        c.duration <= 90, // at most ~90s
    )
    .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));

  // Clamp to maxClips and ensure fields exist, using snapped boundaries
  return decorated.slice(0, maxClips).map((c) => ({
    startTime: c.snappedStart,
    endTime: c.snappedEnd,
    title: c.title || "Clip",
    keywords: c.keywords || [],
    confidence: c.confidence ?? 0.5,
    reason: c.reason || "",
  }));
}

function buildPrompt(
  segments: { start: number; end: number; text: string }[],
  maxClips: number,
): string {
  const items = segments.map((s, idx) => ({
    id: idx,
    startTime: s.start,
    endTime: s.end,
    text: s.text,
  }));

  return `
You are an expert short-form content editor.
Your job is to pick the best clips for TikTok, Instagram Reels and YouTube Shorts.

You are given a list of candidate segments with:
- startTime and endTime in seconds (relative to the full video)
- text (transcript of just that segment)

Each candidate segment is built from COMPLETE SENTENCES ONLY: it starts at the start of a sentence and ends at the end of a sentence (no mid-sentence cuts). Segments are usually 25–70 seconds and contain 1–6 sentences. Your job is to decide which of these pre-made segments are worth turning into short clips. Use each segment's startTime and endTime as-is; do not suggest different times (we will use the full segment boundaries).

For each candidate, judge:
1) HOOK QUALITY (very important)
   - The FIRST sentence (or first 3–5 seconds) must contain a strong hook:
     - surprising statement, bold opinion, curiosity gap, controversy, clear promise, or emotional moment
   - If the beginning is slow, generic, or pure setup with no hook, DO NOT select this segment.

2) SELF-CONTAINED, ONE CLEAR IDEA
   - The clip must make sense by itself, without needing the rest of the episode.
   - It should cover ONE clear point, story, or idea (no \"part 2 of 3\" feel).
   - Each segment already ends at a sentence boundary; prefer segments whose final sentence is a punchline, takeaway, or conclusion rather than a trailing "so..." or setup.

3) SHORT-FORM FIT
   - Works well as vertical short-form: concise, conversational, no long rambling.
   - Avoid segments that are mostly filler, small talk, or logistics.

Scoring rules:
- confidence is from 0 to 1.
- Only return clips with confidence >= 0.6.
- Prefer fewer, stronger clips over many weak ones.

Return a JSON array of up to ${maxClips} objects with:
- startTime (number)  // when the clip should start (usually equal to the segment startTime)
- endTime (number)    // when the clip should end (usually equal to the segment endTime)
- title (string, <= 80 chars, catchy but not clickbait)
- keywords (array of strings)
- confidence (0-1 number)
- reason (short explanation of why this works as a strong short, focusing on the HOOK and the ONE clear idea)

Here is the candidate data (JSON):

${JSON.stringify(items, null, 2)}

Return ONLY the JSON array, nothing else.
`;
}
