"use client";

import maplibregl, { type Map as MapLibreMap } from "maplibre-gl";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  distanceMeters,
  formatDistance,
  polylineDistanceMeters,
  type LngLat,
} from "../lib/geo";
import SavedRuns from "./SavedRuns";

const OPENFREEMAP_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
const MEASUREMENT_SOURCE_ID = "measurement";
const MEASUREMENT_LINE_LAYER_ID = "measurement-line";
const MEASUREMENT_POINTS_LAYER_ID = "measurement-points";

function toMeasurementGeoJson(points: LngLat[]) {
  const features: GeoJSON.Feature[] = [];

  points.forEach((p, idx) => {
    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [p.lng, p.lat] },
      properties: { index: idx },
    });
  });

  if (points.length >= 2) {
    features.push({
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: points.map((p) => [p.lng, p.lat]),
      },
      properties: {},
    });
  }

  return {
    type: "FeatureCollection",
    features,
  } as const satisfies GeoJSON.FeatureCollection;
}

const Map = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const measurementSourceRef = useRef<maplibregl.GeoJSONSource | null>(null);
  const [points, setPoints] = useState<LngLat[]>([]);
  const pointsRef = useRef<LngLat[]>([]);
  const syncMeasurementSourceRef = useRef<(() => void) | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  const formattedDistance = useMemo(() => {
    if (points.length < 2) return "";
    return formatDistance(polylineDistanceMeters(points));
  }, [points]);

  useEffect(() => {
    if (!containerRef.current) return;
    if (mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: OPENFREEMAP_STYLE_URL,
      center: [17.984, 59.293],
      zoom: 16,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }));

    const resizeMap = () => {
      map.resize();
    };

    const syncMeasurementSource = () => {
      const source = measurementSourceRef.current;
      if (!source) return;
      source.setData(toMeasurementGeoJson(pointsRef.current));
    };
    syncMeasurementSourceRef.current = syncMeasurementSource;

    const handleLoad = () => {
      if (!map.getSource(MEASUREMENT_SOURCE_ID)) {
        map.addSource(MEASUREMENT_SOURCE_ID, {
          type: "geojson",
          data: toMeasurementGeoJson([]),
        });
      }

      const source = map.getSource(
        MEASUREMENT_SOURCE_ID,
      ) as maplibregl.GeoJSONSource;
      measurementSourceRef.current = source;

      if (!map.getLayer(MEASUREMENT_LINE_LAYER_ID)) {
        map.addLayer({
          id: MEASUREMENT_LINE_LAYER_ID,
          type: "line",
          source: MEASUREMENT_SOURCE_ID,
          filter: ["==", ["geometry-type"], "LineString"],
          layout: {
            "line-cap": "round",
            "line-join": "round",
          },
          paint: {
            "line-color": "#ef4444",
            "line-width": 4,
          },
        });
      }

      if (!map.getLayer(MEASUREMENT_POINTS_LAYER_ID)) {
        map.addLayer({
          id: MEASUREMENT_POINTS_LAYER_ID,
          type: "circle",
          source: MEASUREMENT_SOURCE_ID,
          filter: ["==", ["geometry-type"], "Point"],
          paint: {
            "circle-radius": 7,
            "circle-color": [
              "case",
              ["==", ["get", "index"], 0],
              "#22c55e",
              "#3b82f6",
            ],
            "circle-stroke-width": 2,
            "circle-stroke-color": "#ffffff",
          },
        });
      }

      // If the user managed to set state before the style finished loading,
      // ensure the rendered layers catch up as soon as the source exists.
      syncMeasurementSource();
    };

    map.on("load", handleLoad);
    window.addEventListener("resize", resizeMap);

    requestAnimationFrame(() => {
      map.resize();
    });

    const handleClick = (e: maplibregl.MapMouseEvent) => {
      const nextPoint: LngLat = { lng: e.lngLat.lng, lat: e.lngLat.lat };
      pointsRef.current = [...pointsRef.current, nextPoint];
      setPoints([...pointsRef.current]);
      syncMeasurementSource();
    };

    map.on("click", handleClick);

    mapRef.current = map;

    return () => {
      window.removeEventListener("resize", resizeMap);
      map.off("click", handleClick);
      map.off("load", handleLoad);
      mapRef.current?.remove();
      mapRef.current = null;
      measurementSourceRef.current = null;
      syncMeasurementSourceRef.current = null;
    };
  }, []);

  const clear = () => {
    pointsRef.current = [];
    setPoints([]);
    syncMeasurementSourceRef.current?.();
  };

  const undo = () => {
    if (pointsRef.current.length === 0) return;
    pointsRef.current = pointsRef.current.slice(0, -1);
    setPoints([...pointsRef.current]);
    syncMeasurementSourceRef.current?.();
  };

  const saveRun = () => {
    if (pointsRef.current.length < 2) return;
    try {
      const raw = localStorage.getItem("runs");
      const runs = raw ? JSON.parse(raw) : [];
      const run = {
        id: Date.now(),
        createdAt: new Date().toISOString(),
        points: pointsRef.current,
      };
      runs.push(run);
      localStorage.setItem("runs", JSON.stringify(runs));
      window.dispatchEvent(new Event("runsUpdated"));
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 3500);
    } catch (err) {
      // swallow storage errors but log for debugging
      // eslint-disable-next-line no-console
      //
      console.error("Failed to save run", err);
    }
  };

  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="absolute inset-0" />

      <div className="pointer-events-none absolute left-3 right-3 top-3 z-10 w-[min(350px,calc(100%-24px))] rounded-lg border border-black/10 bg-white/90 p-3 text-sm shadow backdrop-blur sm:left-3 sm:right-auto sm:w-[min(350px,calc(100%-24px))]">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-medium">Current run</div>
            {justSaved && (
              <div className="rounded-full bg-green-500 px-2 py-0.5 text-xs text-white">
                Saved
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={undo}
              disabled={points.length === 0}
              className="pointer-events-auto rounded-md bg-black/5 px-2 py-1 text-xs hover:bg-black/10 disabled:opacity-40"
            >
              Undo
            </button>
            <button
              type="button"
              onClick={saveRun}
              disabled={points.length < 2}
              className="pointer-events-auto rounded-md bg-black/5 px-2 py-1 text-xs hover:bg-black/10 disabled:opacity-40"
            >
              Save
            </button>
            <button
              type="button"
              onClick={clear}
              className="pointer-events-auto rounded-md bg-black/5 px-2 py-1 text-xs hover:bg-black/10"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="mt-2 space-y-1">
          <div>
            <span className="font-medium">Points:</span> {points.length}
          </div>
          <div>
            <span className="font-medium">Distance:</span>{" "}
            {formattedDistance || "—"}
          </div>
        </div>
      </div>
      <SavedRuns
        onLoad={(run) => {
          pointsRef.current = run.points;
          setPoints([...run.points]);
          syncMeasurementSourceRef.current?.();
        }}
      />
    </div>
  );
};

export default Map;
