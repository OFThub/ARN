# Data attribution

The geographic and demographic data in this folder is **not** synthetic. It was produced by the
sibling project `ArnavutköyCBS` from public sources and is redistributed here under those sources'
terms. Simulated flow volumes are generated at runtime in `lib/simulation.ts` and are **not** in
this folder.

| File | Source | Licence / terms |
|---|---|---|
| `district.geojson` | OpenStreetMap via Nominatim, relation `1766093` | © OpenStreetMap contributors, [ODbL 1.0](https://opendatacommons.org/licenses/odbl/) |
| `mahalle.geojson` | Nominatim geocoding + Voronoi partition (**approximate boundaries**) | © OpenStreetMap contributors, ODbL 1.0 |
| `mahalle-nufus.json` | District population (335,000 / 2023) distributed across neighborhoods by OSM building footprint area | Derived estimate — see caveat below |

## Caveats that must not be lost

- **`mahalle.geojson` boundaries are approximate.** Every feature carries
  `geometri_kaynak: "yaklasik-voronoi"` and `yaklasik: true`. The *centroids* (`merkez_lon`,
  `merkez_lat`) are real geocoded points; the polygons around them are a Voronoi partition, not
  cadastral boundaries. Do not use them for any decision with legal or planning consequence.
- **`mahalle-nufus.json` figures are estimates,** flagged per-record with `tahmini: true`. Only the
  district total (335,000, 2023) is an official figure; the per-neighborhood split is modelled.

Basemap tiles are served by [OpenFreeMap](https://openfreemap.org/) (© OpenStreetMap contributors)
and are attributed in the map's on-screen attribution control. When `NEXT_PUBLIC_MAPBOX_TOKEN` is
set the basemap switches to Mapbox and Mapbox's own attribution applies.
