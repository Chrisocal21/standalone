"use client";

import { Material, MATERIALS, MATERIAL_LABELS } from "@/lib/feeds-and-speeds";
import { LengthUnit } from "@/lib/units";
import { CollapsibleSection, NumberField, Segmented } from "./field";
import styles from "./cnc-tool.module.css";

export interface CncInputState {
  material: Material;
  bitDiameterMm: number;
  flutes: number;
  rpm: number;
  chipLoadMm: number;
  stepoverPercent: number;
  depthOfCutMm: number;
}

export const DEFAULT_CNC_INPUT: CncInputState = {
  material: "plywood",
  bitDiameterMm: 6.35,
  flutes: 2,
  rpm: 18000,
  chipLoadMm: 0.1,
  stepoverPercent: 50,
  depthOfCutMm: 3,
};

const materialLabels = MATERIAL_LABELS;

export default function FeedsControls({
  input,
  setInput,
  unit,
}: {
  input: CncInputState;
  setInput: (input: CncInputState) => void;
  unit: LengthUnit;
}) {
  function set<K extends keyof CncInputState>(key: K, value: CncInputState[K]) {
    setInput({ ...input, [key]: value });
  }

  return (
    <>
      <CollapsibleSection title="Material & bit">
        <div className={styles.field} style={{ marginBottom: 14 }}>
          <span className={styles.fieldLabel}>Material</span>
          <Segmented options={MATERIALS} labels={materialLabels} value={input.material} onChange={(v) => set("material", v)} ariaLabel="Material" columns={2} />
        </div>
        <div className={styles.fields}>
          <NumberField
            field={{ key: "bitDiameterMm", label: "Bit diameter", unit: "", step: 0.1, min: 0.1 }}
            value={input.bitDiameterMm}
            onChange={(v) => set("bitDiameterMm", v)}
            unit={unit}
          />
          <NumberField
            field={{ key: "flutes", label: "Flute count", unit: "", step: 1, min: 1, isLength: false }}
            value={input.flutes}
            onChange={(v) => set("flutes", Math.round(v))}
            unit={unit}
          />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Spindle">
        <div className={styles.fields}>
          <NumberField
            field={{ key: "rpm", label: "Spindle speed", unit: "rpm", step: 500, min: 1000, isLength: false }}
            value={input.rpm}
            onChange={(v) => set("rpm", v)}
            unit={unit}
          />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Cut parameters">
        <div className={styles.fields}>
          <NumberField
            field={{ key: "chipLoadMm", label: "Chip load (per tooth)", unit: "", step: 0.01, min: 0.001 }}
            value={input.chipLoadMm}
            onChange={(v) => set("chipLoadMm", v)}
            unit={unit}
          />
          <NumberField
            field={{ key: "stepoverPercent", label: "Stepover (% of bit diameter)", unit: "%", step: 5, min: 1, isLength: false }}
            value={input.stepoverPercent}
            onChange={(v) => set("stepoverPercent", v)}
            unit={unit}
          />
          <NumberField
            field={{ key: "depthOfCutMm", label: "Depth of cut (per pass)", unit: "", step: 0.5, min: 0.1 }}
            value={input.depthOfCutMm}
            onChange={(v) => set("depthOfCutMm", v)}
            unit={unit}
          />
        </div>
      </CollapsibleSection>
    </>
  );
}
