"use client";

import { PocketSpec } from "@/lib/gcode-pocket";
import { LengthUnit } from "@/lib/units";
import { CheckboxField, CollapsibleSection, FieldSpec, NumberField } from "./field";
import styles from "./cnc-tool.module.css";

const sizeFields: FieldSpec<"pocketWidth" | "pocketLength" | "totalDepth" | "depthPerPass">[] = [
  { key: "pocketWidth", label: "Pocket width", unit: "", step: 1, min: 1 },
  { key: "pocketLength", label: "Pocket length", unit: "", step: 1, min: 1 },
  { key: "totalDepth", label: "Total depth", unit: "", step: 0.5, min: 0.1 },
  { key: "depthPerPass", label: "Depth per pass", unit: "", step: 0.5, min: 0.1 },
];

const bitFields: FieldSpec<"bitDiameter" | "stepoverPercent">[] = [
  { key: "bitDiameter", label: "Bit diameter", unit: "", step: 0.1, min: 0.1 },
  { key: "stepoverPercent", label: "Stepover (% of bit diameter)", unit: "%", step: 5, min: 1, isLength: false },
];

const rateFields: FieldSpec<"feedRateMmMin" | "plungeRateMmMin" | "spindleRpm" | "safeHeightMm">[] = [
  { key: "feedRateMmMin", label: "Feed rate", unit: "mm/min", step: 50, min: 1, isLength: false },
  { key: "plungeRateMmMin", label: "Plunge rate", unit: "mm/min", step: 25, min: 1, isLength: false },
  { key: "spindleRpm", label: "Spindle speed", unit: "rpm", step: 500, min: 1000, isLength: false },
  { key: "safeHeightMm", label: "Safe height (retract Z)", unit: "", step: 1, min: 1 },
];

export default function PocketControls({
  spec,
  setSpec,
  unit,
}: {
  spec: PocketSpec;
  setSpec: (spec: PocketSpec) => void;
  unit: LengthUnit;
}) {
  function set<K extends keyof PocketSpec>(key: K, value: PocketSpec[K]) {
    setSpec({ ...spec, [key]: value });
  }

  return (
    <>
      <CollapsibleSection title="Pocket size">
        <div className={styles.fields}>
          {sizeFields.map((field) => (
            <NumberField key={field.key} field={field} value={spec[field.key]} onChange={(v) => set(field.key, v)} unit={unit} />
          ))}
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Bit & stepover">
        <div className={styles.fields}>
          {bitFields.map((field) => (
            <NumberField key={field.key} field={field} value={spec[field.key]} onChange={(v) => set(field.key, v)} unit={unit} />
          ))}
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Rates">
        <div className={styles.fields}>
          {rateFields.map((field) => (
            <NumberField key={field.key} field={field} value={spec[field.key]} onChange={(v) => set(field.key, v)} unit={unit} />
          ))}
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Finishing" defaultOpen={false}>
        <CheckboxField label="Add a perimeter finishing pass at each depth" checked={spec.finishPass} onChange={(v) => set("finishPass", v)} />
      </CollapsibleSection>
    </>
  );
}
