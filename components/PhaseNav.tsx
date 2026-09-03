"use client";

import { useEffect, useState } from "react";

import { LAST_PHASE, PHASES, phaseById } from "@/lib/phases.ts";
import { useSimStore } from "@/store/useSimStore.ts";

const COPY = {
  tr: {
    phase: "FAZ",
    planned: "planlandı",
    hint: "← → gez · 1–0 atla · F final · H not kartı · Esc çık",
  },
  en: {
    phase: "PHASE",
    planned: "planned",
    hint: "← → step · 1-0 jump · F final · H notes · Esc exit",
  },
} as const;

/** True when a keystroke belongs to a control rather than the walkthrough. */
function typingInAControl(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  // The time slider's thumb takes arrow keys for scrubbing; stepping the
  // walkthrough out from under the user's hand would be worse than useless.
  if (el.getAttribute("role") === "slider") return true;
  return el instanceof HTMLElement && el.isContentEditable;
}

/**
 * The phase walkthrough, driven entirely from the keyboard.
 *
 * Deliberately has no launcher button and no permanent bar: during a live
 * demonstration the audience should see the application, not the scaffolding
 * used to step through it. The presenter gets a small corner marker that fades
 * after a moment, and can summon the full speaker notes with `H` when needed.
 *
 * Entry is a number key: the demo does not need to be "opened" first.
 */
export default function PhaseNav() {
  const phase = useSimStore((s) => s.phase);
  const lang = useSimStore((s) => s.lang);
  const setPhase = useSimStore((s) => s.setPhase);
  const stepPhase = useSimStore((s) => s.stepPhase);

  /** Speaker notes, off by default and toggled with H. */
  const [notes, setNotes] = useState(false);

  const t = COPY[lang];

  /**
   * Presentation keys.
   *
   * Bound on the window rather than a focused element: during a live demo focus
   * sits wherever the last click left it, and a walkthrough that only responds
   * while one specific button is focused is not usable on stage.
   */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (typingInAControl(document.activeElement)) return;

      if (e.key === "ArrowRight") {
        e.preventDefault();
        stepPhase(1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        stepPhase(-1);
      } else if (e.key === "Escape") {
        if (notes) {
          e.preventDefault();
          setNotes(false);
        } else if (phase !== null) {
          e.preventDefault();
          setPhase(null);
        }
      } else if (e.key === "f" || e.key === "F") {
        // The finale, reachable from anywhere - including with the demo closed,
        // which is how it will actually be used on stage.
        e.preventDefault();
        setPhase(LAST_PHASE);
      } else if (e.key === "h" || e.key === "H") {
        // Only meaningful inside the walkthrough; outside it, leave H alone.
        if (phase !== null) {
          e.preventDefault();
          setNotes((v) => !v);
        }
      } else if (/^[0-9]$/.test(e.key)) {
        // 1-9 select phases 1-9; 0 is phase 10, following the keyboard's order.
        e.preventDefault();
        setPhase(e.key === "0" ? 10 : Number(e.key));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, notes, setPhase, stepPhase]);

  if (phase === null) return null;

  const current = phaseById(phase);
  if (!current) return null;

  const title = lang === "tr" ? current.titleTr : current.titleEn;
  const summary = lang === "tr" ? current.summaryTr : current.summaryEn;
  const points = lang === "tr" ? current.pointsTr : current.pointsEn;

  return (
    <>
      {/*
        Corner marker. Bottom-left, small and low-contrast: legible to a
        presenter who knows it is there, easy to miss from across a room.
        aria-live is deliberately absent — a screen reader announcing "phase 5"
        on every step would be noise, and the notes panel carries the same text.
      */}
      <div
        // Remounting on every phase change restarts the fade animation, which
        // replaces the state + timer this used to need.
        key={phase}
        className={
          "pointer-events-none fixed bottom-3 left-3 z-40 font-mono text-[10px] tracking-[0.2em] text-slate-500 " +
          (notes ? "opacity-70" : "marker-flash")
        }
        aria-hidden
      >
        {String(phase).padStart(2, "0")}/{PHASES.length}
      </div>

      {/* Speaker notes, summoned with H. */}
      {notes && (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-40 flex justify-center px-4">
          <section
            className="glass pointer-events-auto w-[30rem] max-w-full rounded-xl p-3 shadow-2xl shadow-black/50"
            aria-label={`${t.phase} ${phase}: ${title}`}
          >
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-[10px] tracking-[0.18em] text-slate-500">
                {t.phase} {String(phase).padStart(2, "0")} / {PHASES.length}
              </span>
              {current.status === "planned" && (
                <span className="rounded-full bg-amber-400/15 px-1.5 py-px text-[9px] tracking-wide text-amber-300 uppercase">
                  {t.planned}
                </span>
              )}
            </div>

            <h2 className="text-foreground mt-0.5 text-sm font-medium">
              {title}
            </h2>

            <ol className="mt-2 flex items-center gap-1" aria-hidden>
              {PHASES.map((p) => (
                <li
                  key={p.id}
                  className={
                    "h-1 flex-1 rounded-full " +
                    (p.id === phase
                      ? "bg-neon-cyan"
                      : p.id < phase
                        ? "bg-neon-cyan/35"
                        : "bg-slate-700/60")
                  }
                />
              ))}
            </ol>

            <p className="mt-2 text-[11px] leading-snug text-slate-400">
              {summary}
            </p>

            <ul className="mt-2 flex flex-col gap-1 border-t border-slate-800/50 pt-2">
              {points.map((point) => (
                <li
                  key={point}
                  className="flex gap-1.5 text-[11px] leading-snug text-slate-400"
                >
                  <span className="text-neon-cyan/70 select-none" aria-hidden>
                    ·
                  </span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>

            <p className="mt-2 text-[9px] tracking-wide text-slate-600">
              {t.hint}
            </p>
          </section>
        </div>
      )}
    </>
  );
}
