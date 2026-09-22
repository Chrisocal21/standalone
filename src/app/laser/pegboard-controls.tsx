"use client";

import { PegboardSpec } from "@/lib/pegboard";
import { LengthUnit } from "@/lib/units";
import { CollapsibleSection, FieldSpec, NumberField } from "./field";
import styles from "./box-tool.module.css";

type NumericField = keyof PegboardSpec;

const dimensionFields: FieldSpec<NumericField>[] = [
  { key: "width", label: "Width", unit: "mm", step: 1, min: 0 },
  { key: "height", label: "Height", unit: "mm", step: 1, min: 0 },
  { key: "materialThickness", label: "Material thickness", unit: "mm", step: 0.5, min: 0 },
  { key: "kerf", label: "Kerf", unit: "mm", step: 0.01, min: 0 },
];

const holeFields: FieldSpec<NumericField>[] = [
  { key: "holeDiameter", label: "Hole diameter", unit: "mm", step: 0.05, min: 0 },
  { key: "holePitch", label: "Hole pitch", unit: "mm", step: 0.1, min: 0 },
  { key: "margin", label: "Edge margin", unit: "mm", step: 1, min: 0 },
];

const mountingFields: FieldSpec<NumericField>[] = [
  { key: "mountingHoleDiameter", label: "Mounting hole diameter", unit: "mm", step: 0.5, min: 0 },
  { key: "mountingHoleInset", label: "Mounting hole inset", unit: "mm", step: 1, min: 0 },
];

interface PegboardControlsProps {
  spec: PegboardSpec;
  setSpec: (updater: (current: PegboardSpec) => PegboardSpec) => void;
  unit: LengthUnit;
}

export default function PegboardControls({ spec, setSpec, unit }: PegboardControlsProps) {
  function updateField(key: NumericField, value: number) {
    setSpec((current) => ({ ...current, [key]: value }));
  }

  return (
    <>
      <CollapsibleSection title="Dimensions">
        <div className={styles.fields}>
          {dimensionFields.map((field) => (
            <NumberField key={field.key} field={field} value={spec[field.key]} onChange={(value) => updateField(field.key, value)} unit={unit} />
          ))}
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Peg holes" defaultOpen={false}>
        <div className={styles.fields}>
          {holeFields.map((field) => (
            <NumberField key={field.key} field={field} value={spec[field.key]} onChange={(value) => updateField(field.key, value)} unit={unit} />
          ))}
        </div>
        <p className={`${styles.hintText} mono`}>defaults match the real-world pegboard standard: 6.35mm holes on a 25.4mm pitch</p>
      </CollapsibleSection>

      <CollapsibleSection title="Wall mounting" defaultOpen={false}>
        <div className={styles.fields}>
          {mountingFields.map((field) => (
            <NumberField key={field.key} field={field} value={spec[field.key]} onChange={(value) => updateField(field.key, value)} unit={unit} />
          ))}
        </div>
      </CollapsibleSection>
    </>
  );
}
