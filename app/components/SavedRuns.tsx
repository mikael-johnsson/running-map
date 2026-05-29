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

  const deleteRun = (runId: number) => {
    try {
      const raw = localStorage.getItem("runs");
      const parsed = raw ? JSON.parse(raw) : [];
      const nextRuns = parsed.filter((run: Run) => run.id !== runId);
      localStorage.setItem("runs", JSON.stringify(nextRuns));
      window.dispatchEvent(new Event("runsUpdated"));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Failed to delete run", err);
    }
  };

  if (!runs || runs.length === 0) {
    return (
      <div className="pointer-events-auto absolute left-3 right-3 top-40 z-20 w-64 rounded-lg border border-black/10 bg-white/90 p-2 text-sm shadow sm:left-3 sm:right-auto">
        <div className="font-medium">Saved runs</div>
        <div className="mt-2 text-xs text-gray-500">No saved runs</div>
      </div>
    );
  }

  return (
    <div className="pointer-events-auto absolute left-3 right-3 top-40 z-20 w-64 rounded-lg border border-black/10 bg-white/90 p-2 text-sm shadow sm:left-3 sm:right-auto">
      <div className="font-medium">Saved runs</div>
      <div className="mt-2 space-y-2 max-h-60 overflow-auto">
        {runs.map((r) => (
          <div key={r.id} className="rounded px-2 py-1 hover:bg-black/5">
            <div className="flex items-start justify-between gap-2">
              <button
                type="button"
                onClick={() => onLoad(r)}
                className="min-w-0 flex-1 text-left"
              >
                <div className="text-xs text-gray-700">
                  {new Date(r.createdAt).toLocaleString()}
                </div>
                <div className="text-xs font-mono">
                  {formatDistance(polylineDistanceMeters(r.points))}
                </div>
              </button>
              <button
                type="button"
                onClick={() => deleteRun(r.id)}
                className="shrink-0 rounded bg-black/5 px-2 py-1 text-[11px] hover:bg-black/10"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
