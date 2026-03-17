"use client";

import { forwardRef, useMemo, useRef, useCallback, useState, useEffect } from "react";
import type { TranscriptWord, AspectRatio, CropMode, CaptionLayout } from "./useEditorState";
import { getCaptionStyleDef } from "./captionStyles";

const ASPECT_CLASSES: Record<AspectRatio, string> = {
  VERTICAL: "aspect-[9/16]",
  SQUARE: "aspect-square",
  LANDSCAPE: "aspect-[16/9]",
};

interface VideoPreviewProps {
  videoUrl: string;
  currentTime: number;
  startTime: number;
  endTime: number;
  words: TranscriptWord[];
  wordEdits: Record<string, string>;
  captionStyle: string;
  captionLayout: CaptionLayout;
  aspectRatio: AspectRatio;
  cropMode?: CropMode;
  onCaptionLayoutChange: (layout: CaptionLayout) => void;
}

const WORDS_PER_GROUP = 4;

export const VideoPreview = forwardRef<HTMLVideoElement, VideoPreviewProps>(
  function VideoPreview(
    {
      videoUrl,
      currentTime,
      startTime,
      endTime,
      words,
      wordEdits,
      captionStyle,
      captionLayout,
      aspectRatio,
      cropMode = "FILL",
      onCaptionLayoutChange,
    },
    ref,
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const bgVideoRef = useRef<HTMLVideoElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const isFit = cropMode === "FIT";

    // Sync background video currentTime with main video
    useEffect(() => {
      if (!isFit) return;
      const mainVideo = (ref as React.RefObject<HTMLVideoElement | null>)?.current;
      const bgVideo = bgVideoRef.current;
      if (!mainVideo || !bgVideo) return;

      const syncTime = () => {
        if (bgVideo && Math.abs(bgVideo.currentTime - mainVideo.currentTime) > 0.1) {
          bgVideo.currentTime = mainVideo.currentTime;
        }
      };

      mainVideo.addEventListener("timeupdate", syncTime);
      mainVideo.addEventListener("seeked", syncTime);
      return () => {
        mainVideo.removeEventListener("timeupdate", syncTime);
        mainVideo.removeEventListener("seeked", syncTime);
      };
    }, [isFit, ref]);
    const dragStartRef = useRef({ x: 0, y: 0, layoutX: 0, layoutY: 0 });

    const clipWords = useMemo(
      () =>
        words
          .map((w, i) => ({ ...w, globalIndex: i }))
          .filter((w) => w.start >= startTime && w.end <= endTime),
      [words, startTime, endTime],
    );

    const { groupWords, activeWordIdx } = useMemo(() => {
      let activeIdx = -1;
      for (let i = clipWords.length - 1; i >= 0; i--) {
        if (
          currentTime >= clipWords[i].start &&
          currentTime <= clipWords[i].end + 0.15
        ) {
          activeIdx = i;
          break;
        }
      }
      if (activeIdx === -1) {
        for (let i = 0; i < clipWords.length; i++) {
          if (clipWords[i].start > currentTime) {
            activeIdx = Math.max(0, i - 1);
            break;
          }
        }
      }
      if (activeIdx === -1 && clipWords.length > 0) {
        activeIdx = clipWords.length - 1;
      }

      const groupStart =
        Math.floor(activeIdx / WORDS_PER_GROUP) * WORDS_PER_GROUP;
      const group = clipWords.slice(groupStart, groupStart + WORDS_PER_GROUP);

      return {
        groupWords: group,
        activeWordIdx: activeIdx - groupStart,
      };
    }, [clipWords, currentTime]);

    const styleDef = getCaptionStyleDef(captionStyle);

    // Drag handlers for caption repositioning
    const handlePointerDown = useCallback(
      (e: React.PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const target = e.currentTarget as HTMLElement;
        target.setPointerCapture(e.pointerId);
        setIsDragging(true);
        dragStartRef.current = {
          x: e.clientX,
          y: e.clientY,
          layoutX: captionLayout.positionX,
          layoutY: captionLayout.positionY,
        };
      },
      [captionLayout.positionX, captionLayout.positionY],
    );

    const handlePointerMove = useCallback(
      (e: React.PointerEvent) => {
        if (!isDragging || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const dx = ((e.clientX - dragStartRef.current.x) / rect.width) * 100;
        const dy = ((e.clientY - dragStartRef.current.y) / rect.height) * 100;
        const newX = Math.max(5, Math.min(95, dragStartRef.current.layoutX + dx));
        const newY = Math.max(5, Math.min(95, dragStartRef.current.layoutY + dy));
        onCaptionLayoutChange({
          ...captionLayout,
          positionX: Math.round(newX * 10) / 10,
          positionY: Math.round(newY * 10) / 10,
        });
      },
      [isDragging, captionLayout, onCaptionLayoutChange],
    );

    const handlePointerUp = useCallback(() => {
      setIsDragging(false);
    }, []);

    // Scroll to resize captions
    const handleWheel = useCallback(
      (e: React.WheelEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const delta = e.deltaY > 0 ? -0.05 : 0.05;
        const newScale = Math.max(0.5, Math.min(2.0, captionLayout.scale + delta));
        onCaptionLayoutChange({
          ...captionLayout,
          scale: Math.round(newScale * 100) / 100,
        });
      },
      [captionLayout, onCaptionLayoutChange],
    );

    return (
      <div
        ref={containerRef}
        className={`relative mx-auto overflow-hidden rounded-xl bg-black ${ASPECT_CLASSES[aspectRatio]}`}
        style={{ maxHeight: "70vh" }}
      >
        {/* Blurred background video (Fit mode only) */}
        {isFit && (
          <video
            ref={bgVideoRef}
            src={videoUrl}
            className="absolute inset-0 h-full w-full scale-110 object-cover blur-xl brightness-50"
            playsInline
            preload="metadata"
            muted
          />
        )}

        <video
          ref={ref}
          src={videoUrl}
          className={`h-full w-full ${isFit ? "relative z-10 object-contain" : "object-cover"}`}
          playsInline
          preload="metadata"
          muted={false}
        />

        {/* Caption overlay — draggable and resizable */}
        {groupWords.length > 0 && captionStyle !== "none" && (
          <div
            className={`absolute ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
            style={{
              left: `${captionLayout.positionX}%`,
              top: `${captionLayout.positionY}%`,
              transform: `translate(-50%, -50%) scale(${captionLayout.scale})`,
              transformOrigin: "center center",
              whiteSpace: "nowrap",
              zIndex: 10,
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onWheel={handleWheel}
          >
            <div
              className={`${styleDef.containerClass} ${isDragging ? "ring-2 ring-purple-500 ring-offset-1" : "hover:ring-1 hover:ring-white/30"} transition-shadow`}
            >
              {groupWords.map((word, i) => {
                const displayText =
                  wordEdits[String(word.globalIndex)] ?? word.text;
                const isActive = i === activeWordIdx;
                return (
                  <span
                    key={`${word.start}-${i}`}
                    className={`transition-all duration-100 ${
                      isActive
                        ? styleDef.activeWordClass
                        : styleDef.inactiveWordClass
                    }`}
                    style={isActive ? { color: captionLayout.activeColor } : undefined}
                  >
                    {i > 0 ? " " : ""}
                    {displayText}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Hint text */}
        {groupWords.length > 0 && captionStyle !== "none" && !isDragging && (
          <div className="pointer-events-none absolute bottom-1 left-1/2 -translate-x-1/2 rounded bg-black/50 px-2 py-0.5 text-[10px] text-white/50">
            Drag to move &middot; Scroll to resize
          </div>
        )}
      </div>
    );
  },
);
