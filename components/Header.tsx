"use client";

import { useEffect, useState } from "react";
import { Building2, Menu, PieChart, Plane, Truck, Users } from "lucide-react";

import type { MetricKey } from "@/lib/simulation.ts";
import { useSimStore, type Lang } from "@/store/useSimStore.ts";

const COPY = {
  tr: {
    title: "ARNAVUTKÖY LOJİSTİK MERKEZİ",
    subtitle: "Gerçek Zamanlı Akış ve Kentsel Analitik",
    live: "SİSTEM ÇEVRİMİÇİ / CANLI VERİ AKIŞI",
    filters: "Hızlı filtreler",
    language: "Dil",
    localTime: "İstanbul yerel saati",
    openLeft: "Göstergeler panelini aç",
    openRight: "Grafikler panelini aç",
    metrics: {
      passengers: "Yolcu",
      freight: "Kargo",
      hotel: "Otel Doluluğu",
      traffic: "Trafik Yoğunluğu",
    },
  },
  en: {
    title: "ARNAVUTKÖY LOGISTICS HUB",
    subtitle: "Real-Time Flow & Urban Analytics",
    live: "SYSTEM ONLINE / LIVE DATA STREAM",
    filters: "Quick filters",
    language: "Language",
    localTime: "Istanbul local time",
    openLeft: "Open indicators panel",
    openRight: "Open charts panel",
    metrics: {
      passengers: "Passengers",
      freight: "Freight",
      hotel: "Hotel Occupancy",
      traffic: "Traffic Density",
    },
  },
} as const;

const METRIC_ORDER: MetricKey[] = ["passengers", "freight", "hotel", "traffic"];

const METRIC_ICONS: Record<MetricKey, React.ReactNode> = {
  passengers: <Plane className="size-3.5" aria-hidden />,
  freight: <Truck className="size-3.5" aria-hidden />,
  hotel: <Building2 className="size-3.5" aria-hidden />,
  traffic: <Users className="size-3.5" aria-hidden />,
};

/**
 * Wall-clock time in Istanbul.
 *
 * Starts as null and fills in after mount on purpose: rendering a clock during
 * SSR bakes the server's instant into the HTML, and React then reports a
 * hydration mismatch when the browser disagrees a second later.
 */
function useIstanbulClock(): string | null {
  const [now, setNow] = useState<string | null>(null);

  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("tr-TR", {
      timeZone: "Europe/Istanbul",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const tick = () => setNow(fmt.format(new Date()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  return now;
}

export default function Header({
  onOpenLeft,
  onOpenRight,
}: {
  onOpenLeft?: () => void;
  onOpenRight?: () => void;
}) {
  const lang = useSimStore((s) => s.lang);
  const setLang = useSimStore((s) => s.setLang);
  const metrics = useSimStore((s) => s.metrics);
  const toggleMetric = useSimStore((s) => s.toggleMetric);

  const t = COPY[lang];
  const clock = useIstanbulClock();

  // The document language must follow the UI, or a screen reader keeps reading
  // Turkish copy with English phonetics (and the other way round).
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <header className="glass pointer-events-auto flex items-center gap-3 rounded-xl px-3 py-2 shadow-2xl shadow-black/40">
      {/* Panel openers, only below the two-column breakpoint. */}
      <div className="flex items-center gap-1 lg:hidden">
        <button
          type="button"
          onClick={onOpenLeft}
          aria-label={t.openLeft}
          className="grid size-8 place-items-center rounded-md border border-slate-800/60 text-slate-400 hover:text-slate-100"
        >
          <Menu className="size-4" aria-hidden />
        </button>
        <button
          type="button"
          onClick={onOpenRight}
          aria-label={t.openRight}
          className="grid size-8 place-items-center rounded-md border border-slate-800/60 text-slate-400 hover:text-slate-100"
        >
          <PieChart className="size-4" aria-hidden />
        </button>
      </div>

      <div className="min-w-0">
        <h1 className="text-foreground truncate text-[13px] leading-tight font-semibold tracking-[0.06em]">
          {t.title}
        </h1>
        <p className="truncate text-[10px] leading-tight text-slate-500">
          {t.subtitle}
        </p>
      </div>

      {/* Live badge. The dot pulses; the words do not, so the label stays legible. */}
      <div className="hidden shrink-0 items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-1 xl:flex">
        <span
          className="bg-live pulse-live size-1.5 shrink-0 rounded-full"
          aria-hidden
        />
        <span className="text-[9px] font-medium tracking-[0.1em] text-emerald-300">
          {t.live}
        </span>
      </div>

      <div className="flex-1" />

      <fieldset
        className="hidden shrink-0 items-center gap-1 md:flex"
        aria-label={t.filters}
      >
        {METRIC_ORDER.map((m) => {
          const on = metrics.includes(m);
          return (
            <button
              key={m}
              type="button"
              onClick={() => toggleMetric(m)}
              aria-pressed={on}
              title={t.metrics[m]}
              className={
                "flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] transition-colors " +
                (on
                  ? "border-neon-cyan/30 bg-neon-cyan/10 text-slate-200"
                  : "border-slate-800/60 bg-slate-950/20 text-slate-500 hover:text-slate-300")
              }
            >
              <span className={on ? "text-neon-cyan" : "text-slate-600"}>
                {METRIC_ICONS[m]}
              </span>
              <span className="hidden lg:inline">{t.metrics[m]}</span>
            </button>
          );
        })}
      </fieldset>

      {/* Real Istanbul time, distinct from the simulated clock in the time bar. */}
      <div
        className="hidden shrink-0 flex-col items-end sm:flex"
        title={t.localTime}
      >
        <span className="text-foreground font-mono text-sm leading-none tabular-nums">
          {clock ?? "--:--:--"}
        </span>
        <span className="text-[9px] text-slate-600">İstanbul</span>
      </div>

      <div
        className="flex shrink-0 items-center rounded-md border border-slate-800/60 p-0.5"
        role="group"
        aria-label={t.language}
      >
        {(["tr", "en"] as Lang[]).map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => setLang(code)}
            aria-pressed={lang === code}
            className={
              "rounded px-1.5 py-0.5 font-mono text-[10px] uppercase transition-colors " +
              (lang === code
                ? "bg-neon-cyan/15 text-neon-cyan"
                : "text-slate-500 hover:text-slate-300")
            }
          >
            {code}
          </button>
        ))}
      </div>
    </header>
  );
}
