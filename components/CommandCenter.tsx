"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { MapHandles } from "./map/MapCanvas";
import TimeBar from "./TimeBar";
import LeftPanel from "./panels/LeftPanel";
import RightPanel from "./panels/RightPanel";
import PhaseNav from "./PhaseNav";
import Header from "./Header";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { loadGeoData, type GeoData } from "@/lib/geo.ts";
import { resolveHubs } from "@/lib/places.ts";
import { MINUTES_PER_DAY, corridorPoints, flowsAt } from "@/lib/simulation.ts";
import { buildLayers } from "@/lib/layers.ts";
import { setBuildingsVisible } from "@/lib/basemap.ts";
import { phaseById } from "@/lib/phases.ts";
import { computeAccess, summarise } from "@/lib/accessibility.ts";
import { MINUTES_PER_REAL_SECOND, useSimStore } from "@/store/useSimStore.ts";

// MapLibre reaches for `window` while its module initialises, so it can never be
// part of the server bundle. Loading it this way is what keeps `next build` green.
const MapCanvas = dynamic(() => import("./map/MapCanvas"), {
  ssr: false,
  loading: () => <div className="bg-canvas absolute inset-0" />,
});

/** One full pulse traversal of an arc, in milliseconds. */
const PULSE_PERIOD_MS = 4200;

/** The `lg` breakpoint, matching the Tailwind default the layout is built on. */
const WIDE_QUERY = "(min-width: 64rem)";

/**
 * Whether there is room for the floating panels.
 *
 * Used to mount the panels rather than to hide them with CSS. A display:none
 * Recharts container measures 0x0 and warns on every render, and hiding it
 * would also keep a second copy of both charts alive behind the drawer.
 *
 * Starts false so the server and the first client render agree; the effect
 * corrects it before paint on wide screens.
 */
