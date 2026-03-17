"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useEditorState, type TranscriptWord, type AspectRatio, type CropMode } from "./useEditorState";
import { usePlaybackSync } from "./usePlaybackSync";
import { useWaveform } from "./useWaveform";
import { VideoPreview } from "./VideoPreview";
import { EditorControls } from "./EditorControls";
import { Timeline } from "./Timeline";
import { CaptionEditor } from "./CaptionEditor";
import { CaptionStylePicker } from "./CaptionStylePicker";
import { CaptionColorPicker } from "./CaptionColorPicker";
import { AspectRatioPicker } from "./AspectRatioPicker";
import { CropModePicker } from "./CropModePicker";
import type { CaptionStyleId } from "./captionStyles";

// ---- Types matching the editor-data API response ----

interface EditorClipData {
  id: string;
  title: string;
  startTime: number;
  endTime: number;
  editedStartTime: number | null;
  editedEndTime: number | null;
  captionStyle: string | null;
  captionEdits: Record<string, string> | null;
  captionPositionX: number | null;
  captionPositionY: number | null;
  captionScale: number | null;
  captionColor: string | null;
  aspectRatio: AspectRatio;
  cropMode: CropMode;
  confidence: number | null;
  status: string;
  outputUrl: string | null;
}

interface EditorVideoData {
  id: string;
  duration: number;
  storageUrl: string | null;
}

interface EditorApiResponse {
  clip: EditorClipData;
  video: EditorVideoData;
  words: TranscriptWord[];
  paddingStart: number;
  paddingEnd: number;
}

// ---- Props ----

interface ClipEditorProps {
  clipId: string;
  videoId: string;
}

// ---- Component ----

