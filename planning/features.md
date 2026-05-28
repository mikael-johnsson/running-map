# Plans for features to be implemented

## MapLibre map rendering (OpenFreeMap basemap)

Short description:
- Render an interactive map in the `Map` component using **MapLibre GL JS** (client-side WebGL) with the **OpenFreeMap** style URL as the basemap.

Acceptance criteria:
- The home page renders a full-size map (not just “Map” text).
- Map loads **without any API key** using OpenFreeMap style URL `https://tiles.openfreemap.org/styles/liberty` ([OpenFreeMap quick start](https://openfreemap.org/quick_start/)).
- Map is initialized **client-side only** (no SSR crash / “window is not defined” errors).
- MapLibre default CSS is loaded so controls/attribution render correctly ([MapLibre GL JS docs](https://maplibre.org/maplibre-gl-js/docs/)).
- Attribution control is visible (do not disable/remove it).
- No console errors on initial load and on page refresh.

Files to change (paths):
- [`app/components/Map.tsx`](../app/components/Map.tsx)
- [`app/globals.css`](../app/globals.css) (or a dedicated CSS import location if preferred)
- [`app/page.tsx`](../app/page.tsx) (optional: layout/styling wrapper)
- `package.json` (add dependency: `maplibre-gl`)

Proposed API contract:
- None (client-only feature, no backend needed).

Step-by-step implementation (small tasks):
1. Add MapLibre dependency
   - Install `maplibre-gl` via npm.
2. Ensure MapLibre CSS is loaded
   - Option A (simplest): import `maplibre-gl/dist/maplibre-gl.css` in `app/globals.css` (or import in `app/layout.tsx` via a global CSS import approach).
   - Confirm the CSS is only included once.
3. Update `Map` component to mount MapLibre safely in Next.js
   - Keep `"use client"` at the top of `app/components/Map.tsx`.
   - Create a `div` container with a stable `ref` (e.g. `useRef<HTMLDivElement | null>(null)`).
   - In `useEffect`, create the map instance only when the container exists.
   - Use `style: 'https://tiles.openfreemap.org/styles/liberty'`, plus a default `center` and `zoom`.
   - Store the map instance in a `ref` so you don’t re-create it on every re-render.
   - On unmount, call `map.remove()` to avoid memory leaks during Fast Refresh.
4. Layout/styling
   - Make the map container fill available space (e.g. `min-h-screen` or a fixed height) so it’s visibly rendered.
   - Optional: ensure the page wrapper allows the map to expand (your `body` is `flex flex-col` already; make sure the map wrapper can grow).
5. Basic smoke checks
   - `npm run dev`: confirm the map renders and is interactive.
   - Refresh the page: confirm it still loads.
   - Inspect console: no errors.

Testing / verification:
- Manual:
  - Open `/` and confirm the map loads and you can pan/zoom.
  - Hard refresh (Cmd+Shift+R): map still loads.
  - Verify attribution is visible in the map corner.
- Automated (optional for now):
  - Add a simple Playwright test later that asserts the map container exists and that the attribution control is present.

Suggested reviewers:
- Someone comfortable with Next.js App Router + client components.
- Someone familiar with WebGL map initialization patterns (MapLibre/Mapbox GL style).

Effort estimate:
- Small (1–2 hours)

## Two-point line distance (v1)

Short description:
- Let the user click **two points** on the map to draw a line segment and show the **straight-line (geodesic)** distance between them, formatted as meters/kilometers.

Acceptance criteria:
- First click sets a visible **Start** point.
- Second click sets a visible **End** point and draws a visible **LineString** between them.
- A distance readout is shown and formatted as:
  - `<1000m` → `xxx m`
  - `>=1000m` → `x.xx km`
- Third click starts a new measurement (new Start; End cleared).
- A **Clear** action removes start/end/line and resets the distance readout.
- No console errors on click, refresh, or hot reload.

Files to change (paths):
- [`app/components/Map.tsx`](../app/components/Map.tsx)
- Add a helper (preferred): [`app/lib/geo.ts`](../app/lib/geo.ts)
- (Optional) add a lightweight overlay component: `app/components/MeasurementOverlay.tsx`

Proposed API contract:
- None (client-only; no backend needed).

Step-by-step implementation (small tasks):
1. Add measurement state and click behavior
   - Track `start` and `end` coordinates.
   - Map click flow: 1st click sets Start, 2nd sets End, 3rd resets (Start=new click; End cleared).
2. Add distance + formatting helper
   - Implement Haversine `distanceMeters(start,end)`.
   - Implement `formatDistance(m)` → `\"850 m\"` or `\"1.42 km\"`.
3. Add GeoJSON source + layers for the measurement
   - On `map.on('load')`, create a GeoJSON source (e.g. `measurement`).
   - Add layers:
     - `measurement-line` (`type: 'line'`)
     - `measurement-points` (`type: 'circle'`)
4. Update the GeoJSON source on each click
   - Build a `FeatureCollection` containing:
     - 0–2 Point features (start/end)
     - 0–1 LineString feature (when both points exist)
   - Call `source.setData(...)` to re-render.
5. Add a small overlay UI + Clear button
   - Show start/end coordinates (when present) and the formatted distance.
   - Clear resets state and updates the GeoJSON source to an empty collection.
6. Cleanup + guardrails (Fast Refresh safe)
   - Remove click handler on unmount (`map.off('click', handler)`).
   - Guard against re-adding sources/layers (`map.getSource(...)`, `map.getLayer(...)`).

Testing / verification:
- Manual:
  - Click once → start marker appears.
  - Click twice → end marker + line + distance appears.
  - Click a third time → new start marker replaces; end/line/distance reset.
  - Press Clear → markers/line removed and distance cleared.
  - Refresh the page → no console errors.
- Sanity checks:
  - Very short line shows meters.
  - Longer line shows km.

Suggested reviewers:
- Someone comfortable with MapLibre GL JS sources/layers and event handlers.

Effort estimate:
- Small to medium (2–4 hours)

## Multi-point polyline measurement (v2)

Short description:
- Replace the 2-point measurement with a **multi-point polyline**: every click appends a point, the polyline connects all points, and total distance is the **sum of all segment distances**. This allows the user to approximate “following a road” by clicking multiple points along it (no snapping).

Acceptance criteria:
- Each click adds a new point marker.
- When there are 2+ points, a polyline is drawn connecting them in click order.
- Total distance equals the sum of segment distances:
  - \(\\sum_{i=1}^{n-1} d(p_i,p_{i+1})\\)
- Distance formatting:
  - `<1000m` → `xxx m`
  - `>=1000m` → `x.xx km`
- **Undo** removes the last point and updates markers/line/distance.
- **Clear** removes all points and resets the measurement.
- No duplicated click handlers after hot reload.

Files to change (paths):
- [`app/components/Map.tsx`](../app/components/Map.tsx)
- [`app/lib/geo.ts`](../app/lib/geo.ts) (add `polylineDistanceMeters(points)` helper)

Proposed API contract:
- None (client-only; no backend needed).

Step-by-step implementation (small tasks):
1. Replace `start/end` with `points[]`
   - Use `points: LngLat[]` state for UI and a `pointsRef` for MapLibre event handlers.
2. Update click behavior
   - On every click, append the clicked coordinate to `pointsRef.current`, then `setPoints([...pointsRef.current])`.
3. Update GeoJSON builder
   - Replace `toMeasurementGeoJson(start,end)` with `toMeasurementGeoJson(points)`.
   - FeatureCollection should include:
     - N Point features (`index: 0..N-1`)
     - 1 LineString feature when N>=2 connecting all points in order
4. Add polyline distance helper
   - Implement `polylineDistanceMeters(points)` using existing `distanceMeters` in a loop.
   - Compute formatted distance from `points`.
5. Update overlay controls
   - Show point count and total distance.
   - Add **Undo** button (disabled when 0 points) that pops the last point and syncs GeoJSON + distance.
   - Keep **Clear** to reset all.
6. Cleanup/guardrails
   - Ensure sources/layers are only added once.
   - Ensure map event handlers are removed on unmount.

Testing / verification:
- Manual:
  - Click 1 time → 1 marker, distance is `0 m`.
  - Click 3+ times → polyline is drawn and distance increases as expected.
  - Undo repeatedly → markers/line update; when going from 2→1 points the line disappears.
  - Clear → everything removed.
  - Refresh + repeat → no duplicate point adds per click.

Suggested reviewers:
- Someone comfortable with MapLibre GL JS GeoJSON sources/layers.

Effort estimate:
- Small to medium (2–4 hours)
