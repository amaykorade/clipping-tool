# Clipflow: Clip Generation Pipeline

This document describes **what we currently implement** and **what we recommend implementing** so that generated shorts feel like human-cut clips suitable for social media (Reels, TikTok, YouTube Shorts).

---

## Table of Contents

1. [Current Implementation](#current-implementation)
2. [Recommended (Proper) Approach](#recommended-proper-approach)
3. [File Reference](#file-reference)

---

## Current Implementation

### Overview

We build clip **candidates** from runs of consecutive sentences (25–70s, 1–6 sentences), send them to an LLM to pick the best ~10, snap results back to those candidates, filter by confidence and duration, then save and render. There is **no** semantic segmentation (topic/beat detection), **no** refinement pass (trim start/end), and **no** explicit hook/payoff or one-idea gates.

### Step 1: Transcript

- **Where:** Worker runs AssemblyAI transcription; we store `transcript.words` (with start/end in seconds) and `transcript.sentences` (built in `transcription.ts` by splitting on `. ! ?` and Hindi `।` / `॥`).
- **What we do:** Use words and sentences for timing and boundaries. Sentence boundaries are **punctuation-only**; we do not detect “topic change” or “beat.”
- **What we don’t do:** No use of long pauses or speaker labels for semantic boundaries.

### Step 2: Build Clip Candidates

- **Where:** `src/lib/video/generateClipsFromTranscript.ts`
- **What we do:**
  - Take the ordered list of sentences from the transcript.
  - For every starting sentence index `i`, try runs “sentences i to j” for j = i, i+1, … up to 6 sentences.
  - Keep a run **only if**:
    - Duration is between **25–70 seconds**,
    - The **last sentence** ends with sentence punctuation (`. ! ?` and `؟` `۔` for Urdu/Hindi).
  - Cap at **200 candidates**.
- **What we don’t do:** We do **not** segment by topic or “beat.” A candidate can span two ideas (e.g. end of “tip 1” and start of “tip 2”).

### Step 3: Score and Pick Clips

- **Where:** `src/lib/ai/clipScoring.ts` — `scoreAndTitleSegments()`
- **What we do:**
  - One LLM call (e.g. GPT-4o-mini) with a prompt that asks: pick up to N clips; prefer strong hook, one clear idea, good ending; return JSON (startTime, endTime, title, confidence, reason).
  - **Snap** each returned clip to the **nearest** candidate segment (so boundaries are always one of our pre-built runs).
  - **Filter:** Keep only clips with confidence ≥ 0.6 and duration 25–90s; sort by confidence; take top N.
- **What we don’t do:** No separate **hook score** or **payoff score**; no “one clear idea?” gate; no refinement pass to trim start/end.

### Step 4: Save and Render

- **Where:** `generateClipsFromTranscript.ts` creates Clip rows; worker renders via `src/lib/video/clipRenderer.ts` (trim, crop 9:16, upload).
- **What we do:** Persist clips, queue render jobs. No extra quality checks.

### Regeneration

- **Where:** `generateClipsFromTranscript.ts` (start of function)
- **What we do:** If the video already has clips, we **delete** all existing clips for that video, then run the full pipeline again. So “Regenerate Clips” always produces a fresh set from the current logic.

### Summary Table (Current)

| Step | What we do | What we don’t do |
|------|------------|------------------|
| 1. Transcript | Words + sentences (punctuation + Hindi `।`). | No topic/beat detection; no pause/speaker use. |
| 2. Candidates | All 25–70s runs of 1–6 consecutive sentences ending with punctuation; cap 200. | No semantic segmentation; candidates can span two ideas. |
| 3. Selection | One LLM call → pick best ~10 → snap to candidates → filter by confidence + duration. | No hook/payoff score; no refinement; no trailing/opening rules. |
| 4. Output | Save + render. | No one-idea gate; no platform presets. |

---

## Recommended (Proper) Approach

This is the **target pipeline** so clips feel like human-cut shorts: one clear idea, strong hook, clear payoff, no mid-thought or lead-in to the next topic.

### Step 1: Transcript (same + optional enhancements)

- **Keep:** Words and sentences (with punctuation and Hindi `।` / `॥`).
- **Add (optional):**
  - Use **long pauses** between words as a signal for “boundary between ideas.”
  - If **speaker labels** are available (e.g. from AssemblyAI), use them so we can prefer clips that align with one speaker’s turn.

### Step 2: Semantic Segmentation (find “beats” / topics)

- **Do:** Before building clip candidates, run an **LLM (or heuristic) over the transcript** (in chunks if needed) to mark **where the topic or sub-topic changes** (e.g. “intro”, “tip 1: ignore everyone”, “tip 2: outsource”). Output: approximate sentence indices or timestamps for each “chapter” or “beat.”
- **Then:** Build clip candidates **only inside one beat** (or across a single clear beat boundary). So each candidate is “one idea” by design.

**Gap vs current:** Today we have no notion of “beat”; we use any 25–70s run. Proper: candidates = meaningful chunks (one topic/beat).

### Step 3: Build Candidates (same idea, better boundaries)

- **Do:** Still use runs of consecutive sentences (e.g. 25–70s, ends with punctuation), but **only within** the segments from Step 2. Optionally prefer start/end near long pauses or speaker turns.
- **Gap vs current:** Candidates are “all valid runs in the whole video” → should be “all valid runs **within** each beat.”

### Step 4: Score + Hook/Payoff + One-Idea Gate

- **Do:**
  - **First call (like now):** “From these candidates, pick the best ~10; prefer strong hook, one idea, good ending.” Get a shortlist.
  - **Second pass (new):** For each shortlisted clip, ask: “Rate 1–10: strength of **opening as a hook**; strength of **ending as a payoff**.” Drop clips that don’t meet a minimum (e.g. hook ≥ 6, payoff ≥ 6).
  - **Gate:** “Does this clip convey **one clear, complete idea** that makes sense on its own? Yes/No.” Keep only Yes.

**Gap vs current:** We only ask for “hook + one idea + good ending” once; we don’t enforce hook/payoff scores or a one-idea gate.

### Step 5: Refinement Pass (trim start/end)

- **Do:** For each kept clip (e.g. sentences 12–18), ask the LLM: “If the first 1–2 sentences are setup with no hook, give a new **start** sentence index. If the last 1–2 sentences are transition to the next topic, give a new **end** sentence index.” Then **re-cut** the clip to that tighter range (recompute startTime/endTime from sentence timestamps).

**Gap vs current:** We never trim; we only snap to pre-built runs. Proper: we refine so we don’t end on “So next…” or start with “So, anyway…”.

### Step 6: Trailing/Opening Phrase Rules

- **Do:**
  - **Bad clip endings:** If the last sentence **starts** with phrases like “So next”, “Number two”, “And then”, “Second,” “First,” “सुनो”, “फिर” → treat as transition; either **reject** that clip or run refinement to **trim the last sentence**.
  - **Weak openings:** If the first sentence starts with “So”, “Anyway”, “As I was saying” → down-rank or ask the model to suggest a later start.

**Gap vs current:** We have no such rules.

### Step 7: Save and Render (same)

- **Do:** Same as now — save final clips, worker renders 9:16. Optionally add **platform presets** (e.g. TikTok vs Shorts vs Reels) with different min/max length and strictness.

### Summary Table (Proper)

| Step | Current | Proper |
|------|--------|--------|
| 1. Transcript | Words + sentences (punctuation + Hindi). | Same + use pauses/speakers where available. |
| 2. Segmentation | None. | **Semantic:** find topic/beat boundaries; build candidates **only inside** those. |
| 3. Candidates | All 25–70s runs of 1–6 sentences (anywhere). | Same length rules, but **only within** each beat. |
| 4. Selection | One LLM call → pick ~10 → snap → filter by confidence + duration. | Same **plus** explicit **hook score** and **payoff score**; **one-idea** gate. |
| 5. Refinement | None. | **Trim pass:** LLM suggests “start at sentence X, end at sentence Y” → re-cut. |
| 6. Rules | None. | **Trailing/opening rules:** reject or trim “So next…”, “Number two…”, “So, anyway…”. |
| 7. Output | Save + render. | Same; optionally platform presets. |

### One-Line Takeaway

- **Current:** We pick “best” among **time-based sentence runs** with one LLM call and no refinement, so clips can still mix ideas or end on a transition.
- **Proper:** We **first** find **idea-boundaries** (beats), build candidates **inside** those, then **score + enforce hook/payoff + one-idea**, **refine** start/end, and **apply** simple rules so each clip is one clear, postable short.

---

## File Reference

| File | Role |
|------|------|
| `src/lib/video/generateClipsFromTranscript.ts` | Loads transcript, builds sentence-run candidates (25–70s, 1–6 sentences, end with punctuation), calls scoring, deletes old clips on regenerate, saves new clips. |
| `src/lib/ai/clipScoring.ts` | `scoreAndTitleSegments()`: one LLM call to pick best clips from candidates; snap to nearest segment; filter by confidence (≥0.6) and duration (25–90s); prompt stresses hook, one idea, good ending. |
| `src/lib/ai/clipSegmentation.ts` | Sentence-boundary segmentation (used e.g. for transcript API); supports Hindi `।` `॥`; not used in the main clip candidate build (candidates are built in generateClipsFromTranscript from raw sentences). |
| `src/lib/ai/transcription.ts` | AssemblyAI transcription; builds sentences with `. ! ?` and Hindi `।` `॥`; optional audio extraction fallback when provider says “no audio.” |
| `src/app/api/videos/[id]/generate-clips/route.ts` | POST handler; calls `generateClipsFromTranscript(videoId)` and returns clips JSON. |
| `src/app/api/videos/[id]/transcript/route.ts` | GET transcript + segments (from segmentTranscript) for the “View transcript” UI. |
| `src/worker/transcriptionWorker.ts` | After transcription, calls `generateClipsFromTranscript` and queues render jobs for each new clip. |

---

*Last updated to reflect the pipeline as of the conversation that produced this doc. When implementing the “proper” steps, update this file to match.*
