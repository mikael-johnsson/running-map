# Next.js map drawing + distance (free, no backend)

## Answers to your service questions

- **Vector vs non-vector (raster)**
  - **Use vector tiles** for your use case. Drawing points/lines + measuring distance is much nicer on a WebGL vector map: crisp at any zoom, styling is flexible, and you can update a GeoJSON layer instantly.
  - **Raster tiles** can still work (Leaflet + OSM raster), but styling is limited, line rendering can feel less “native” to the map, and you typically lose the modern Mapbox-style ecosystem.

- **Is MapLibre an “umbrella service”?**
  - **MapLibre is a client library (and ecosystem), not a map-data service**. MapLibre GL JS renders the map in the browser using a **style URL** that points to vector tiles and sprite/fonts. See the MapLibre GL JS docs: [MapLibre GL JS docs](https://maplibre.org/maplibre-gl-js/docs/) and the quickstart snippet showing `style: '…json'`.

- **Is OpenFreeMap a good choice for a free map service?**
  - For a learning project with **$0 spend and no API keys**, **yes**: OpenFreeMap explicitly offers a free public instance (“no limits”, “no registration”, “no API keys”) and a MapLibre style URL you can plug in directly. See [OpenFreeMap](https://openfreemap.org/) and their [Quick Start Guide](https://openfreemap.org/quick_start/).
  - Key trade-off: **no SLA/support guarantees** (they also state this). For a hobby/learning app it’s fine; for a production business app you’d eventually want a plan for self-hosting or a paid provider.

- **Pros/cons of building this in Next.js**
  - **Pros**: great React DX, routing, API routes if you later add persistence, easy deployment, good ecosystem.
  - **Cons/pitfalls**: MapLibre GL JS uses **WebGL + browser APIs**, so you must keep the map code **client-only** (no SSR). Also, CSS import and bundling details matter.

## Recommended architecture (simple, scalable later)

### Core stack

- **Framework**: Next.js (App Router)
- **Map rendering**: MapLibre GL JS (`maplibre-gl`) ([MapLibre GL JS docs](https://maplibre.org/maplibre-gl-js/docs/))
- **Free map tiles/styles**: OpenFreeMap style URL, e.g. `https://tiles.openfreemap.org/styles/liberty` ([OpenFreeMap Quick Start Guide](https://openfreemap.org/quick_start/))
- **Distance calculations**: a small geospatial library (commonly `@turf/turf`) to compute geodesic distances between coordinates.

### UI behavior (what you’ll implement)

- **Map page**: full-screen map + small overlay panel
- **Interaction**:
  - Click to add a point
  - Draw/update a polyline connecting points in order
  - Show:
    - total length (sum of segment distances)
    - optionally last segment distance
  - Buttons: Undo last point, Clear

### Data model (client-side only)

- Maintain in React state:
  - `points: Array<[lng, lat]>`
  - derived `line: GeoJSON LineString`
  - derived `totalDistanceMeters`
- Render into MapLibre as:
  - a GeoJSON source + line layer (for the polyline)
  - optionally a GeoJSON source + circle/symbol layer (for points)

### MapLibre layering approach

- Use the OpenFreeMap style as the base map.
- Add your own layers on top:
  - `source: 'measurements'` (GeoJSON)
  - `layer: 'measurement-line'` (line)
  - `layer: 'measurement-points'` (circles)

## Pitfalls to watch out for (important)

- **SSR/client-only**: initialize MapLibre only inside a client component (`"use client"`) and typically inside `useEffect`. Don’t import/use MapLibre in server components.
- **CSS requirement**: MapLibre’s CSS must be included for markers/popups/controls to render correctly (MapLibre docs mention this explicitly) ([MapLibre GL JS docs](https://maplibre.org/maplibre-gl-js/docs/)).
- **Attribution**:
  - OpenFreeMap says attribution is required and that MapLibre automatically adds it for web maps ([OpenFreeMap](https://openfreemap.org/)). Still verify the attribution control is visible and not removed.
- **Public tile dependency**: if OpenFreeMap has downtime, your app’s basemap won’t load. (OK for learning.)
- **CSP/worker constraints**: if you later add a strict Content Security Policy, MapLibre requires `worker-src blob:` / `child-src blob:` etc. ([MapLibre GL JS docs](https://maplibre.org/maplibre-gl-js/docs/)).
- **Mobile performance**: WebGL maps can be heavy on old phones; keep overlays light and avoid rerendering the whole map on every state change.
- **Custom styles**: OpenFreeMap notes that if you customize a style, you must **host the style JSON yourself** ([OpenFreeMap Quick Start Guide](https://openfreemap.org/quick_start/)). For $0, you can host it as a static file in your Next app later.

## Rough build sequence (what you’d do first)

- Create a Next.js page with a full-height map container.
- Add MapLibre GL JS and load OpenFreeMap’s `liberty` style.
- Implement click handler to append points.
- Add/update a GeoJSON source for the line/points.
- Compute distance client-side and display it in an overlay.
- Add undo/clear.

## Future upgrades (still optional)

- Snap-to-road routing distance (this would require a routing engine/service; not $0 at scale).
- Persistence (store GeoJSON in a DB) via Next route handlers.
- Export/import drawings as GeoJSON.
