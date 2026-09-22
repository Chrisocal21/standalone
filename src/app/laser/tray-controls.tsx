"use client";

import { TraySpec } from "@/lib/tray";
import { JOINT_TYPES, JointType } from "@/lib/geometry";
import { LengthUnit } from "@/lib/units";
import { CollapsibleSection, FieldSpec, NumberField, PanelOmissionControl, Segmented } from "./field";
import styles from "./box-tool.module.css";

type NumericField = Extract<keyof TraySpec, "width" | "depth" | "height" | "materialThickness" | "kerf" | "fingers" | "cornerRadius" | "rows" | "columns">;

const dimensionFields: FieldSpec<NumericField>[] = [
  { key: "width", label: "Width", unit: "mm", step: 1, min: 0 },
  { key: "depth", label: "Depth", unit: "mm", step: 1, min: 0 },
  { key: "height", label: "Height", unit: "mm", step: 1, min: 0 },
  { key: "materialThickness", label: "Material thickness", unit: "mm", step: 0.5, min: 0 },
  { key: "kerf", label: "Kerf", unit: "mm", step: 0.01, min: 0 },
];

const fingerField: FieldSpec<NumericField> = { key: "fingers", label: "Fingers per edge", unit: "", step: 2, min: 2, isLength: false };
const cornerRadiusField: FieldSpec<NumericField> = { key: "cornerRadius", label: "Corner radius", unit: "mm", step: 0.1, min: 0 };
const rowField: FieldSpec<NumericField> = { key: "rows", label: "Dividers (width-wise)", unit: "", step: 1, min: 0, isLength: false };
const columnField: FieldSpec<NumericField> = { key: "columns", label: "Dividers (depth-wise)", unit: "", step: 1, min: 0, isLength: false };

const jointLabels: Record<JointType, string> = {
  finger: "Finger",
  dovetail: "Dovetail",
  rabbet: "Rabbet",
  mortise_tenon: "Mortise/tenon",
};

interface TrayControlsProps {
  spec: TraySpec;
  setSpec: (updater: (current: TraySpec) => TraySpec) => void;
  unit: LengthUnit;
}

export default function TrayControls({ spec, setSpec, unit }: TrayControlsProps) {
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

      <CollapsibleSection title="Joint">
        <div className={styles.field}>
          <Segmented
            options={JOINT_TYPES}
            labels={jointLabels}
            value={spec.joint}
            onChange={(joint) => setSpec((current) => ({ ...current, joint }))}
            ariaLabel="Joint type"
          />
        </div>
        <div className={`${styles.fields} ${styles.fieldsSpaced}`}>
          {spec.joint === "finger" && (
            <NumberField field={fingerField} value={spec.fingers} onChange={(value) => updateField("fingers", value)} unit={unit} />
          )}
          <NumberField field={cornerRadiusField} value={spec.cornerRadius} onChange={(value) => updateField("cornerRadius", value)} unit={unit} />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Dividers" defaultOpen={false}>
        <div className={styles.fields}>
          <NumberField field={rowField} value={spec.rows} onChange={(value) => updateField("rows", value)} unit={unit} />
          <NumberField field={columnField} value={spec.columns} onChange={(value) => updateField("columns", value)} unit={unit} />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Sides" defaultOpen={false}>
        <PanelOmissionControl value={spec.omitPanels} onChange={(omitPanels) => setSpec((current) => ({ ...current, omitPanels }))} />
        <p className={`${styles.hintText} mono`}>
          uncheck a side to leave it open — neighboring panels get a flat edge there instead of tabs
        </p>
      </CollapsibleSection>
    </>
  );
}
