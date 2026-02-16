import OpenAI from "openai";
import type { ClipSuggestion } from "@/types";
import type { Transcript } from "@/types";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

type Sentence = { text: string; start: number; end: number };

/**
 * Find the sentence indices that span the given time range (with small tolerance).
 */
function findSentenceIndicesForRange(
  sentences: Sentence[],
  startTime: number,
  endTime: number,
): { startIdx: number; endIdx: number } | null {
  if (sentences.length === 0) return null;
  const tol = 0.5;
  let startIdx = -1;
  let endIdx = -1;
  for (let i = 0; i < sentences.length; i++) {
    if (sentences[i].end >= startTime - tol && startIdx < 0) startIdx = i;
    if (sentences[i].start <= endTime + tol) endIdx = i;
  }
  if (startIdx < 0 || endIdx < 0 || startIdx > endIdx) return null;
  return { startIdx, endIdx };
}

/**
 * Step 5: Refinement pass. For each clip, ask the LLM to suggest a tighter start/end sentence
 * (trim setup at start, trim transition at end). Recompute startTime/endTime from sentence timestamps.
 */
export async function refineClipBoundaries(
  transcript: Transcript,
  suggestions: ClipSuggestion[],
): Promise<ClipSuggestion[]> {
  const sentences = transcript.sentences && Array.isArray(transcript.sentences) ? transcript.sentences : [];
  if (sentences.length === 0 || suggestions.length === 0) return suggestions;

  const clipsWithIndices: Array<{
    suggestion: ClipSuggestion;
    startIdx: number;
    endIdx: number;
    sentenceTexts: string[];
  }> = [];

  for (const s of suggestions) {
    const range = findSentenceIndicesForRange(sentences, s.startTime, s.endTime);
    if (!range || range.endIdx - range.startIdx < 1) continue;
    const sentenceTexts = sentences
      .slice(range.startIdx, range.endIdx + 1)
      .map((sent) => sent.text);
    clipsWithIndices.push({
      suggestion: s,
      startIdx: range.startIdx,
      endIdx: range.endIdx,
      sentenceTexts,
    });
  }

  if (clipsWithIndices.length === 0) return suggestions;

  const prompt = `You are trimming short-form clips. For each clip below, the clip is currently defined by sentence indices (0-based) and the exact sentences.

For each clip, decide:
1) START: If the first 1-2 sentences are setup with no hook (e.g. "So", "Anyway", "As I was saying"), or if the first sentence is a short fragment (e.g. "Effectively.", "So.", "Well." — single word or 2-3 words that continue from previous context), suggest a new startSentenceIndex (later index). Otherwise keep the same.
2) END: If the last 1-2 sentences are transition to the next topic (e.g. "So next", "Number two", "And then"), or if the last sentence is a fragment or incomplete (e.g. "I'll", "So we", 1-2 words, or does not end with . ! ?), suggest a new endSentenceIndex (earlier index) to drop it. The clip must end on a clear, complete sentence. Otherwise keep the same.

Rules: startSentenceIndex must be <= endSentenceIndex; the resulting clip must have at least 1 sentence. Return the same indices if no trim is needed.

Return a JSON array with one object per clip, in the same order. Each object: startSentenceIndex (number), endSentenceIndex (number).

Clips (current startIdx, endIdx, and sentences):
${JSON.stringify(
  clipsWithIndices.map((c) => ({
    startIdx: c.startIdx,
    endIdx: c.endIdx,
    sentences: c.sentenceTexts,
  })),
  null,
 2,
)}

Return ONLY the JSON array.`;

  try {
    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
    });
    const content = res.choices[0]?.message?.content;
    if (!content || typeof content !== "string") return suggestions;

    let raw = content.trim();
    const codeBlockMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) raw = codeBlockMatch[1].trim();
    const arrayMatch = raw.match(/\[[\s\S]*\]/);
    if (arrayMatch) raw = arrayMatch[0];

    const parsed = JSON.parse(raw) as Array<{ startSentenceIndex?: number; endSentenceIndex?: number }>;
    if (!Array.isArray(parsed)) return suggestions;

  // Map back to full suggestions list: clipsWithIndices may be a subset if some had no sentence range.
  const refinedByKey = new Map<string, ClipSuggestion>();
  for (let i = 0; i < clipsWithIndices.length; i++) {
    const clip = clipsWithIndices[i];
    const p = parsed[i];
    let startIdx = clip.startIdx;
    let endIdx = clip.endIdx;
    if (p && typeof p.startSentenceIndex === "number" && typeof p.endSentenceIndex === "number") {
      startIdx = Math.max(clip.startIdx, Math.min(p.startSentenceIndex, clip.endIdx));
      endIdx = Math.min(clip.endIdx, Math.max(p.endSentenceIndex, clip.startIdx));
      if (startIdx > endIdx) endIdx = startIdx;
    }
    const newStart = sentences[startIdx].start;
    const newEnd = sentences[endIdx].end;
    const duration = newEnd - newStart;
    if (duration >= 15 && duration <= 90) {
      refinedByKey.set(`${clip.suggestion.startTime}-${clip.suggestion.endTime}`, {
        ...clip.suggestion,
        startTime: newStart,
        endTime: newEnd,
      });
    } else {
      refinedByKey.set(`${clip.suggestion.startTime}-${clip.suggestion.endTime}`, clip.suggestion);
    }
  }

  const refined = suggestions.map((s) => {
    const key = `${s.startTime}-${s.endTime}`;
    return refinedByKey.get(key) ?? s;
  });
  if (refined.some((r, i) => r.startTime !== suggestions[i]?.startTime || r.endTime !== suggestions[i]?.endTime)) {
    console.log("[clipRefinement] Step 5: refined boundaries for", refined.length, "clips");
  }
  return refined;
  } catch (e) {
    console.warn("[clipRefinement] Refinement failed, keeping original boundaries:", e);
    return suggestions;
  }
}

