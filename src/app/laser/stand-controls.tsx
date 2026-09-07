"use client";

import { StandSpec } from "@/lib/stand";
import { FieldSpec, NumberField } from "./field";
import styles from "./box-tool.module.css";

type NumericField = keyof StandSpec;

const dimensionFields: FieldSpec<NumericField>[] = [
  { key: "legWidth", label: "Leg width", unit: "mm", step: 1, min: 0 },
  { key: "legHeight", label: "Leg height", unit: "mm", step: 1, min: 0 },
  { key: "materialThickness", label: "Material thickness", unit: "mm", step: 0.5, min: 0 },
  { key: "kerf", label: "Kerf", unit: "mm", step: 0.01, min: 0 },
];

interface StandControlsProps {
  spec: StandSpec;
  setSpec: (updater: (current: StandSpec) => StandSpec) => void;
}

export default function StandControls({ spec, setSpec }: StandControlsProps) {
  function updateField(key: NumericField, value: number) {
    setSpec((current) => ({ ...current, [key]: value }));
  }

  return (
    <>
      <h2 className={`${styles.sectionLabel} mono`}>dimensions</h2>
      <div className={styles.fields}>
        {dimensionFields.map((field) => (
          <NumberField key={field.key} field={field} value={spec[field.key]} onChange={(value) => updateField(field.key, value)} />
        ))}
      </div>
      <p className={`${styles.hintText} mono`}>
        two identical legs cross-lap into a free-standing X; right angle only, no lean angle yet
      </p>
    </>
  );
}
