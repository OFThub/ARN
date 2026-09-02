# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Next.js 16 App Router scaffold with TypeScript, Tailwind CSS v4 and shadcn/ui
  (radix base, `nova` preset), dark mode enforced on `#0A0D14`.
- Command-center theme in `app/globals.css`: neon accent ramp, the `glass`
  utility used by every floating panel, and a `prefers-reduced-motion` guard.
- Real Arnavutköy geodata in `public/data/` — district boundary (OSM relation
  1766093), 38 neighborhood polygons with geocoded centroids, and modelled
  population. Sources and accuracy caveats in `public/data/ATTRIBUTION.md`.
- `lib/geo.ts` — typed dataset loaders with a left-outer join of population onto
  geometry, and Turkish-locale-safe name lookup.
- `lib/places.ts` — nine-hub origin-destination network resolved from real
  centroids; only the airport and district-centre coordinates are literal.
- `lib/basemap.ts` — token-free OpenFreeMap dark basemap with real 3D building
  extrusions from OSM heights; optional Mapbox upgrade via
  `NEXT_PUBLIC_MAPBOX_TOKEN`.
- `components/map/MapCanvas.tsx` — MapLibre GL canvas with an interleaved
  deck.gl overlay and a bare-WebGL fallback if basemap tiles are rejected.
- `lib/simulation.ts` — deterministic, seeded flow model: per-hour demand
  shapes for passengers, freight, hotel occupancy and traffic; per-hub volumes
  weighted by role and real population; corridor density sampling.
- `lib/layers.ts` — deck.gl layer builders: cyan-to-violet origin-destination
  arcs sized by flow share, CPU-interpolated travelling pulses, hub and airport
  markers, district outline, and Turkish-safe map labels (`characterSet: auto`).
- `lib/palette.ts` — the accent ramp as RGB triples, mirroring the CSS tokens
  that GPU layers cannot read.
- `components/CommandCenter.tsx` — page shell that loads the datasets, resolves
  hubs, and drives a requestAnimationFrame loop writing straight into the deck
  overlay, so a playing animation costs zero React renders; honours
  `prefers-reduced-motion`.
- `store/useSimStore.ts` — zustand playback state (clock, play/pause, speed,
  language). Carries a `seekToken` so the render loop can tell a user drag apart
  from its own clock writes.
- `components/TimeBar.tsx` — bottom control bar: 00:00-23:59 scrub slider with
  hour marks, play/pause, reset, 1x/4x/16x speed, and a peak/off-peak badge.
  Keyboard operable (arrows, Page Up/Down, Home/End) and the thumb announces
  "08:30" rather than "510".
- `components/ui/slider.tsx` — local `thumbAriaValueText` prop, because this
  Radix version exposes no `getAriaValueText` and `aria-valuetext` on Root never
  reaches the element carrying `role="slider"`.
- `components/panels/LeftPanel.tsx` — glassmorphism left panel: four live
  metric cards (departures, hotel capacity, corridor tonnage, tourist index)
  with hour-over-hour deltas and inline-SVG 24h sparklines, plus seven map
  layer toggles carrying `aria-pressed` and a non-colour on/off indicator.
- Two new deck layers: `mahalle-choropleth` (population density, sqrt-scaled
  because density spans three orders of magnitude) and `corridor-hexagons`
  (HexagonLayer over the simulated corridor samples).
- Layer visibility state in `store/useSimStore.ts`. Toggling rebuilds only the
  overlay's layer array; the `buildings` toggle is routed to MapLibre's
  `setBuildingsVisible`, so neither path remounts the map.
- `components/panels/RightPanel.tsx` — glassmorphism right panel with two
  Recharts views: a 24-hour flow profile (current hour in cyan, peak banks in
  violet, off-peak slate) and a radial breakdown of each hub's live share,
  coloured off the same cyan-violet ramp as the arcs. Both read from the same
  `flowsAt()` the map uses, so panel and map can never disagree. A ranked text
  list sits under the radial chart, since the rings carry no labels of their own.
