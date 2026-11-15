import { Ruler, Trash2, Undo2 } from "lucide-react";
import type { GeoPoint } from "@/types/firescope";
import { formatNumber } from "@/lib/fire";

export function MeasurementControls({
  active, points, bufferKm, distanceKm, nearbyFires, firesReady,
  onToggle, onBufferChange, onUndo, onClear,
}: {
  active: boolean;
  points: GeoPoint[];
  bufferKm: number;
  distanceKm: number | null;
  nearbyFires: number;
  firesReady: boolean;
  onToggle: () => void;
  onBufferChange: (km: number) => void;
  onUndo: () => void;
  onClear: () => void;
}) {
  return (
    <div className="panel space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="eyebrow">Fire distance tool</p>
        <Ruler className="h-4 w-4 text-accent" aria-hidden="true" />
      </div>
      <button className={active ? "btn-primary w-full" : "seg w-full border border-input"}
        onClick={onToggle} aria-pressed={active}>
        {active ? "Finish measuring" : "Measure on globe"}
      </button>
      {active && (
        <p className="text-xs text-muted-foreground">
          {points.length === 0 ? "Click the globe to place the start point."
            : points.length === 1 ? "Click a second point to complete the line."
            : "Line complete. Clear it to measure again."}
        </p>
      )}
      {points.length > 0 && (
        <>
          {distanceKm !== null && (
            <div className="rounded-md bg-secondary p-2">
              <p className="text-xs text-muted-foreground">Great-circle length</p>
              <p className="font-mono text-lg text-foreground">{formatNumber(distanceKm, 1)} km</p>
            </div>
          )}
          <label className="block text-sm">
            <span className="text-muted-foreground">Nearby-fire buffer</span>
            <select className="field" value={bufferKm} onChange={(e) => onBufferChange(Number(e.target.value))}>
              {[25, 50, 100].map((km) => <option key={km} value={km}>{km} km from line</option>)}
            </select>
          </label>
          {distanceKm !== null && (
            <p className="text-xs text-muted-foreground">
              {firesReady ? <><b className="text-foreground">{formatNumber(nearbyFires)}</b> visible fire pixels within {bufferKm} km</>
                : "Turn on live fire pixels to count nearby detections."}
            </p>
          )}
          <div className="flex gap-2">
            <button className="seg flex flex-1 items-center justify-center gap-1 border border-input"
              onClick={onUndo} aria-label="Remove last measurement point">
              <Undo2 className="h-3.5 w-3.5" /> Undo
            </button>
            <button className="seg flex flex-1 items-center justify-center gap-1 border border-input"
              onClick={onClear} aria-label="Clear measurement">
              <Trash2 className="h-3.5 w-3.5" /> Clear
            </button>
          </div>
        </>
      )}
    </div>
  );
}
