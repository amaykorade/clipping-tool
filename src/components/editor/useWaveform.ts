"use client";

import { useEffect, useRef, useState } from "react";

interface UseWaveformResult {
  peaks: number[] | null;
  loading: boolean;
  error: string | null;
}

export function useWaveform(
  videoId: string,
  start: number,
  end: number,
): UseWaveformResult {
  const [state, setState] = useState<UseWaveformResult>({
    peaks: null,
    loading: true,
    error: null,
  });
  const prevKey = useRef("");

  useEffect(() => {
    const key = `${videoId}-${start}-${end}`;
    if (!videoId || key === prevKey.current) return;
    prevKey.current = key;

    let cancelled = false;

    const url = `/api/videos/${encodeURIComponent(videoId)}/waveform?start=${start}&end=${end}&samples=200`;

    fetch(url)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error ?? `Waveform fetch failed (${res.status})`);
        }
        return res.json();
      })
      .then((data) => {
        if (!cancelled) {
          setState({ peaks: data.peaks ?? data, loading: false, error: null });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.warn("[useWaveform] Failed to load waveform:", err.message);
          setState({ peaks: null, loading: false, error: err.message });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [videoId, start, end]);

  return state;
}
