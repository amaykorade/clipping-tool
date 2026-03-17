"use client";

import { useCallback, useEffect, useRef, useMemo, useState } from "react";
import type { TranscriptWord } from "./useEditorState";

interface CaptionEditorProps {
  words: TranscriptWord[];
  wordEdits: Record<string, string>;
  startTime: number;
  endTime: number;
  currentTime: number;
  onEditWord: (index: number, text: string) => void;
}

export function CaptionEditor({
  words,
  wordEdits,
  startTime,
  endTime,
  currentTime,
  onEditWord,
}: CaptionEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeWordRef = useRef<HTMLSpanElement>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Get words within the clip range
  const clipWords = useMemo(
    () =>
      words
        .map((w, i) => ({ ...w, globalIndex: i }))
        .filter((w) => w.start >= startTime && w.end <= endTime),
    [words, startTime, endTime],
  );

  // Find active word index
  const activeGlobalIndex = useMemo(() => {
    for (let i = clipWords.length - 1; i >= 0; i--) {
      if (
        currentTime >= clipWords[i].start &&
        currentTime <= clipWords[i].end + 0.15
      ) {
        return clipWords[i].globalIndex;
      }
    }
    // Between words — find the closest upcoming word
    for (const cw of clipWords) {
      if (cw.start > currentTime) return cw.globalIndex;
    }
    return -1;
  }, [clipWords, currentTime]);

  // Auto-scroll to active word within the caption container only (not the page)
  useEffect(() => {
    const word = activeWordRef.current;
    const container = containerRef.current;
    if (!word || !container) return;

    const wordTop = word.offsetTop;
    const wordHeight = word.offsetHeight;
    const containerHeight = container.clientHeight;
    const scrollTop = container.scrollTop;

    // Only scroll if the active word is outside the visible area of the container
    if (wordTop < scrollTop || wordTop + wordHeight > scrollTop + containerHeight) {
      container.scrollTo({
        top: wordTop - containerHeight / 2 + wordHeight / 2,
        behavior: "smooth",
      });
    }
  }, [activeGlobalIndex]);

  // Focus input when editing starts
  useEffect(() => {
    if (editingIndex !== null) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editingIndex]);

  const handleWordClick = useCallback(
    (globalIndex: number, currentText: string) => {
      setEditingIndex(globalIndex);
      setEditText(currentText);
    },
    [],
  );

  const commitEdit = useCallback(() => {
    if (editingIndex === null) return;
    const originalText = wordEdits[String(editingIndex)] ?? words[editingIndex]?.text ?? "";
    const trimmed = editText.trim();
    if (trimmed !== originalText) {
      // If the user clears the edit to match the original word, pass empty to remove the override
      if (trimmed === words[editingIndex]?.text) {
        onEditWord(editingIndex, "");
      } else {
        onEditWord(editingIndex, trimmed);
      }
    }
    setEditingIndex(null);
  }, [editingIndex, editText, wordEdits, words, onEditWord]);

  const cancelEdit = useCallback(() => {
    setEditingIndex(null);
  }, []);

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        commitEdit();
      } else if (e.key === "Escape") {
        e.preventDefault();
        cancelEdit();
      } else if (e.key === "Tab") {
        e.preventDefault();
        commitEdit();
        // Move to next/previous word
        const currentIdx = clipWords.findIndex((w) => w.globalIndex === editingIndex);
        const nextIdx = e.shiftKey ? currentIdx - 1 : currentIdx + 1;
        if (nextIdx >= 0 && nextIdx < clipWords.length) {
          const nextWord = clipWords[nextIdx];
          const nextText = wordEdits[String(nextWord.globalIndex)] ?? nextWord.text;
          setEditingIndex(nextWord.globalIndex);
          setEditText(nextText);
        }
      }
    },
    [commitEdit, cancelEdit, clipWords, editingIndex, wordEdits],
  );

  if (clipWords.length === 0) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        No caption words in the selected clip range.
      </p>
    );
  }

  return (
    <div
      ref={containerRef}
      className="max-h-[300px] overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900"
    >
      <div className="flex flex-wrap gap-1">
        {clipWords.map((word) => {
          const isActive = word.globalIndex === activeGlobalIndex;
          const isEdited = wordEdits[String(word.globalIndex)] !== undefined;
          const isEditing = editingIndex === word.globalIndex;
          const displayText =
            wordEdits[String(word.globalIndex)] ?? word.text;

          if (isEditing) {
            return (
              <input
                key={word.globalIndex}
                ref={inputRef}
                type="text"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={handleInputKeyDown}
                className="rounded border-2 border-purple-500 bg-white px-1.5 py-0.5 text-sm text-slate-900 shadow-sm outline-none dark:border-purple-400 dark:bg-slate-800 dark:text-slate-100"
                style={{ width: Math.max(40, editText.length * 9 + 16) }}
              />
            );
          }

          return (
            <span
              key={word.globalIndex}
              ref={isActive ? activeWordRef : undefined}
              onClick={() =>
                handleWordClick(word.globalIndex, displayText)
              }
              className={`cursor-pointer rounded px-1 py-0.5 text-sm transition-all ${
                isActive
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-slate-700 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"
              } ${isEdited ? "underline decoration-purple-400 decoration-2 underline-offset-2" : ""}`}
              title={`${formatTime(word.start)} — click to edit`}
            >
              {displayText}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toFixed(1).padStart(4, "0")}`;
}
