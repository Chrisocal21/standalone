"use client";

import { ShelfBinSpec } from "@/lib/shelf";
import { JOINT_TYPES, JointType } from "@/lib/geometry";
import { LengthUnit } from "@/lib/units";
import { CollapsibleSection, FieldSpec, NumberField, PanelOmissionControl, Segmented } from "./field";
import styles from "./box-tool.module.css";

type NumericField = Extract<
  keyof ShelfBinSpec,
  "width" | "depth" | "height" | "materialThickness" | "kerf" | "fingers" | "mountingHoleDiameter" | "mountingHoleInset"
>;

const dimensionFields: FieldSpec<NumericField>[] = [
  { key: "width", label: "Width", unit: "mm", step: 1, min: 0 },
  { key: "depth", label: "Depth", unit: "mm", step: 1, min: 0 },
  { key: "height", label: "Height", unit: "mm", step: 1, min: 0 },
  { key: "materialThickness", label: "Material thickness", unit: "mm", step: 0.5, min: 0 },
  { key: "kerf", label: "Kerf", unit: "mm", step: 0.01, min: 0 },
];

const fingerField: FieldSpec<NumericField> = { key: "fingers", label: "Fingers per edge", unit: "", step: 2, min: 2, isLength: false };
const mountingFields: FieldSpec<NumericField>[] = [
  { key: "mountingHoleDiameter", label: "Mounting hole diameter", unit: "mm", step: 0.5, min: 0 },
  { key: "mountingHoleInset", label: "Mounting hole inset", unit: "mm", step: 1, min: 0 },
];

const jointLabels: Record<JointType, string> = {
  finger: "Finger",
  dovetail: "Dovetail",
  rabbet: "Rabbet",
  mortise_tenon: "Mortise/tenon",
};

interface ShelfControlsProps {
  spec: ShelfBinSpec;
  setSpec: (updater: (current: ShelfBinSpec) => ShelfBinSpec) => void;
  unit: LengthUnit;
}

export default function ShelfControls({ spec, setSpec, unit }: ShelfControlsProps) {
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
        {spec.joint === "finger" && (
          <div className={`${styles.fields} ${styles.fieldsSpaced}`}>
            <NumberField field={fingerField} value={spec.fingers} onChange={(value) => updateField("fingers", value)} unit={unit} />
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection title="Wall mounting" defaultOpen={false}>
        <div className={styles.fields}>
          {mountingFields.map((field) => (
            <NumberField key={field.key} field={field} value={spec[field.key]} onChange={(value) => updateField(field.key, value)} unit={unit} />
          ))}
        </div>
        <p className={`${styles.hintText} mono`}>two holes near the top of the back panel, for hanging on wall screws</p>
      </CollapsibleSection>

      <CollapsibleSection title="Sides & accessories" defaultOpen={false}>
        <PanelOmissionControl value={spec.omitPanels} onChange={(omitPanels) => setSpec((current) => ({ ...current, omitPanels }))} />
        <p className={`${styles.hintText} mono`}>
          uncheck a side to leave it open — neighboring panels get a flat edge there instead of tabs. Removing back also removes its wall-mounting
          holes, since those live on that panel
        </p>
        <label className={styles.checkboxField}>
          <input
            type="checkbox"
            checked={spec.stackable}
            onChange={(event) => setSpec((current) => ({ ...current, stackable: event.target.checked }))}
          />
          <span>Stackable (adds a collar accessory)</span>
        </label>
      </CollapsibleSection>
    </>
  );
}
