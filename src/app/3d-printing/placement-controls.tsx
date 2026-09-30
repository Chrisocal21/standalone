"use client";

import { LengthUnit, fromMm } from "@/lib/units";
import { CollapsibleSection, NumberField, Segmented } from "./field";
import styles from "./print-tool.module.css";

export interface Placement {
  x: number;
  y: number;
  z: number;
}

export const ORIGIN_PLACEMENT: Placement = { x: 0, y: 0, z: 0 };

/** Grid steps in mm — fixed regardless of display unit, like a CAD workplane's snap grid, so switching units doesn't change what "one nudge" means. Segmented needs string options, so the mm value is also the key. */
const GRID_STEP_OPTIONS = ["1", "5", "10", "25"] as const;
export type GridStepOption = (typeof GRID_STEP_OPTIONS)[number];
export const DEFAULT_GRID_STEP: GridStepOption = "5";

export default function PlacementControls({
  placement,
  setPlacement,
  gridStep,
  setGridStep,
  unit,
}: {
  placement: Placement;
  setPlacement: (placement: Placement) => void;
  gridStep: GridStepOption;
  setGridStep: (step: GridStepOption) => void;
  unit: LengthUnit;
}) {
  const gridStepMm = Number(gridStep);

  function nudge(axis: keyof Placement, direction: 1 | -1) {
    setPlacement({ ...placement, [axis]: placement[axis] + gridStepMm * direction });
  }

  const stepLabels: Record<GridStepOption, string> = Object.fromEntries(
    GRID_STEP_OPTIONS.map((step) => {
      const displayValue = fromMm(Number(step), unit);
      return [step, `${displayValue % 1 === 0 ? displayValue : displayValue.toFixed(2)}${unit}`];
    }),
  ) as Record<GridStepOption, string>;

  return (
    <CollapsibleSection title="Placement (snap-to-grid)" defaultOpen={false}>
      <span className={styles.fieldLabel}>Nudge step</span>
      <div style={{ marginTop: 6, marginBottom: 14 }}>
        <Segmented options={GRID_STEP_OPTIONS} labels={stepLabels} value={gridStep} onChange={setGridStep} ariaLabel="Grid step" columns={4} />
      </div>

      {(["x", "y", "z"] as const).map((axis) => (
        <div key={axis} className={styles.field} style={{ marginBottom: 12 }}>
          <span className={styles.fieldLabel}>{axis.toUpperCase()} offset</span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button type="button" className={`${styles.converterToggle} mono`} onClick={() => nudge(axis, -1)} aria-label={`Nudge ${axis} negative`}>
              &minus;
            </button>
            <div style={{ flex: 1 }}>
              <NumberField
                field={{ key: axis, label: "", unit: "", step: gridStepMm, isLength: true }}
                value={placement[axis]}
                onChange={(v) => setPlacement({ ...placement, [axis]: v })}
                unit={unit}
              />
            </div>
            <button type="button" className={`${styles.converterToggle} mono`} onClick={() => nudge(axis, 1)} aria-label={`Nudge ${axis} positive`}>
              +
            </button>
          </div>
        </div>
      ))}

      <button type="button" className={`${styles.converterToggle} mono`} onClick={() => setPlacement(ORIGIN_PLACEMENT)}>
        Reset to origin
      </button>
    </CollapsibleSection>
  );
}
