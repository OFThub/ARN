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

### Added — phase 11, street-level traffic

- `public/data/yol.geojson` — 1,601 real arterial segments (motorway through
  tertiary and their links) filtered out of the district's OSM snapshot, with
  their true class and name.
- `lib/traffic.ts` + 9 tests — the load model. Geometry, class and name are
  real; the load is estimated from road class, distance to the airport and the
  Hadımköy OSB, and the shared hourly traffic curve. Unknown road classes are
  dropped rather than given a default capacity.
- A `PathLayer` colours and widens each segment by load, following the time
  slider: at 03:00 the busiest road is 8.9 px and cyan, at 08:00 it is 30.3 px
  and violet.
- `F` jumps straight to the finale from anywhere, including with the demo closed.

Three defects surfaced while building it:

- The "last phase defers to the user's toggles" rule was written as an id
  comparison against `LAST_PHASE`, so adding phase 11 silently moved it. It is
  now an explicit `deferToUser` flag on phase 10.
- The phase counter was hardcoded to `/ 10` and would have lied from the moment
  an eleventh phase existed; it reads `PHASES.length`.
- The left panel showed the *stored* layer switches while a phase was overriding
  them — the map said one thing and the panel another. It now receives what the
  map actually draws, and the buttons are disabled while a phase dictates them.

Two rendering problems, both worth recording:

- Road width in metres is sub-pixel at district zoom. Switched to pixel units:
  traffic legibility should not depend on camera distance.
- The layer was invisible under `beforeId`. The overlay slot targets the first
  symbol layer, which in this basemap is `water_name` — and the style draws its
  own street lines *after* that, so a slotted path renders beneath the very
  roads it colours. The traffic layer is deliberately left unslotted.

### Fixed — audit sweep

- `.env.example` was unreachable: `.gitignore`'s `.env*` swallowed it, so the file
  could never be committed. Added the `!.env.example` negation.
- Phase cards 7 and 8 described features the access rewrite had removed — a
  sparkline that no longer exists and a radial chart replaced by the ranking.
  A walkthrough that misdescribes the screen behind it is worse than none.
- `CLAUDE.md` claimed 11 tests; there are 21.
- Removed what the rewrite orphaned in `lib/simulation.ts`: `metricsAt`, the
  `Metrics` type, `hourlySeries` and the three peak constants that fed only
  them, plus the two tests that guarded them. They had no caller outside their
  own test file.

### Fixed — the correctable defects

- The score weighting is a slider, not a constant. `computeAccess` takes the
  service/distance split as an argument and the left panel exposes it, so a
  reader who weighs the two differently watches the ranking follow their own
  assumption. Two tests pin the behaviour: full service load puts Hastane first,
  full distance puts the remote villages first.
- A test caught a real hole while adding it: `Math.max(0, NaN)` is `NaN`, so the
  clamp let a non-finite weight through and turned every score into `NaN`. Both
  the analysis and the store now fall back to the default on non-finite input.
- Map labels thin out with zoom — three at z9, all nine by z12 — chosen
  busiest-first. Fixed pixel offsets can separate a known pair but cannot help
  when the whole district is 400 px wide.
- Both panels are height-capped and scroll internally; adding the weighting
  control had pushed the left panel off the bottom of the viewport.
- `.env.example` documents the one optional variable.

Two defects are **not** fixed, because they are data limits rather than code:
journey time cannot be computed without route and timetable data, and the
population figures are themselves a modelled distribution. Both are stated in
the UI, the README and the attribution file.

### Changed — the project now answers a real question

The dashboard was a visual specification built to the letter: neon arcs over simulated
volumes, with no user, no decision and no measurement behind it. It now leads with a
question that real data can answer.

- `lib/accessibility.ts` + 10 tests — the measured analysis. 649 real OSM bus stops
  attributed to 38 neighborhoods by point-in-polygon, population per stop, distance to the
  airport and the Hadımköy industrial zone, and a composite disadvantage score. No PRNG,
  no modelling.
- `public/data/durak.geojson` — the stops, filtered out of the district's OSM snapshot.
  (`otobus-duragi.geojson`, referenced by a constant in the sibling project, never existed.)
- The choropleth now paints measured access disadvantage instead of raw population density,
  with opacity riding the score so well-served neighborhoods fade and the problem stands out.
- Left panel shows measured figures; right panel ranks the six hardest-to-reach
  neighborhoods. The simulated flow layer stays, labelled `sim` on every toggle and
  `simülasyon` on its chart, so measurement and model are never read as the same thing.
- The analysis's limit is stated in the UI, the README, `CLAUDE.md` and the attribution file:
  stop locations only, so this measures provision and not journey time.

**The finding:** 7 of 38 neighborhoods are underserved, and they hold 48% of the district
(159,392 people). All seven are within 10 km of work. Hastane is 0.6 km from the airport at
2,344 people per stop against a district average of 516 — a 49-fold spread.

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
