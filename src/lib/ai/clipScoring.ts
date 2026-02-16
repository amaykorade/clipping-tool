import OpenAI from "openai";
import { ClipSuggestion } from "@/types";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

interface ScoreOptions {
  maxClips?: number;
  language?: string;
  /** Step 4: min hook/payoff score (1-10); clips below this are dropped. Set to 0 to disable. */
  minHookPayoffScore?: number;
}

const DEFAULT_MIN_HOOK_PAYOFF = 6;

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

  // Shortlist: up to maxClips with snapped boundaries
  const shortlist = decorated.slice(0, maxClips).map((c) => ({
    startTime: c.snappedStart,
    endTime: c.snappedEnd,
    title: c.title || "Clip",
    keywords: c.keywords || [],
    confidence: c.confidence ?? 0.5,
    reason: c.reason || "",
  }));

  // Step 4: Hook/payoff scores + one-idea gate (optional)
  const minScore = opts.minHookPayoffScore ?? DEFAULT_MIN_HOOK_PAYOFF;
  if (minScore > 0 && shortlist.length > 0) {
    const filtered = await runHookPayoffAndOneIdeaGate(shortlist, segments, minScore);
    return filtered;
  }

  return shortlist;
}

/**
 * Step 4: For each shortlisted clip, rate hook (1-10) and payoff (1-10), and check one clear idea (Yes/No).
 * Drop clips that don't meet minHookPayoffScore or that don't pass the one-idea gate.
 */
async function runHookPayoffAndOneIdeaGate(
  shortlist: ClipSuggestion[],
  segments: { start: number; end: number; text: string }[],
  minScore: number,
): Promise<ClipSuggestion[]> {
  const withText = shortlist.map((c) => {
    const seg = segments.find(
      (s) => Math.abs(s.start - c.startTime) < 0.5 && Math.abs(s.end - c.endTime) < 0.5,
    );
    return { ...c, text: seg?.text ?? "" };
  }).filter((c) => c.text.length > 0);

  if (withText.length === 0) return shortlist;

  const prompt = `You are judging short-form video clips (e.g. for Reels/TikTok). For each clip below, rate:
1) hookScore (1-10): strength of the OPENING as a hook — does the first 3-5 seconds grab attention? (surprising, bold, curiosity, promise, emotion)
2) payoffScore (1-10): strength of the ENDING as a payoff — does it feel like a conclusion, takeaway, or punchline? (not a lead-in like "So next..." or "Number two...")
3) oneClearIdea (true/false): does this clip convey ONE clear, complete idea that makes sense on its own?

Return a JSON array with one object per clip, in the same order, with keys: startTime, endTime, hookScore, payoffScore, oneClearIdea.

Clips (startTime, endTime in seconds; text = transcript):
${JSON.stringify(withText.map((c) => ({ startTime: c.startTime, endTime: c.endTime, text: c.text })), null, 2)}

Return ONLY the JSON array.`;

  try {
    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
    });
    const content = res.choices[0]?.message?.content;
    if (!content || typeof content !== "string") return shortlist;

    let raw = content.trim();
    const codeBlockMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) raw = codeBlockMatch[1].trim();
    const arrayMatch = raw.match(/\[[\s\S]*\]/);
    if (arrayMatch) raw = arrayMatch[0];

    const parsed = JSON.parse(raw) as Array<{
      startTime?: number;
      endTime?: number;
      hookScore?: number;
      payoffScore?: number;
      oneClearIdea?: boolean;
    }>;
    if (!Array.isArray(parsed)) return shortlist;

    const passed = new Set<string>();
    for (let i = 0; i < Math.min(parsed.length, withText.length); i++) {
      const p = parsed[i];
      const clip = withText[i];
      const key = `${clip.startTime}-${clip.endTime}`;
      const hook = typeof p.hookScore === "number" ? p.hookScore : 0;
      const payoff = typeof p.payoffScore === "number" ? p.payoffScore : 0;
      const one = p.oneClearIdea === true;
      if (hook >= minScore && payoff >= minScore && one) passed.add(key);
    }

    const filtered = shortlist.filter(
      (c) => passed.has(`${c.startTime}-${c.endTime}`),
    );
    if (filtered.length < shortlist.length) {
      console.log(
        `[clipScoring] Step 4 gate: ${shortlist.length} → ${filtered.length} clips (hook/payoff >= ${minScore}, one clear idea)`,
      );
    }
    return filtered.length > 0 ? filtered : shortlist; // if gate drops all, keep original shortlist
  } catch (e) {
    console.warn("[clipScoring] Hook/payoff/one-idea gate failed, keeping shortlist:", e);
    return shortlist;
  }
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
   - Do NOT select segments whose last sentence is a fragment (1-2 words, e.g. "I'll") or incomplete, or whose first sentence is a fragment (e.g. "Effectively.", "So.") — these make the clip feel cut mid-thought.

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
