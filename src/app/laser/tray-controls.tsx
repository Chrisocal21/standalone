"use client";

import { TraySpec } from "@/lib/tray";
import { JOINT_TYPES, JointType } from "@/lib/geometry";
import { FieldSpec, NumberField, Segmented } from "./field";
import styles from "./box-tool.module.css";

type NumericField = Extract<keyof TraySpec, "width" | "depth" | "height" | "materialThickness" | "kerf" | "fingers" | "cornerRadius" | "rows" | "columns">;

const dimensionFields: FieldSpec<NumericField>[] = [
  { key: "width", label: "Width", unit: "mm", step: 1, min: 0 },
  { key: "depth", label: "Depth", unit: "mm", step: 1, min: 0 },
  { key: "height", label: "Height", unit: "mm", step: 1, min: 0 },
  { key: "materialThickness", label: "Material thickness", unit: "mm", step: 0.5, min: 0 },
  { key: "kerf", label: "Kerf", unit: "mm", step: 0.01, min: 0 },
];

const fingerField: FieldSpec<NumericField> = { key: "fingers", label: "Fingers per edge", unit: "", step: 2, min: 2 };
const cornerRadiusField: FieldSpec<NumericField> = { key: "cornerRadius", label: "Corner radius", unit: "mm", step: 0.1, min: 0 };
const rowField: FieldSpec<NumericField> = { key: "rows", label: "Dividers (width-wise)", unit: "", step: 1, min: 0 };
const columnField: FieldSpec<NumericField> = { key: "columns", label: "Dividers (depth-wise)", unit: "", step: 1, min: 0 };

const jointLabels: Record<JointType, string> = {
  finger: "Finger",
  dovetail: "Dovetail",
  rabbet: "Rabbet",
  mortise_tenon: "Mortise/tenon",
};

interface TrayControlsProps {
  spec: TraySpec;
  setSpec: (updater: (current: TraySpec) => TraySpec) => void;
}

export default function TrayControls({ spec, setSpec }: TrayControlsProps) {
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

      <h2 className={`${styles.sectionLabel} ${styles.sectionLabelSpaced} mono`}>joint</h2>
      <div className={styles.field}>
        <Segmented
          options={JOINT_TYPES}
          labels={jointLabels}
          value={spec.joint}
          onChange={(joint) => setSpec((current) => ({ ...current, joint }))}
          ariaLabel="Joint type"
        />
      </div>
      <div className={styles.fields}>
        {spec.joint === "finger" && <NumberField field={fingerField} value={spec.fingers} onChange={(value) => updateField("fingers", value)} />}
        <NumberField field={cornerRadiusField} value={spec.cornerRadius} onChange={(value) => updateField("cornerRadius", value)} />
      </div>

      <h2 className={`${styles.sectionLabel} ${styles.sectionLabelSpaced} mono`}>dividers</h2>
      <div className={styles.fields}>
        <NumberField field={rowField} value={spec.rows} onChange={(value) => updateField("rows", value)} />
        <NumberField field={columnField} value={spec.columns} onChange={(value) => updateField("columns", value)} />
      </div>
    </>
  );
}