- `lib/phases.ts` + `components/PhaseNav.tsx` — presentation walkthrough. Each
  of the ten phases declares which layers and panels existed at its end, plus a
  summary and three concrete points, so the project can be demonstrated the way
  it was built rather than only as a finished screen. Deliberately invisible: no
  launcher button and no permanent bar, because the audience should see the
  application rather than the scaffolding used to step through it. A number key
  enters, arrows step, `H` summons speaker notes, `Esc` closes notes and then
  leaves. The only always-on affordance is a small `05/10` marker in the bottom
  corner that fades after 1.6s, driven by remounting on `key={phase}` rather
  than a timer. Keys are bound on the window but stand down while a text field
  or the time slider has focus.
- `components/Header.tsx` — title, pulsing live badge, real Istanbul wall clock,
  four quick metric filters and the TR/EN switch. The clock is written after
  mount, since rendering it during SSR bakes in the server's instant and
  produces a hydration mismatch. Switching language also updates
  `document.documentElement.lang`.
- Quick filters are wired into `flowsAt()`: turning all four off zeroes the flow
  rather than silently falling back to showing everything.
- Responsive layout: below `lg` the panels move into shadcn `Sheet` drawers.
  They are mounted conditionally rather than hidden with CSS, because a
  `display:none` Recharts container measures 0x0, warns on every render, and
  would keep a second live copy of both charts behind the drawer.
- Per-hub label offsets in `lib/places.ts`, separating the hubs that converge
  around Arnavutköy Merkez and the Hastane/Hadımköy pair 550 m apart.

### Fixed

- Map rendered at zero height: `maplibre-gl.css` sets
  `.maplibregl-map { position: relative }` and is imported after the Tailwind
  layer, so it overrode `.absolute` and collapsed `inset-0`. The container is
  now sized with `h-full w-full`.
- Role affinity was swamped by population weight, letting a residential hub
  outrank the logistics zone during the 03:00 freight peak. Residential hotel
  affinity dropped to 0.1 and the industrial base weight raised to 16000.

- `README.md` rewritten from the create-next-app scaffold: what runs without a
  key, what is real data versus modelled flow, the real command table, the
  presentation keys, and the known limitations.
- `CLAUDE.md` written from the codebase's actual conventions — the `.ts` import
  extension, the determinism rule, the Turkish locale trap, the single
  `setProps` write point, and the three approaches that were tried and reverted.
- Audit pass: no `Math.random()` outside the seeded PRNG, `mulberry32` defined
  once, exactly one `overlay.setProps()` call site, and MapLibre absent from the
  production server bundle (only a source-map string match, zero source entries).
- All ten phase cards in `lib/phases.ts` now carry real outcomes; none is left
  marked `planned`.

### Fixed (post-phase-10)

- The neighborhood-density and corridor-heatmap layers were off in
  `DEFAULT_TOGGLES`, so a cold load looked as though they did not work. All
  seven layers now start on.
- Phase 10's layer override made the left panel's toggle buttons dead: it is the
  finished application, so `CommandCenter` now defers to the user's own switches
  there instead of forcing the phase's fixed set. Phases 1-9 still override.
- Corridor samples are cached per simulated hour. With the hexagon layer on by
  default, regenerating 810 seeded points every frame would also have forced
  `HexagonLayer` to re-bin 60 times a second; the sample positions never vary
  with time and the weights come off an hourly curve.

### Tried and reverted

- `@deck.gl/extensions` `CollisionFilterExtension` for automatic map-label
  collision avoidance. It needs its own render pass, which `MapboxOverlay`'s
  interleaved mode does not run, so every label silently disappeared. Reverted
  and the package uninstalled; label separation is done with per-hub pixel
  offsets instead.

[Unreleased]: https://github.com/OFThub/ARN
