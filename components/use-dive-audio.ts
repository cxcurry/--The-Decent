"use client";
import { useCallback, useEffect, useRef } from "react";
import type { DiveEvent } from "@/lib/dive";
import { scheduleDiveSound } from "@/lib/dive-audio";

export function useDiveAudio(enabled: boolean, dive: DiveEvent | null) {
  const audio = useRef<AudioContext | null>(null);
  const played = useRef("");
  const unlock = useCallback(() => {
    try {
      audio.current ??= new AudioContext();
      if (audio.current.state === "suspended")
        void audio.current.resume().catch(() => {});
    } catch {
      /* Visual rewards remain available when audio is unsupported. */
    }
  }, []);
  useEffect(() => {
    if (!dive || played.current === dive.id) return;
    played.current = dive.id;
    // Enabling sound later must not replay an old reward or violate autoplay.
    const context = audio.current;
    if (!enabled || document.hidden || !context || context.state === "closed")
      return;
    let active = true;
    let stop: (() => void) | undefined;
    const hide = () => {
      if (document.hidden) {
        active = false;
        stop?.();
      }
    };
    document.addEventListener("visibilitychange", hide);
    // Resuming a gesture-unlocked context can finish after the answer response.
    // A cleanup guard prevents that promise playing after mute/navigation.
    const ready =
      context.state === "suspended" ? context.resume() : Promise.resolve();
    void ready
      .then(() => {
        if (
          active &&
          !document.hidden &&
          performance.now() - dive.startedAt < 400
        )
          stop = scheduleDiveSound(context, dive.profile);
      })
      .catch(() => {});
    return () => {
      active = false;
      stop?.();
      document.removeEventListener("visibilitychange", hide);
    };
  }, [dive, enabled]);
  useEffect(
    () => () => {
      void audio.current?.close().catch(() => {});
    },
    [],
  );
  return unlock;
}
