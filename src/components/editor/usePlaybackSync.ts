"use client";

import { useCallback, useEffect, useRef } from "react";
import type { EditorAction } from "./useEditorState";

interface UsePlaybackSyncOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  dispatch: React.Dispatch<EditorAction>;
  startTime: number;
  endTime: number;
  isPlaying: boolean;
}

export function usePlaybackSync({
  videoRef,
  dispatch,
  startTime,
  endTime,
  isPlaying,
}: UsePlaybackSyncOptions) {
  const rafRef = useRef<number>(0);
  const prevStartRef = useRef(startTime);
  const prevEndRef = useRef(endTime);
  const lastDispatchedTime = useRef(0);

  // rAF loop: sync currentTime from video element while playing
  // Throttled to ~10 dispatches/sec to avoid excessive re-renders
  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    const tick = () => {
      const video = videoRef.current;
      if (!video) return;

      const t = video.currentTime;

      if (t >= endTime) {
        video.pause();
        video.currentTime = startTime;
        dispatch({ type: "SET_PLAYING", isPlaying: false });
        dispatch({ type: "SET_CURRENT_TIME", time: startTime });
        return;
      }

      // Only dispatch if time changed by >= 0.1s to reduce re-renders
      if (Math.abs(t - lastDispatchedTime.current) >= 0.1) {
        lastDispatchedTime.current = t;
        dispatch({ type: "SET_CURRENT_TIME", time: t });
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, startTime, endTime, dispatch, videoRef]);

  // When start/end trim changes, seek to new startTime
  useEffect(() => {
    if (
      prevStartRef.current !== startTime ||
      prevEndRef.current !== endTime
    ) {
      prevStartRef.current = startTime;
      prevEndRef.current = endTime;

      const video = videoRef.current;
      if (video) {
        video.currentTime = startTime;
        dispatch({ type: "SET_CURRENT_TIME", time: startTime });
      }
    }
  }, [startTime, endTime, dispatch, videoRef]);

  const play = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    // If at the end, restart from the beginning of the trimmed region
    if (video.currentTime >= endTime || video.currentTime < startTime) {
      video.currentTime = startTime;
    }
    video.play().catch(() => {});
    dispatch({ type: "SET_PLAYING", isPlaying: true });
  }, [videoRef, startTime, endTime, dispatch]);

  const pause = useCallback(() => {
    const video = videoRef.current;
    if (video) video.pause();
    dispatch({ type: "SET_PLAYING", isPlaying: false });
  }, [videoRef, dispatch]);

  const toggle = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const seekTo = useCallback(
    (time: number) => {
      const video = videoRef.current;
      if (!video) return;
      const clamped = Math.max(startTime, Math.min(endTime, time));
      video.currentTime = clamped;
      dispatch({ type: "SET_CURRENT_TIME", time: clamped });
    },
    [videoRef, startTime, endTime, dispatch],
  );

  return { play, pause, toggle, seekTo };
}