// Step 6: Phrases that indicate a bad clip ending (last sentence is transition to next topic)
const BAD_ENDING_PHRASES = [
  "so next",
  "number two",
  "and then",
  "second,",
  "first,",
  "second tip",
  "next tip",
  "सुनो",
  "फिर",
  "अब",
  "next,",
  "second.",
  "first.",
];

// Step 6: Phrases that indicate weak opening (first sentence is setup/filler or continuation)
const WEAK_OPENING_PHRASES = [
  "so,",
  "anyway,",
  "as i was saying",
  "as we were saying",
  "so anyway",
  "effectively",
  "effectively.",
  "basically",
  "basically.",
  "basically,",
  "well,",
  "well.",
];

// Last sentence that is only these (fragment/incomplete) → bad ending
const INCOMPLETE_ENDING_PHRASES = [
  "i'll",
  "i'm",
  "we're",
  "so we",
  "and we",
  "but we",
  "and i",
  "but i",
];

const SENTENCE_ENDERS = new Set([".", "!", "?", "؟", "۔", "।", "॥"]);
const MIN_FIRST_SENTENCE_WORDS = 4; // First sentence with fewer words is likely a fragment (e.g. "Effectively.")
const MIN_LAST_SENTENCE_WORDS = 3;  // Last sentence with fewer words is likely incomplete (e.g. "I'll")

function normalizeForMatch(text: string): string {
  return text.trim().toLowerCase().slice(0, 50);
}

function startsWithAny(phrase: string, list: string[]): boolean {
  const n = normalizeForMatch(phrase);
  return list.some((p) => n.startsWith(p.trim().toLowerCase()));
}

function getFirstAndLastSentenceText(
  sentences: Sentence[],
  startTime: number,
  endTime: number,
): { first: string; last: string } | null {
  const range = findSentenceIndicesForRange(sentences, startTime, endTime);
  if (!range) return null;
  const first = sentences[range.startIdx]?.text ?? "";
  const last = sentences[range.endIdx]?.text ?? "";
  return { first, last };
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function endsWithSentencePunctuation(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  return SENTENCE_ENDERS.has(t.slice(-1));
}

/** Last sentence is a fragment or incomplete (e.g. "I'll", "So we") */
function isBadEndingSentence(last: string): boolean {
  const trimmed = last.trim();
  if (!trimmed) return true;
  const words = wordCount(trimmed);
  if (words < MIN_LAST_SENTENCE_WORDS) return true;
  if (!endsWithSentencePunctuation(trimmed)) return true;
  const n = normalizeForMatch(trimmed);
  if (INCOMPLETE_ENDING_PHRASES.some((p) => n.startsWith(p) || n === p)) return true;
  return startsWithAny(last, BAD_ENDING_PHRASES);
}

/** First sentence is a fragment or continuation (e.g. "Effectively.", "So.") */
function isWeakOpeningSentence(first: string): boolean {
  const trimmed = first.trim();
  if (!trimmed) return true;
  if (wordCount(trimmed) < MIN_FIRST_SENTENCE_WORDS) return true;
  return startsWithAny(first, WEAK_OPENING_PHRASES);
}

/**
 * Step 6: Apply trailing/opening phrase rules. Reject clips whose:
 * - Last sentence is a transition phrase, fragment (≤2 words), or doesn't end with .!?
 * - First sentence is weak opening, or a short fragment (e.g. "Effectively.")
 */
export function applyTrailingAndOpeningRules(
  suggestions: ClipSuggestion[],
  transcript: Transcript,
): ClipSuggestion[] {
  const sentences = transcript.sentences && Array.isArray(transcript.sentences) ? transcript.sentences : [];
  if (sentences.length === 0) return suggestions;

  const filtered = suggestions.filter((s) => {
    const firstLast = getFirstAndLastSentenceText(sentences, s.startTime, s.endTime);
    if (!firstLast) return true; // keep if we can't determine
    const { first, last } = firstLast;
    if (isBadEndingSentence(last)) return false;
    if (isWeakOpeningSentence(first)) return false;
    return true;
  });

  if (filtered.length < suggestions.length) {
    console.log(
      "[clipRefinement] Step 6: dropped",
      suggestions.length - filtered.length,
      "clips (bad ending, weak opening, or fragment)",
    );
  }
  return filtered;
}
