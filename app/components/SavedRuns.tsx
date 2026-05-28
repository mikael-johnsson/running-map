"use client";

import { useEffect, useState } from "react";
import { polylineDistanceMeters, formatDistance } from "../lib/geo";
import type { LngLat } from "../lib/geo";

type Run = {
  id: number;
  createdAt: string;
  points: LngLat[];
};

export default function SavedRuns({ onLoad }: { onLoad: (run: Run) => void }) {
  const [runs, setRuns] = useState<Run[]>([]);

  const loadRuns = () => {
    try {
      const raw = localStorage.getItem("runs");
      const parsed = raw ? JSON.parse(raw) : [];
      setRuns(parsed);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Failed to load runs", err);
      setRuns([]);
    }
  };

  useEffect(() => {
    loadRuns();
    const onStorage = (e: StorageEvent) => {
      if (e.key === "runs") loadRuns();
    };
    const onCustom = () => loadRuns();
    window.addEventListener("storage", onStorage);
    window.addEventListener("runsUpdated", onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("runsUpdated", onCustom);
    };
  }, []);

  if (!runs || runs.length === 0) {
    return (
      <div className="pointer-events-auto absolute left-3 top-40 z-20 w-64 rounded-lg border border-black/10 bg-white/90 p-2 text-sm shadow">
        <div className="font-medium">Saved runs</div>
        <div className="mt-2 text-xs text-gray-500">No saved runs</div>
      </div>
    );
  }

  return (
    <div className="pointer-events-auto absolute left-3 top-40 z-20 w-64 rounded-lg border border-black/10 bg-white/90 p-2 text-sm shadow">
      <div className="font-medium">Saved runs</div>
      <div className="mt-2 space-y-2 max-h-60 overflow-auto">
        {runs.map((r) => (
          <button
            key={r.id}
            onClick={() => onLoad(r)}
            className="w-full text-left rounded px-2 py-1 hover:bg-black/5"
          >
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-700">
                {new Date(r.createdAt).toLocaleString()}
              </div>
              <div className="text-xs font-mono">
                {formatDistance(polylineDistanceMeters(r.points))}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
