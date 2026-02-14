import { Transcript, TranscriptWord } from "@/types";

interface Segment {
  start: number;
  end: number;
  text: string;
  words: TranscriptWord[];
}

interface SegmentationOptions {
  minDurationSec?: number;
  maxDurationSec?: number;
  maxGapSec?: number;
  maxSentencesPerSegment?: number;
}

/** Detect if a word likely ends a sentence (punctuation). */
function isSentenceEnd(word: TranscriptWord): boolean {
  const t = (word.text || "").trim();
  if (!t.length) return false;
  const last = t.slice(-1);
  // Support both Latin and Devanagari sentence enders so Hindi works well too.
  return (
    last === "." || // Latin period
    last === "!" ||
    last === "?" ||
    last === "。" || // CJK full stop
    last === "！" ||
    last === "？" ||
    last === "।" || // Devanagari danda (Hindi full stop)
    last === "॥"
  );
}

/**
 * Build list of sentences from words: each sentence has start, end, text.
 * Sentence ends at words that end with . ! ?
 */
function buildSentencesFromWords(words: TranscriptWord[]): { start: number; end: number; text: string }[] {
  const sentences: { start: number; end: number; text: string }[] = [];
  let current: { start: number; end: number; parts: string[] } | null = null;

  for (const w of words) {
    if (!current) {
      current = { start: w.start, end: w.end, parts: [w.text] };
    } else {
      current.end = w.end;
      current.parts.push(w.text);
    }
    if (isSentenceEnd(w)) {
      sentences.push({
        start: current.start,
        end: current.end,
        text: current.parts.join(" ").trim(),
      });
      current = null;
    }
  }
  if (current) {
    sentences.push({
      start: current.start,
      end: current.end,
      text: current.parts.join(" ").trim(),
    });
  }
  return sentences;
}

/**
 * Segment the transcript so that:
 * - We only break at sentence boundaries (never mid-sentence).
 * - Each segment is 20–90s (configurable) and contains full sentences.
 * - Long pauses between sentences can force a break so we don't merge unrelated thoughts.
 * This produces clips that start and end where the content makes sense.
 */
export function segmentTranscript(
  transcript: Transcript,
  options: SegmentationOptions = {},
): Segment[] {
  const minDuration = options.minDurationSec ?? 15;
  const maxDuration = options.maxDurationSec ?? 60;
  const maxGapSec = options.maxGapSec ?? 2;
  const maxSentencesPerSegment = options.maxSentencesPerSegment ?? 4;

  const words = transcript.words;
  if (!words.length) return [];

  // Always derive sentences from words using language-aware punctuation,
  // so updates (like Hindi support) apply even to old stored transcripts.
  const sentences = buildSentencesFromWords(words);

  if (!sentences.length) return [];

  // 2) Group sentences into segments; only break at sentence boundaries
  const segments: Segment[] = [];
  let segStart = sentences[0].start;
  let segEnd = sentences[0].end;
  let segText = sentences[0].text;
  let segWords = getWordsInRange(words, segStart, segEnd);
  let sentenceCount = 1;

  for (let i = 1; i < sentences.length; i++) {
    const sent = sentences[i];
    const gap = sent.start - segEnd;
    const durationIfAdd = sent.end - segStart;

    const overMax = durationIfAdd > maxDuration;
    const bigPause = gap > maxGapSec;
    const tooManySentences = sentenceCount >= maxSentencesPerSegment;
    const shouldBreak = overMax || bigPause || tooManySentences;

    if (shouldBreak && segEnd - segStart >= minDuration) {
      segments.push({
        start: segStart,
        end: segEnd,
        text: segText.trim(),
        words: segWords,
      });
      segStart = sent.start;
      segEnd = sent.end;
      segText = sent.text;
      segWords = getWordsInRange(words, segStart, segEnd);
      sentenceCount = 1;
    } else {
      segEnd = sent.end;
      segText += " " + sent.text;
      segWords = getWordsInRange(words, segStart, segEnd);
      sentenceCount += 1;
    }
  }

  if (segEnd - segStart >= minDuration) {
    segments.push({
      start: segStart,
      end: segEnd,
      text: segText.trim(),
      words: segWords,
    });
  }

  return segments;
}

function getWordsInRange(
  words: TranscriptWord[],
  start: number,
  end: number,
): TranscriptWord[] {
  const tolerance = 0.01;
  return words.filter(
    (w) => w.start >= start - tolerance && w.end <= end + tolerance,
  );
}