function useIsWide(): boolean {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(WIDE_QUERY);
    const sync = () => setWide(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return wide;
}

/**
 * How often the render loop pushes the clock into React.
 *
 * 100ms keeps the digits and the slider thumb looking continuous while costing
 * ~10 renders/second instead of 60. At 16x the playhead covers ~10 simulated
 * minutes per tick, still smooth at the scale of a 24-hour track.
 */
const UI_TICK_MS = 100;

export default function CommandCenter() {
  const [geo, setGeo] = useState<GeoData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const handlesRef = useRef<MapHandles | null>(null);

  // Note: this component deliberately does NOT subscribe to `minute`. The loop
  // reads the playhead from a ref, so the clock ticking costs zero renders here;
  // TimeBar and the panels subscribe for themselves.
  const lang = useSimStore((s) => s.lang);
  const seekToken = useSimStore((s) => s.seekToken);
  const userToggles = useSimStore((s) => s.layers);
  const phase = useSimStore((s) => s.phase);
  const metrics = useSimStore((s) => s.metrics);
  const serviceWeight = useSimStore((s) => s.serviceWeight);

  // Below `lg` the panels move into drawers rather than floating over the map,
  // which at 375px would leave no map visible at all.
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const isWide = useIsWide();

  // The walkthrough overrides the layer switches so each phase shows what
  // existed then rather than whatever was last toggled. A phase marked
  // `deferToUser` opts out — phase 10 is the finished application, where
  // overriding would leave the panel's layer buttons visibly dead.
  const activePhase = phase === null ? undefined : phaseById(phase);
  const overridesLayers =
    activePhase !== undefined && activePhase.deferToUser !== true;
  const toggles = overridesLayers ? activePhase.layers : userToggles;
  const ui = activePhase?.ui ?? {
    header: true,
    left: true,
    right: true,
    timebar: true,
  };

  /**
   * The frame-accurate playhead, in fractional minutes.
   *
   * Deliberately outside React: the map reads it 60 times a second, and routing
   * that through state would re-render every panel at frame rate.
   */
  const playheadRef = useRef(useSimStore.getState().minute);

  /**
   * Cached corridor samples, keyed by hour.
   *
   * The hexagon layer is on by default now, and regenerating 810 seeded points
   * every frame would also force HexagonLayer to re-bin on every frame. The
   * sample positions do not vary with time at all and the weights come off an
   * hourly curve, so once per simulated hour is the honest granularity.
   */
  const corridorRef = useRef<{
    hour: number;
    points: ReturnType<typeof corridorPoints>;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadGeoData()
      .then((d) => {
        if (!cancelled) setGeo(d);
      })
      .catch((e: unknown) => {
        // Surfaced in the UI rather than swallowed: with no geometry there are no
        // hubs, so an empty map would otherwise look like a rendering bug.
        console.error("[data]", e);
        if (!cancelled) setLoadError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const hubs = useMemo(() => (geo ? resolveHubs(geo.mahalle) : []), [geo]);

  /**
   * The measured access analysis.
   *
   * Computed once per dataset load, never per frame: 38 polygons x 649 stops is
   * ~25k point-in-polygon tests, which is fine once and ruinous at 60 Hz. The
   * result feeds the map, both panels and the summary from a single source.
   */
  const access = useMemo(
    () => (geo ? computeAccess(geo.mahalle, geo.stops, serviceWeight) : []),
    [geo, serviceWeight],
  );
  const accessSummary = useMemo(
    () => (access.length > 0 ? summarise(access) : null),
    [access],
  );

  // Only a user drag moves the playhead from outside the loop. Syncing on
  // `minute` instead would fight the loop's own writes every tick.
  useEffect(() => {
    playheadRef.current = useSimStore.getState().minute;
  }, [seekToken]);

  useEffect(() => {
    const handles = handlesRef.current;
    if (!mapReady || !handles) return;
    setBuildingsVisible(handles.map, toggles.buildings);
  }, [mapReady, toggles.buildings]);

  const onMapReady = useCallback((h: MapHandles) => {
    handlesRef.current = h;
    setMapReady(true);
  }, []);

  /**
   * The render loop.
   *
   * Advances the playhead, recomputes flows from it, and writes straight into
   * the deck overlay via `setProps`. The only React write is the throttled clock
   * tick, so playing the day back costs ~10 renders/second rather than 60.
   */
  useEffect(() => {
    const handles = handlesRef.current;
    if (!mapReady || !handles || !geo || hubs.length === 0) return;

    // Reduced motion stops the travelling pulses, not the data: the map still
    // redraws whenever the clock moves, it simply does not animate on its own.
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let raf = 0;
    let last = performance.now();
    let lastUiPush = 0;

    const tick = (now: number) => {
      // Clamp: a backgrounded tab resumes with a huge delta and would otherwise
      // jump several simulated hours in one frame.
      const dtMs = Math.min(now - last, 250);
      last = now;

      const { playing, speed } = useSimStore.getState();
      if (playing) {
        const advanced =
          playheadRef.current + (dtMs / 1000) * MINUTES_PER_REAL_SECOND * speed;
        playheadRef.current = advanced % MINUTES_PER_DAY;
      }

      if (now - lastUiPush >= UI_TICK_MS) {
        lastUiPush = now;
        const shown = Math.floor(playheadRef.current);
        if (shown !== useSimStore.getState().minute) {
          useSimStore.getState().tickMinute(shown);
        }
      }

      // Resample the corridor only when the simulated hour rolls over.
      let corridor = corridorRef.current?.points;
      if (toggles.heatmap) {
        const hour = Math.floor(playheadRef.current / 60);
        if (corridorRef.current?.hour !== hour) {
          corridorRef.current = { hour, points: corridorPoints(hubs, hour * 60) };
        }
        corridor = corridorRef.current.points;
      }

      handles.overlay.setProps({
        layers: buildLayers({
          hubs,
          flows: flowsAt(hubs, playheadRef.current, metrics),
          district: geo.district,
          mahalle: geo.mahalle,
          access,
          busStops: geo.stops,
          roads: toggles.roads ? geo.roads : undefined,
          minute: playheadRef.current,
          // Read per frame so the label thinning follows the camera. Cheap:
          // getZoom() is a field read, not a projection.
          zoom: handles.map.getZoom(),
          corridor: toggles.heatmap ? corridor : undefined,
          lang,
          labelLayerId: handles.labelLayerId,
          toggles,
          pulse: reduced ? 0 : (now % PULSE_PERIOD_MS) / PULSE_PERIOD_MS,
        }),
      });

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [mapReady, geo, hubs, lang, toggles, metrics, access]);

  return (
    <main className="bg-canvas relative h-full w-full overflow-hidden">
      <MapCanvas onReady={onMapReady} />

      {ui.header && (
        <div className="pointer-events-none absolute inset-x-3 top-3">
          <Header
            onOpenLeft={() => setLeftOpen(true)}
            onOpenRight={() => setRightOpen(true)}
          />
        </div>
      )}

      {/* Floating panels, wide screens only. Below `lg` the same components are
          rendered inside the drawers below instead. */}
      {ui.left && isWide && (
        <div
          className={
            "pointer-events-none absolute left-4 flex flex-col " +
            (ui.header ? "top-20" : "top-4")
          }
        >
          <LeftPanel
            summary={accessSummary}
            effectiveLayers={toggles}
            locked={overridesLayers}
          />
        </div>
      )}

      {ui.right && isWide && (
        <div
          className={
            "pointer-events-none absolute right-4 flex flex-col " +
            (ui.header ? "top-20" : "top-4")
          }
        >
          <RightPanel hubs={hubs} access={access} />
        </div>
      )}

      <Sheet open={leftOpen && !isWide} onOpenChange={setLeftOpen}>
        <SheetContent side="left" className="w-auto border-slate-800/60 bg-transparent p-3">
          <SheetTitle className="sr-only">Göstergeler / Indicators</SheetTitle>
          <LeftPanel
            summary={accessSummary}
            effectiveLayers={toggles}
            locked={overridesLayers}
          />
        </SheetContent>
      </Sheet>

      <Sheet open={rightOpen && !isWide} onOpenChange={setRightOpen}>
        <SheetContent side="right" className="w-auto border-slate-800/60 bg-transparent p-3">
          <SheetTitle className="sr-only">Grafikler / Charts</SheetTitle>
          <RightPanel hubs={hubs} access={access} />
        </SheetContent>
      </Sheet>

      {/* Walkthrough. Renders nothing until a phase is selected from the
          keyboard, and positions itself; no wrapper needed. */}
      <PhaseNav />

      {/* Insets clear both panels (18rem + 1rem gutter each side). Phase 9
          replaces these fixed insets with the responsive drawer layout. */}
      {ui.timebar && (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center px-4 lg:px-[19.5rem]">
          <div className="w-full max-w-4xl">
            <TimeBar />
          </div>
        </div>
      )}

      {loadError && (
        <div
          role="alert"
          className="glass absolute top-4 left-1/2 -translate-x-1/2 rounded-lg px-4 py-3 text-sm text-rose-300"
        >
          Veri yüklenemedi / Data failed to load: {loadError}
        </div>
      )}
    </main>
  );
}
