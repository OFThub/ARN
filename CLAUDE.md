@AGENTS.md

# ARN — working notes

A dashboard for the Istanbul Airport ↔ Arnavutköy corridor. Read `README.md` first for what
the project is; this file covers what an agent needs in order not to break it.

## Commands

| Task | Command |
|---|---|
| Dev server | `npm run dev` |
| Production build | `npm run build` |
| Types | `npm run typecheck` |
| Lint | `npm run lint` |
| Tests | `npm test` — 11 tests, `node --test`, no framework |

All four gates MUST pass before work is called done. `npm test` is fast; run it after any
change to `lib/simulation.ts`.

## Conventions this codebase already follows

**Relative imports carry the `.ts` extension.** `import { flowsAt } from "./simulation.ts"`.
Node's ESM resolver requires it to run the tests without a build step, and Turbopack accepts
an explicit path. `tsconfig.json` has `allowImportingTsExtensions` for this reason.

**The simulation MUST stay deterministic.** No `Math.random()` anywhere. `lib/simulation.ts`
seeds `mulberry32` from an FNV-1a hash of the hub id. Non-determinism reached during render
produces a React hydration mismatch whose error points at a component nowhere near the cause.

**Turkish names normalise upward, never downward.** `"İSTANBUL".toLowerCase()` yields `i` plus
a combining dot and will never match a plain `"istanbul"`. Use `toLocaleUpperCase("tr-TR")` —
see `findMahalle` in `lib/geo.ts`.

**Colours are declared twice, on purpose.** `lib/palette.ts` holds `[r,g,b]` triples for
deck.gl (GPU layers cannot read CSS custom properties); `app/globals.css` holds the same ramp
as `@theme` tokens. Change one, change the other — the comment in each names its counterpart.

**The map is written to imperatively, exactly once per frame.**
`components/CommandCenter.tsx` owns the only `overlay.setProps()` call. The playhead lives in
a ref, and the clock is pushed into React at 10 Hz, not 60 — that is why the panels stay idle
while playback runs. Do not move layer construction into React state.

**Panels are mounted conditionally, not hidden with CSS.** A `display:none` Recharts container
measures 0×0 and warns on every render. `useIsWide()` in `CommandCenter.tsx` decides whether
the floating panels or the drawers exist.

**UI strings live beside their component** as a `COPY = { tr, en }` const. There is no i18n
library and none is wanted at this size; `lang` comes from the store.

**deck.gl layer props contributed by `MapboxOverlay` or an extension** (`beforeId`, collision
props) are spread from a variable rather than written inline — deck.gl declares `LayerProps`
as a `type`, so it cannot be augmented, and spreading clears the excess-property check while
leaving the rest of the layer fully type-checked. See `overlaySlot` in `lib/layers.ts`.

## Things that were tried and did not work

- **`@deck.gl/extensions` `CollisionFilterExtension`** for automatic label collision handling.
  It needs its own render pass, which `MapboxOverlay`'s interleaved mode does not run, so
  every label silently disappeared. Reverted; label separation uses per-hub pixel offsets in
  `lib/places.ts`.
- **MapLibre v6.** Requires `setWorkerUrl` with bundler-specific worker plumbing. Pinned to
  `5.24.0`.
- **The `deck.gl` meta-package.** Pulls `@arcgis/core` (100+ MB) as a peer plus the
  `@loaders.gl/gltf` chain and its advisories. Four scoped packages instead.

## Data honesty

`public/data/` is real OSM/İBB-derived data; `lib/simulation.ts` is modelled. Do not blur that
line in UI copy or documentation. The neighborhood polygons are approximate (Voronoi) and the
population split is an estimate — `public/data/ATTRIBUTION.md` records both caveats and they
MUST survive any rewrite.

## Presentation mode

`lib/phases.ts` declares the ten build phases as data: which layers and panels existed at the
end of each. `components/PhaseNav.tsx` renders no visible control and is driven from the
keyboard. When a phase's real work lands, update its `pointsTr`/`pointsEn` and `status` — a
card still saying "Henüz yapılmadı" after the work is done is a lie in the demo.
