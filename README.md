# Arnavutköy Logistics Hub

A dark-themed command center for the Istanbul Airport ↔ Arnavutköy corridor: a 3D map as the
background canvas, neon origin-destination arcs springing from the airport, floating
glassmorphism panels, and a 00:00–23:59 slider that plays a simulated day back.

**It runs with zero API keys.** Clone, install, `npm run dev` — the basemap, the 3D buildings
and every number are there on first load.

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000
```

No `.env` file is required. The basemap comes from [OpenFreeMap](https://openfreemap.org/),
which needs no token, and its OpenMapTiles source carries real OSM building heights — so the
3D extrusions are actual building geometry, not decoration.

### Optional: Mapbox basemap

Set `NEXT_PUBLIC_MAPBOX_TOKEN` to swap the basemap for Mapbox's `dark-v11`. Every data layer
is unchanged; only the tiles differ.

```bash
# .env.local
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_token_here
```

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Development server on port 3000 |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | 11 model tests via `node --test` (no framework) |

## What is real and what is simulated

This distinction matters, and the code keeps it explicit.

**Real** — the geography and the population. `public/data/` holds the Arnavutköy district
boundary (OSM relation `1766093`), 38 neighborhood polygons with geocoded centroids, and
per-neighborhood population. Every destination hub resolves its coordinates from that data;
only Istanbul Airport and the district centre are literal coordinates in the source.

**Simulated** — the flows. `lib/simulation.ts` generates passenger, freight, hotel-occupancy
and traffic volumes from hand-tuned hourly demand curves. Nothing in it is a measurement.

The data carries caveats that must not be lost — the neighborhood polygons are approximate
(Voronoi, not cadastral) and the population split is modelled. See
[`public/data/ATTRIBUTION.md`](public/data/ATTRIBUTION.md) for sources and licences.

## Project structure

```
app/                    Next.js App Router entry, global theme
components/
  map/MapCanvas.tsx     MapLibre canvas + interleaved deck.gl overlay
  panels/               Left (metrics, layer toggles) and right (charts)
  Header.tsx            Title, live badge, clock, quick filters, TR/EN
  TimeBar.tsx           00:00-23:59 playback
  PhaseNav.tsx          Keyboard-only build walkthrough
lib/
  simulation.ts         Deterministic flow model + its 11 tests
  layers.ts             deck.gl layer construction
  geo.ts places.ts      Dataset loading, hub network
  basemap.ts palette.ts Basemap resolution, shared colour ramp
  phases.ts             The ten build phases, as data
store/useSimStore.ts    Playback, filters, layer visibility (zustand)
public/data/            Real geodata + attribution
```

## Presentation mode

The project was built in ten phases, and it can be walked through live. There is no visible
control — the audience sees the application, not the scaffolding.

| Key | Action |
|---|---|
| `1`–`9`, `0` | Jump to that phase (`0` = phase 10) |
| `←` `→` | Step between phases |
| `H` | Toggle speaker notes |
| `Esc` | Close notes, then leave the walkthrough |

Each phase hides the features that did not exist yet, so phase 1 is a bare dark canvas and
phase 10 is the finished application. The map is never remounted, so camera position and
clock survive every step. A small `05/10` marker fades in the bottom corner on each change.

Keys stand down while a text field or the time slider has focus, so scrubbing time with the
arrow keys still works.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui · MapLibre GL v5 ·
deck.gl 9 · Recharts 3 · zustand 5

Three notes on the choices:

- **deck.gl is installed as four scoped packages**, not the meta-package. The meta-package
  pulls `@arcgis/core` (100+ MB) as a peer and the `@loaders.gl/gltf` chain, which carried 10
  high-severity advisories at the time. The scoped set audits clean.
- **MapLibre is pinned to v5.** v6 moved WebGL context attributes and requires bundler-specific
  worker plumbing, which buys nothing here.
- **`@deck.gl/react` is not used.** The map is driven imperatively through
  `MapboxOverlay.setProps()`, which is what keeps a playing animation at zero React renders.

## Known limitations

- Map label placement uses fixed per-hub pixel offsets. A few labels still overlap at some
  zoom levels; `CollisionFilterExtension` was tried and reverted because it needs a render
  pass that `MapboxOverlay`'s interleaved mode does not run.
- The corridor heatmap's `elevationScale` is a calibration knob, not a derived value.
- There is no backend. Swapping `lib/simulation.ts` for a real feed is the intended seam.

## Data attribution

Geodata © OpenStreetMap contributors (ODbL 1.0), derived via Nominatim and İBB open data.
Basemap tiles © OpenFreeMap © OpenStreetMap contributors. Full detail and accuracy caveats in
[`public/data/ATTRIBUTION.md`](public/data/ATTRIBUTION.md).
