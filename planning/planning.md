# Multi-point polyline measurement (v2)

Status: Step 1 implemented (in-progress flow)

## Step 1 — Replace `start`/`end` with `points[]`

What I implemented:

- Replaced `start`/`end` state with `points: LngLat[]` in `app/components/Map.tsx`.
- Added `pointsRef` to keep a mutable reference for MapLibre event handlers.
- Updated the click handler to append clicked coordinates to `pointsRef` and set `points` state.
- Replaced the measurement GeoJSON builder to accept `points[]` and produce N Point features plus a LineString when N>=2.
- Updated the overlay UI to show `Points:` (count) and the computed total distance (sum of segment distances).
- Updated the `clear()` handler to reset `pointsRef` and `points`.

Files changed:

- [app/components/Map.tsx](app/components/Map.tsx)

Notes / Rationale:

- This change keeps the map event handlers working with a stable mutable reference (`pointsRef`) while keeping React state (`points`) in sync for rendering the overlay.
- Distance is currently computed in the component using the existing `distanceMeters` helper; later we will extract a `polylineDistanceMeters` helper into `app/lib/geo.ts` (planned step 4).

Next steps (awaiting your approval before continuing):

1. Update click behavior to support Undo and Clear UI actions (step 2)
2. Add `polylineDistanceMeters(points)` helper to `app/lib/geo.ts` (step 4)
3. Update any tests / manual verification steps

Tell me when to continue to the next step or if you want adjustments for step 1.
