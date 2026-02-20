# Kllivo: Clip Generation Pipeline

This document describes **what we currently implement** and **what we should do properly** to get human-quality shorts from long videos. Use it as the single source of truth when iterating on clip quality.

---

## Table of contents

1. [Current implementation (detailed)](#1-current-implementation-detailed)
2. [Suggested proper pipeline (detailed)](#2-suggested-proper-pipeline-detailed)
3. [Summary: current vs proper](#3-summary-current-vs-proper)
4. [File reference](#4-file-reference)

---

## 1. Current implementation (detailed)

### 1.1 Transcript (Step 1)

**Where:** Worker calls AssemblyAI; we store the result. Sentences are built in `src/lib/ai/transcription.ts` (`buildSentences`) and optionally in `src/lib/ai/clipSegmentation.ts` when deriving from words.

**What we do:**

- After upload, the worker transcribes the video (AssemblyAI).
- We get **words** with `start` / `end` in seconds.
- We build **sentences** by grouping words until we hit **sentence-ending punctuation**:
  - Latin: `.` `!` `?`
  - Hindi: `।` (danda), `॥`
  - Others: `؟` `۔` (Urdu/Arabic-style)
- Stored in DB: `video.transcript` = `{ words: [...], sentences: [...] }`.

**What we don’t do:**

- We do **not** detect “topic change” or “beat boundaries.”
- We do **not** use pause length or speaker labels to infer “one idea ends here.”

---

### 1.2 Building clip candidates (Step 2)

**Where:** `src/lib/video/generateClipsFromTranscript.ts`

**What we do:**

1. Load `transcript.words` and `transcript.sentences` (if missing, we fail; we don’t build sentences from words here).
2. For every starting sentence index `i`, we consider runs: sentences `i` through `j` for `j = i, i+1, … i+5` (max 6 sentences per run).
3. For each run we compute:
   - `start` = first sentence’s start time
   - `end` = last sentence’s end time
   - `duration` = end - start
   - `text` = concatenation of those sentences’ text
4. We **keep** a run only if:
   - `duration >= 25` and `duration <= 70` seconds, and
   - The **last sentence’s text** ends with sentence punctuation (`.` `!` `?` `؟` `۔` etc.) so we never end mid-sentence.
5. We cap at **200 candidates** to avoid huge prompts.

So candidates are **“all 25–70s runs of 1–6 consecutive sentences that end with proper punctuation.”** We do **not** ask “is this one topic?” — we only use position, length, and punctuation.

**Gap:** A candidate can span two ideas (e.g. end of “tip 1” and start of “tip 2”) because we never segment by meaning.

---

### 1.3 Scoring and selecting clips (Step 3)

**Where:** `src/lib/ai/clipScoring.ts` (`scoreAndTitleSegments`)

**What we do:**

1. **One LLM call:** We send all candidate segments (each with `startTime`, `endTime`, `text`) to the model (e.g. GPT-4o-mini) with a prompt that says:
   - Pick up to N (e.g. 10) best clips.
   - Prefer: strong hook in the first 3–5 seconds, one clear idea, ending that feels like a payoff (not “so next…”).
   - Return JSON: `startTime`, `endTime`, `title`, `keywords`, `confidence`, `reason`.
2. We **snap** each returned clip to the **nearest** of our pre-built candidate segments (by minimizing |start − seg.start| + |end − seg.end|). So the final clip boundaries are **always** one of our candidate boundaries; the model cannot suggest “start one sentence later.”
3. We **filter** the parsed suggestions:
   - Drop invalid (e.g. missing or non-numeric times).
   - Snap to segment → get `duration`.
   - Keep only if `confidence >= 0.6` and `25 <= duration <= 90` seconds.
   - Sort by confidence descending, take top `maxClips`.
4. We return the list of clip suggestions (with snapped start/end, title, etc.).

**What we don’t do:**

- We do **not** run a second pass to score “hook strength” or “payoff strength” explicitly.
- We do **not** run a **refinement** pass to trim the first or last sentence(s).
- We do **not** apply rule-based filters (e.g. “reject if last sentence starts with ‘So next…’”).

---

### 1.4 Persisting and rendering (Step 4)

**Where:** `generateClipsFromTranscript.ts` (DB write), worker (render job)

**What we do:**

- We create `Clip` rows in the DB with: `videoId`, `title`, `startTime`, `endTime`, `duration`, `confidence`, `keywords`, `aspectRatio: VERTICAL`, `status: PENDING`.
- The worker picks up PENDING clips and renders each (trim, crop to 9:16, upload); clip status becomes COMPLETED and `outputUrl` is set.

**Regeneration:** If the video already had clips, we **delete all existing clips** for that video and then run the full pipeline again, so “Regenerate Clips” always produces a fresh set from the current logic.

---

## 2. Suggested proper pipeline (detailed)

Same high-level steps, but with the right checks and extra passes so clips feel like a human cut them.

---

### 2.1 Transcript (Step 1)

**Keep:** Words and sentences (with punctuation and Hindi `।` etc.) as today.

**Add (optional but helpful):**

- Use **long pauses** between words (e.g. gap > 1.5s) as a signal for “boundary between ideas” when building or validating segments.
- If we have **speaker labels** from the provider, use them so we can prefer clip boundaries that align with speaker turns (one person’s monologue = one clip candidate).

---

### 2.2 Semantic segmentation (Step 2 – new)

**Purpose:** Know where “one idea” ends and the next begins, so we never build a candidate that spans two topics.

**What to do:**

1. Run the transcript (in chunks if very long) through an LLM or a heuristic to mark **topic/beat boundaries**:
   - Example prompt: “Read this transcript. Where does the topic or sub-topic change? For each change, give the approximate sentence index or timestamp. E.g. intro (0–5), tip 1 (6–12), tip 2 (13–20), …”
2. Use that output to get **chapters/beats** (each beat = a contiguous range of sentences).
3. When building clip candidates (next step), **only** form runs that lie **inside a single beat** (or that span a clean beat boundary by design). Do not form runs that span “tip 1” and “tip 2” arbitrarily.

**Result:** Every candidate is “one idea” by construction, not “any 25–70s run.”

---

### 2.3 Building candidates (Step 3)

**What to do:**

- Same as now (runs of 1–6 consecutive sentences, 25–70s, last sentence ends with punctuation), **except** restrict to **within the segments from Step 2** (semantic beats).
- Optionally prefer start/end that fall on **long pauses** or **speaker turn boundaries** when multiple valid runs exist.

---

### 2.4 Score + hook/payoff + one-idea gate (Step 4)

**What to do:**

1. **First call (as now):** “From these candidates, pick the best ~10; prefer strong hook, one idea, good ending.” Get a shortlist.
2. **Second pass (new):** For each shortlisted clip, ask the model: “Rate 1–10: strength of the **opening as a hook**; strength of the **ending as a payoff**.” Drop clips that don’t meet a minimum (e.g. hook ≥ 6, payoff ≥ 6).
3. **One-idea gate (new):** For each remaining clip, ask: “Does this clip convey **one clear, complete idea** that makes sense on its own? Yes/No and one-line reason.” Keep only those that get **Yes**.

This **enforces** “has a hook,” “has a payoff,” and “one idea” instead of only asking for it once in the first prompt.

---

### 2.5 Refinement pass (Step 5 – new)

**Purpose:** Avoid “ending in the middle” or “starting with boring setup” by letting the model suggest a tighter range.

**What to do:**

- For each kept clip (e.g. “sentences 12–18”), call the model: “This clip is sentences 12–18. If the first 1–2 sentences are setup with no hook, give a new **start** sentence index. If the last 1–2 sentences are transition to the next topic (e.g. ‘So next…’, ‘Number two…’), give a new **end** sentence index. Otherwise return the same range.”
- Re-cut the clip to that tighter range and recompute `startTime` / `endTime` from the sentence list (so we still end on sentence boundaries).

**Result:** We no longer keep clips that end on “So next…” or “Number two…” or start with “So, anyway…,” without hard-coding every phrase.

---

### 2.6 Trailing/opening phrase rules (Step 6 – new)

**What to do:**

- **Bad clip endings:** If the **last** sentence of a clip **starts** with phrases like “So next”, “Number two”, “And then”, “Second,” “First,” “सुनो”, “फिर” (or similar in other languages), then either **reject** that clip or run the refinement step to **trim the last sentence**.
- **Weak openings:** If the **first** sentence starts with “So”, “Anyway”, “As I was saying”, down-rank or run refinement to suggest a later start (e.g. drop the first sentence).

These are simple, high-impact rules that catch many “feels cut in the middle” cases.

---

### 2.7 Save and render (Step 7)

Same as now: persist final clips, worker renders 9:16. Optionally later: **platform presets** (e.g. TikTok vs YouTube Shorts vs Reels) with different min/max length and hook strictness.

---

## 3. Summary: current vs proper

| Step | Current | Proper |
|------|--------|--------|
| **1. Transcript** | Words + sentences (punctuation + Hindi `।`). | Same + use pauses/speakers where available. |
| **2. Segmentation** | None. | **Semantic:** find topic/beat boundaries; build candidates only inside those. |
| **3. Candidates** | All 25–70s runs of 1–6 sentences (anywhere in video). | Same length rules, but **only within** each beat. |
| **4. Selection** | One LLM call → pick ~10 → snap to candidates → filter by confidence + duration. | Same **plus** explicit **hook score** and **payoff score**; **one-idea** gate (keep only “one clear idea”). |
| **5. Refinement** | None. | **Trim pass:** LLM suggests “start at sentence X, end at sentence Y” → re-cut so we don’t end in the middle or start with fluff. |
| **6. Rules** | None. | **Trailing/opening rules:** reject or trim when last sentence is “So next…”, “Number two…”, or first is “So, anyway…”. |
| **7. Output** | Save + render. | Same; later add platform presets if needed. |

**One-line takeaway:**  
Right now we pick the “best” among **time-based sentence runs** with one LLM call and no refinement, so clips can still mix ideas or end on a transition. Properly, we **first** find **idea-boundaries** (beats), build candidates **inside** those, then **score + enforce hook/payoff + one-idea**, **refine** start/end, and **apply** simple rules so each clip is one clear, postable short like a human would cut.

---

## 4. File reference

| File | Role |
|------|------|
| `src/lib/ai/transcription.ts` | AssemblyAI integration; `buildSentences` (sentence-ending punctuation, including Hindi `।`). |
| `src/lib/ai/clipSegmentation.ts` | `segmentTranscript` (sentence-boundary segmentation with min/max duration, max sentences, gap). Used by transcript API and could be used for alternative candidate building; **not** used in the current generateClipsFromTranscript path. |
| `src/lib/video/generateClipsFromTranscript.ts` | Load transcript, build candidate segments (sentence runs 25–70s, end with punctuation), call scoring, delete old clips if regenerating, persist new clips. |
| `src/lib/ai/clipScoring.ts` | `scoreAndTitleSegments`: one LLM call, snap to nearest segment, filter by confidence (≥0.6) and duration (25–90s), sort by confidence, return top N. |
| `src/app/api/videos/[id]/generate-clips/route.ts` | POST handler: calls `generateClipsFromTranscript(videoId, { maxClips: 10 })`, returns clips JSON. |
| `src/app/api/videos/[id]/transcript/route.ts` | GET: returns stored transcript + segments (from `segmentTranscript`) for the “View transcript” UI. |
| `src/worker/transcriptionWorker.ts` | After transcription completes, calls `generateClipsFromTranscript` and queues render jobs for each new clip. |

---

*Last updated: 2025 (pipeline as implemented and proposed).*