export function ClipEditor({ clipId, videoId }: ClipEditorProps) {
  const { showToast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [state, dispatch] = useEditorState();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [rendering, setRendering] = useState(false);
  const [clipTitle, setClipTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [clipOutputUrl, setClipOutputUrl] = useState<string | null>(null);
  const [renderPending, setRenderPending] = useState(false);
  const [paddingRange, setPaddingRange] = useState({ start: 0, end: 0 });

  // Fetch editor data
  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        const res = await fetch(`/api/clips/${encodeURIComponent(clipId)}/editor-data`);
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error ?? `Failed to load editor data (${res.status})`);
        }
        const data: EditorApiResponse = await res.json();

        if (cancelled) return;

        setClipTitle(data.clip.title);
        setVideoUrl(data.video.storageUrl ?? "");
        setClipOutputUrl(data.clip.outputUrl ?? null);
        setPaddingRange({ start: data.paddingStart, end: data.paddingEnd });

        dispatch({
          type: "INIT",
          data: {
            startTime: data.clip.editedStartTime ?? data.clip.startTime,
            endTime: data.clip.editedEndTime ?? data.clip.endTime,
            words: data.words,
            captionStyle: data.clip.captionStyle ?? "modern",
            captionLayout: {
              positionX: data.clip.captionPositionX ?? 50,
              positionY: data.clip.captionPositionY ?? 85,
              scale: data.clip.captionScale ?? 1,
              activeColor: data.clip.captionColor ?? "#c084fc",
            },
            aspectRatio: data.clip.aspectRatio,
            cropMode: data.clip.cropMode ?? "FILL",
            wordEdits: (data.clip.captionEdits as Record<string, string>) ?? {},
          },
        });

        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError((err as Error).message);
          setLoading(false);
        }
      }
    }

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [clipId, dispatch]);

  // Playback sync
  const { toggle, seekTo } = usePlaybackSync({
    videoRef,
    dispatch,
    startTime: state.startTime,
    endTime: state.endTime,
    isPlaying: state.isPlaying,
  });

  // Waveform
  const { peaks } = useWaveform(videoId, paddingRange.start, paddingRange.end);

  // Trim change handler
  const handleTrimChange = useCallback(
    (start: number, end: number) => {
      dispatch({ type: "SET_TRIM", startTime: start, endTime: end });
    },
    [dispatch],
  );

  // Save handler: saves edits and triggers re-render in one step
  const handleRerender = useCallback(async () => {
    setRendering(true);
    try {
      // Save edits first
      const saveRes = await fetch(`/api/clips/${encodeURIComponent(clipId)}/edit`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          editedStartTime: state.startTime,
          editedEndTime: state.endTime,
          captionStyle: state.captionStyle,
          captionEdits: state.wordEdits,
          captionPositionX: state.captionLayout.positionX,
          captionPositionY: state.captionLayout.positionY,
          captionScale: state.captionLayout.scale,
          captionColor: state.captionLayout.activeColor,
          aspectRatio: state.aspectRatio,
          cropMode: state.cropMode,
        }),
      });

      if (!saveRes.ok) {
        const body = await saveRes.json().catch(() => null);
        throw new Error(body?.error ?? "Save failed before rendering");
      }

      // Trigger render
      const renderRes = await fetch(
        `/api/clips/${encodeURIComponent(clipId)}/render`,
        { method: "POST" },
      );

      if (!renderRes.ok) {
        const body = await renderRes.json().catch(() => null);
        throw new Error(body?.error ?? "Render request failed");
      }

      showToast("success", "Clip is being re-rendered with your edits.");

      // Hide download button — old render is now stale
      setClipOutputUrl(null);
      setRenderPending(true);

      // Reset dirty state
      dispatch({
        type: "INIT",
        data: {
          startTime: state.startTime,
          endTime: state.endTime,
          words: state.originalWords,
          captionStyle: state.captionStyle,
          captionLayout: state.captionLayout,
          aspectRatio: state.aspectRatio,
          cropMode: state.cropMode,
          wordEdits: state.wordEdits,
        },
      });
    } catch (err) {
      showToast("error", (err as Error).message);
    } finally {
      setRendering(false);
    }
  }, [clipId, state, dispatch, showToast]);

  // Reset to original handler: clear all edits in DB and state
  const [resetting, setResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const handleReset = useCallback(async () => {
    setResetting(true);
    try {
      const res = await fetch(`/api/clips/${encodeURIComponent(clipId)}/edit`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          editedStartTime: state.originalStartTime,
          editedEndTime: state.originalEndTime,
          captionStyle: "modern",
          captionEdits: {},
          aspectRatio: "VERTICAL",
          cropMode: "FILL",
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Reset failed");
      }
      dispatch({ type: "RESET" });
      showToast("success", "Clip restored to original");
    } catch (err) {
      showToast("error", (err as Error).message);
    } finally {
      setResetting(false);
    }
  }, [clipId, state.originalStartTime, state.originalEndTime, dispatch, showToast]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ignore if user is typing in an input
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key === " ") {
        e.preventDefault();
        toggle();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        seekTo(state.currentTime - 1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        seekTo(state.currentTime + 1);
      } else if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        dispatch({ type: "UNDO" });
      } else if (
        (e.metaKey || e.ctrlKey) && e.key === "z" && e.shiftKey
      ) {
        e.preventDefault();
        dispatch({ type: "REDO" });
      } else if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleRerender();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggle, seekTo, state.currentTime, dispatch, handleRerender]);

  // Poll for render completion when a re-render is pending
  useEffect(() => {
    if (!renderPending) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/clips/${encodeURIComponent(clipId)}/editor-data`);
        if (!res.ok) return;
        const data: EditorApiResponse = await res.json();
        if (data.clip.status === "COMPLETED" && data.clip.outputUrl) {
          setClipOutputUrl(data.clip.outputUrl);
          setRenderPending(false);
          showToast("success", "Clip rendered! You can now download it.");
        } else if (data.clip.status === "ERROR") {
          setRenderPending(false);
          showToast("error", "Rendering failed. Please try again.");
        }
      } catch { /* ignore polling errors */ }
    }, 5000);
    return () => clearInterval(interval);
  }, [renderPending, clipId, showToast]);

  // ---- Loading / Error states ----

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-700 border-t-transparent dark:border-purple-500" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Loading editor...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300">
          {error}
        </div>
      </div>
    );
  }

  // ---- Main layout ----

  return (
    <div className="flex flex-col gap-4">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={`/videos/${videoId}`}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5L8.25 12l7.5-7.5"
            />
          </svg>
          Back
        </Link>

        <h1 className="flex-1 truncate text-lg font-semibold text-slate-900 dark:text-slate-100">
          {clipTitle}
        </h1>

        <div className="flex items-center gap-2">
          {/* Undo */}
          <button
            type="button"
            onClick={() => dispatch({ type: "UNDO" })}
            disabled={state.undoStack.length === 0}
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
            aria-label="Undo"
            title="Undo (Ctrl+Z)"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
            </svg>
          </button>

          {/* Redo */}
          <button
            type="button"
            onClick={() => dispatch({ type: "REDO" })}
            disabled={state.redoStack.length === 0}
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
            aria-label="Redo"
            title="Redo (Ctrl+Shift+Z)"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" />
            </svg>
          </button>

          {/* Reset to original */}
          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            disabled={resetting || !state.isDirty}
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-30 dark:text-slate-400 dark:hover:bg-red-950/30 dark:hover:text-red-400"
            aria-label="Reset to original"
            title="Reset all edits to original"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3" />
            </svg>
          </button>

          <div className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-700" />

          {/* Save — saves edits + triggers re-render */}
          <button
            type="button"
            onClick={handleRerender}
            disabled={rendering || renderPending || !state.isDirty}
            className="relative inline-flex items-center gap-1.5 rounded-lg bg-purple-700 px-4 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-purple-600 disabled:opacity-50 dark:bg-purple-600 dark:hover:bg-purple-500"
          >
            {rendering ? (
              <>
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Saving...
              </>
            ) : (
              "Save"
            )}
            {state.isDirty && !rendering && (
              <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-amber-400" />
            )}
          </button>

          {/* Download / Rendering status */}
          {renderPending ? (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-1.5 text-sm font-medium text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-amber-600 border-t-transparent dark:border-amber-400" />
              Rendering...
            </span>
          ) : state.isDirty ? (
            <span className="px-2 text-xs text-slate-400 dark:text-slate-500">
              Save to apply changes
            </span>
          ) : clipOutputUrl ? (
            <a
              href={`/api/clips/${encodeURIComponent(clipId)}/download`}
              download
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Download
            </a>
          ) : null}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: Video + Controls */}
        <div className="flex flex-col gap-2">
          <VideoPreview
            ref={videoRef}
            videoUrl={videoUrl}
            currentTime={state.currentTime}
            startTime={state.startTime}
            endTime={state.endTime}
            words={state.originalWords}
            wordEdits={state.wordEdits}
            captionStyle={state.captionStyle}
            captionLayout={state.captionLayout}
            aspectRatio={state.aspectRatio}
            cropMode={state.cropMode}
            onCaptionLayoutChange={(layout) =>
              dispatch({ type: "SET_CAPTION_LAYOUT", layout })
            }
          />
          <EditorControls
            isPlaying={state.isPlaying}
            currentTime={state.currentTime}
            startTime={state.startTime}
            endTime={state.endTime}
            onToggle={toggle}
            onSeekTo={seekTo}
          />
        </div>

        {/* Right: Caption Editor + Style + Aspect Ratio */}
        <div className="flex flex-col gap-4">
          {/* Caption Editor */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
              Captions
            </h3>
            <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
              Click any word to edit. Active word highlights during playback.
            </p>
            <CaptionEditor
              words={state.originalWords}
              wordEdits={state.wordEdits}
              startTime={state.startTime}
              endTime={state.endTime}
              currentTime={state.currentTime}
              onEditWord={(index, text) =>
                dispatch({ type: "EDIT_WORD", index: String(index), text })
              }
            />
          </div>

          {/* Caption Style Picker */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
              Caption Style
            </h3>
            <CaptionStylePicker
              selectedStyle={state.captionStyle}
              onStyleChange={(style: CaptionStyleId) =>
                dispatch({ type: "SET_CAPTION_STYLE", style })
              }
            />
            <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-700">
              <CaptionColorPicker
                selectedColor={state.captionLayout.activeColor}
                onChange={(color) =>
                  dispatch({
                    type: "SET_CAPTION_LAYOUT",
                    layout: { ...state.captionLayout, activeColor: color },
                  })
                }
              />
            </div>
          </div>

          {/* Aspect Ratio Picker */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
              Aspect Ratio
            </h3>
            <AspectRatioPicker
              selected={state.aspectRatio}
              onChange={(ratio) =>
                dispatch({ type: "SET_ASPECT_RATIO", aspectRatio: ratio })
              }
            />
          </div>

          {/* Crop Mode Picker (only for non-landscape ratios) */}
          {state.aspectRatio !== "LANDSCAPE" && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
              <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                Crop Mode
              </h3>
              <CropModePicker
                selected={state.cropMode}
                onChange={(mode) =>
                  dispatch({ type: "SET_CROP_MODE", cropMode: mode })
                }
              />
            </div>
          )}

          {/* Clip info card */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
              Clip Info
            </h3>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
              <dt className="text-slate-500 dark:text-slate-400">Duration</dt>
              <dd className="font-mono tabular-nums text-slate-900 dark:text-slate-100">
                {(state.endTime - state.startTime).toFixed(1)}s
              </dd>
              <dt className="text-slate-500 dark:text-slate-400">Aspect Ratio</dt>
              <dd className="text-slate-900 dark:text-slate-100">
                {state.aspectRatio === "VERTICAL"
                  ? "9:16"
                  : state.aspectRatio === "SQUARE"
                    ? "1:1"
                    : "16:9"}
              </dd>
              <dt className="text-slate-500 dark:text-slate-400">Caption Style</dt>
              <dd className="capitalize text-slate-900 dark:text-slate-100">
                {state.captionStyle}
              </dd>
              <dt className="text-slate-500 dark:text-slate-400">Edited Words</dt>
              <dd className="text-slate-900 dark:text-slate-100">
                {Object.keys(state.wordEdits).length}
              </dd>
            </dl>
          </div>
        </div>
      </div>

      {/* Bottom: Timeline (full width) */}
      <Timeline
        rangeStart={paddingRange.start}
        rangeEnd={paddingRange.end}
        startTime={state.startTime}
        endTime={state.endTime}
        currentTime={state.currentTime}
        peaks={peaks}
        onTrimChange={handleTrimChange}
        onSeek={seekTo}
      />

      {/* Reset confirmation dialog */}
      <ConfirmDialog
        open={showResetConfirm}
        title="Reset all edits?"
        message="This will restore the clip to its original AI-generated state. All your changes will be lost."
        confirmLabel="Reset"
        variant="danger"
        onConfirm={() => {
          setShowResetConfirm(false);
          handleReset();
        }}
        onCancel={() => setShowResetConfirm(false)}
      />
    </div>
  );
}
