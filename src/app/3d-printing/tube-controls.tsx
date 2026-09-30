"use client";

import { TubeSpec } from "@/lib/solids";
import { LengthUnit } from "@/lib/units";
import { FieldSpec, NumberField } from "./field";
import styles from "./print-tool.module.css";

const FIELDS: FieldSpec<"outerDiameter" | "innerDiameter" | "height">[] = [
  { key: "outerDiameter", label: "Outer diameter", unit: "", step: 0.5, min: 0.5 },
  { key: "innerDiameter", label: "Inner diameter (0 = solid rod)", unit: "", step: 0.5, min: 0 },
  { key: "height", label: "Height", unit: "", step: 0.5, min: 0.5 },
];

export default function TubeControls({ spec, setSpec, unit }: { spec: TubeSpec; setSpec: (spec: TubeSpec) => void; unit: LengthUnit }) {
  function set<K extends keyof TubeSpec>(key: K, value: TubeSpec[K]) {
    setSpec({ ...spec, [key]: value });
  }

  return (
    <div className={styles.fields}>
      {FIELDS.map((field) => (
        <NumberField key={field.key} field={field} value={spec[field.key]} onChange={(v) => set(field.key, v)} unit={unit} />
      ))}
    </div>
  );
}
