"use client";

import { Pause, Play, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { MINUTES_PER_DAY, formatClock, isPeakHour } from "@/lib/simulation.ts";
import { SPEEDS, useSimStore, type Speed } from "@/store/useSimStore.ts";

const COPY = {
  tr: {
    play: "Oynat",
    pause: "Duraklat",
    reset: "Başa sar",
    time: "Simülasyon saati",
    speed: "Oynatma hızı",
    peak: "Yoğun saat",
    offPeak: "Sakin saat",
  },
  en: {
    play: "Play",
    pause: "Pause",
    reset: "Reset",
    time: "Simulation time",
    speed: "Playback speed",
    peak: "Peak hour",
    offPeak: "Off-peak",
  },
} as const;

/**
 * Hour marks under the track. Every third hour keeps narrow widths readable.
 *
 * 24 must be included: the row is laid out with `justify-between`, so the last
 * entry is pinned to the right edge. Ending at 21 would park the 21:00 label at
 * 100% of the track instead of its true 87.5%, skewing every mark before it.
 */
const TICKS = [0, 3, 6, 9, 12, 15, 18, 21, 24];

export default function TimeBar() {
  // Subscribed field by field: a speed change must not re-render on every clock
  // tick, and the clock must not re-render when only `playing` flips.
  const minute = useSimStore((s) => s.minute);
  const playing = useSimStore((s) => s.playing);
  const speed = useSimStore((s) => s.speed);
  const lang = useSimStore((s) => s.lang);
  const seekTo = useSimStore((s) => s.seekTo);
  const togglePlaying = useSimStore((s) => s.togglePlaying);
  const setSpeed = useSimStore((s) => s.setSpeed);

  const t = COPY[lang];
  const peak = isPeakHour(Math.floor(minute / 60));

  return (
    <div className="glass pointer-events-auto rounded-xl px-4 py-3 shadow-2xl shadow-black/40">
      <div className="flex items-center gap-3">
        <Button
          type="button"
          size="icon"
          variant="secondary"
          onClick={togglePlaying}
          aria-label={playing ? t.pause : t.play}
          aria-pressed={playing}
          className="size-9 shrink-0"
        >
          {playing ? (
            <Pause className="size-4" aria-hidden />
          ) : (
            <Play className="size-4" aria-hidden />
          )}
        </Button>

        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => seekTo(0)}
          aria-label={t.reset}
          className="size-9 shrink-0 text-slate-400"
        >
          <RotateCcw className="size-4" aria-hidden />
        </Button>

        <output
          className="text-foreground w-[4.5rem] shrink-0 font-mono text-xl tabular-nums"
          aria-label={t.time}
        >
          {formatClock(minute)}
        </output>

        <span
          className={
            "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase " +
            (peak
              ? "bg-neon-violet/15 text-neon-violet"
              : "bg-slate-700/40 text-slate-400")
          }
        >
          {peak ? t.peak : t.offPeak}
        </span>

        <div className="min-w-0 flex-1 px-1">
          <Slider
            min={0}
            max={MINUTES_PER_DAY - 1}
            step={1}
            value={[minute]}
            onValueChange={([v]) => seekTo(v)}
            aria-label={t.time}
            // Screen readers would otherwise announce "510" instead of "08:30".
            thumbAriaValueText={(v) => formatClock(v)}
          />
          <div
            className="mt-1.5 flex justify-between text-[10px] text-slate-500 tabular-nums"
            aria-hidden
          >
            {TICKS.map((h) => (
              <span key={h}>{String(h).padStart(2, "0")}</span>
            ))}
          </div>
        </div>

        <ToggleGroup
          type="single"
          value={String(speed)}
          // Radix clears the value when the active item is pressed again; keeping
          // the current speed is the sane reading of "deselect the only option".
          onValueChange={(v) => v && setSpeed(Number(v) as Speed)}
          aria-label={t.speed}
          className="shrink-0"
        >
          {SPEEDS.map((s) => (
            <ToggleGroupItem
              key={s}
              value={String(s)}
              aria-label={`${s}x`}
              className="h-8 px-2.5 font-mono text-xs"
            >
              {s}×
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
    </div>
  );
}
