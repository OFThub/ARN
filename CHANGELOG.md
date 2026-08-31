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

[Unreleased]: https://github.com/
