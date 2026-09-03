/**
 * Playback and view state for the command center.
 *
 * `minute` here is the UI clock: it is written at a throttled rate (see
 * UI_TICK_MS in CommandCenter) so panels and the slider stay legible without
 * re-rendering at 60 Hz. The smooth playhead that feeds the map layers lives in
 * a ref inside the render loop and never passes through React.
 */

import { create } from "zustand";

import { DEFAULT_TOGGLES, type LayerToggles } from "@/lib/layers.ts";
import { LAST_PHASE, clampPhase } from "@/lib/phases.ts";
import type { MetricKey } from "@/lib/simulation.ts";
import { DEFAULT_SERVICE_WEIGHT } from "@/lib/accessibility.ts";

/** Simulated minutes advanced per real second at 1x. A full day takes 4 minutes. */
export const MINUTES_PER_REAL_SECOND = 6;

export const SPEEDS = [1, 4, 16] as const;
export type Speed = (typeof SPEEDS)[number];

export type Lang = "tr" | "en";

interface SimState {
  /** 0-1439. The displayed clock, not the frame-accurate playhead. */
  minute: number;
  playing: boolean;
  speed: Speed;
  lang: Lang;
  /**
   * Bumped only when the user drags the slider.
   *
   * The render loop owns a floating-point playhead and writes `minute` back
   * every tick. Without a separate signal the loop could not tell its own write
   * apart from a user seek, and syncing on `minute` alone would drag the
   * playhead backwards on every frame at high speed.
   */
  seekToken: number;
  /** Which map layers are drawn. Toggling never remounts the map. */
  layers: LayerToggles;
  /**
   * Presentation walkthrough. `null` is the real application; a number shows the
   * project as it stood at the end of that phase, hiding what came later.
   */
  phase: number | null;
  /**
   * Header quick filters. An empty set means "nothing selected" and the map
   * honours that literally - zero flow everywhere - rather than quietly
   * falling back to showing all four.
   */
  metrics: MetricKey[];
  /**
   * 0-1 weight the access score gives to people-per-stop; the rest goes to
   * distance. The reader's dial, not a constant.
   */
  serviceWeight: number;

  /** Called by the render loop. Moves the clock without disturbing the playhead. */
  tickMinute: (minute: number) => void;
  /** Called by the slider. Moves the clock AND repositions the playhead. */
  seekTo: (minute: number) => void;
  togglePlaying: () => void;
  setSpeed: (speed: Speed) => void;
  setLang: (lang: Lang) => void;
  toggleLayer: (key: keyof LayerToggles) => void;
  setPhase: (phase: number | null) => void;
  stepPhase: (delta: number) => void;
  toggleMetric: (metric: MetricKey) => void;
  setServiceWeight: (w: number) => void;
}

/** 08:00 - the passenger peak, so a cold load opens on the busiest network. */
const INITIAL_MINUTE = 8 * 60;

export const useSimStore = create<SimState>((set) => ({
  minute: INITIAL_MINUTE,
  playing: false,
  speed: 1,
  lang: "tr",
  seekToken: 0,
  layers: DEFAULT_TOGGLES,
  phase: null,
  metrics: ["passengers", "freight", "hotel", "traffic"],
  serviceWeight: DEFAULT_SERVICE_WEIGHT,

  tickMinute: (minute) => set({ minute }),
  seekTo: (minute) => set((s) => ({ minute, seekToken: s.seekToken + 1 })),
  togglePlaying: () => set((s) => ({ playing: !s.playing })),
  setSpeed: (speed) => set({ speed }),
  setLang: (lang) => set({ lang }),
  toggleLayer: (key) =>
    set((s) => ({ layers: { ...s.layers, [key]: !s.layers[key] } })),
  setPhase: (phase) => set({ phase: phase === null ? null : clampPhase(phase) }),
  // Stepping while the demo is off starts the walkthrough at the last phase, so
  // one press of the left arrow enters at the finished app and walks backwards.
  stepPhase: (delta) =>
    set((s) => ({
      phase: clampPhase((s.phase ?? LAST_PHASE) + delta),
    })),
  toggleMetric: (metric) =>
    set((s) => ({
      metrics: s.metrics.includes(metric)
        ? s.metrics.filter((m) => m !== metric)
        : [...s.metrics, metric],
    })),
  setServiceWeight: (w) =>
    set({
      // Same NaN trap as in computeAccess: clamping alone lets NaN through.
      serviceWeight: Number.isFinite(w)
        ? Math.min(1, Math.max(0, w))
        : DEFAULT_SERVICE_WEIGHT,
    }),
}));
