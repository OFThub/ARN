# Arnavutköy Logistics Hub

**Do the people living closest to Istanbul Airport have the hardest time reaching it?**

Arnavutköy hosts one of Europe's largest airports and an organised industrial zone. This
dashboard answers one question about that corridor with measured data: which neighborhoods
carry the most people per bus stop, and how far are they from the jobs.

The finding, computed from 649 real OSM bus stops and İBB population figures:

> **7 of 38 neighborhoods are underserved — and they hold 48% of the district's population
> (159,392 people). All seven are within 10 km of work.** Hastane sits 0.6 km from the airport
> with 2,344 people per stop; the district average is 516. Best to worst is a 49-fold gap.

A simulated flow layer sits alongside it — neon arcs, a 24-hour playback — and is labelled
`sim` everywhere it appears, so measurement and model are never confused.

**It runs with zero API keys.** Clone, install, `npm run dev`.

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
| `npm test` | 30 tests via `node --test` (no framework) |

## What is measured and what is modelled

The UI marks this on every panel; here is the full picture.

**Measured** (`lib/accessibility.ts`) — everything in the access analysis. 649 OSM bus stops
attributed to neighborhoods by point-in-polygon, population per stop, distance to the two
employment centres, and the composite disadvantage score. Every figure traces to a coordinate.

**Modelled** (`lib/simulation.ts`, `lib/traffic.ts`) — the flow layer and the street traffic.
The road network itself is real OSM geometry with real classes and names; the load on it is
estimated from class, proximity to the employment poles and the hour. Nobody counted a vehicle.
The flow layer: Passenger, freight, hotel-occupancy and
traffic volumes come from hand-tuned hourly demand curves. Nothing in it is a measurement, and
the UI never presents it as one.

### What the analysis cannot tell you

The dataset holds stop *locations* only — no route geometry, no timetable, no frequency. So
this measures **stop provision**, not journey time. A neighborhood with many stops served once
an hour scores well here and is still badly connected. Saying so is part of the result.

The score's weighting is a judgement, so it is a **control rather than a constant**: the left
panel carries a slider between service load and distance, and the ranking follows it live. At
100% service load Hastane leads; at 100% distance the remote northern villages do. Seeing the
answer move with the assumption is the honest way to present a composite score.

The 1,200 people-per-stop threshold is likewise a choice, stated in `lib/accessibility.ts` and
shown in the UI.

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
  accessibility.ts      The measured access analysis + its 12 tests
  traffic.ts            Street-level load model + its 9 tests
  simulation.ts         Deterministic flow model + its 11 tests
  layers.ts             deck.gl layer construction
  geo.ts places.ts      Dataset loading, hub network
  basemap.ts palette.ts Basemap resolution, shared colour ramp
  phases.ts             The ten build phases, as data
store/useSimStore.ts    Playback, filters, layer visibility (zustand)
public/data/            Real geodata (boundary, 38 neighborhoods, 649 stops) + attribution
```

## Presentation mode

The project was built in ten phases, and it can be walked through live. There is no visible
control — the audience sees the application, not the scaffolding.

| Key | Action |
|---|---|
| `1`–`9`, `0` | Jump to that phase (`0` = phase 10) |
| `←` `→` | Step between phases |
| `F` | Jump to the finale — street-level traffic |
| `H` | Toggle speaker notes |
| `Esc` | Close notes, then leave the walkthrough |

Each phase hides the features that did not exist yet, so phase 1 is a bare dark canvas and
phase 10 is the finished application. Phase 11 is the finale: traffic drops from corridor
hexagons onto the real 1,601-segment arterial network, loaded by road class and hour. The map is never remounted, so camera position and
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

- **No journey times.** The stop dataset has no routes or timetables, so the analysis measures
  provision, not travel time. Fixing this needs İETT GTFS data, not code.
- **Population is itself an estimate** — the district total distributed by OSM building
  footprint area. Figures are the right order of magnitude, not exact counts.
- Map labels thin out by zoom (3 at z9, all 9 by z12) rather than colliding.
  `CollisionFilterExtension` was tried and reverted: it needs a render pass that
  `MapboxOverlay`'s interleaved mode does not run, so every label vanished.
- The corridor heatmap's `elevationScale` is a calibration knob, not a derived value.
- There is no backend. Swapping `lib/simulation.ts` for a real feed is the intended seam.

## Belgeler / Documentation

| Belge | İçerik |
|---|---|
| [`docs/API_VE_MIMARI.md`](docs/API_VE_MIMARI.md) | Teknik mimari ve modül API'leri |
| [`docs/KULLANIM_KILAVUZU.md`](docs/KULLANIM_KILAVUZU.md) | Arayüz kullanımı, klavye kısayolları, sorun giderme |
| [`docs/KULLANIM_SENARYOSU.md`](docs/KULLANIM_SENARYOSU.md) | Uçtan uca kullanım senaryoları |
| [`docs/STAJ_RAPORU.md`](docs/STAJ_RAPORU.md) · [PDF](docs/STAJ_RAPORU.pdf) | Staj raporu |
| [`docs/STAJ_DEFTERI.md`](docs/STAJ_DEFTERI.md) | 10 günlük çalışma kayıtları |

## Data attribution

Geodata © OpenStreetMap contributors (ODbL 1.0), derived via Nominatim and İBB open data.
Basemap tiles © OpenFreeMap © OpenStreetMap contributors. Full detail and accuracy caveats in
[`public/data/ATTRIBUTION.md`](public/data/ATTRIBUTION.md).
