"use client";

import { BoxSpec, JOINT_TYPES, JointType, LID_STYLES, LidStyle } from "@/lib/geometry";
import { FieldSpec, NumberField, Segmented } from "./field";
import styles from "./box-tool.module.css";

type NumericField = Extract<
  keyof BoxSpec,
  "width" | "depth" | "height" | "materialThickness" | "kerf" | "fingers" | "dovetailAngle" | "cornerRadius" | "dividerRows" | "dividerColumns"
>;

const dimensionFields: FieldSpec<NumericField>[] = [
  { key: "width", label: "Width", unit: "mm", step: 1, min: 0 },
  { key: "depth", label: "Depth", unit: "mm", step: 1, min: 0 },
  { key: "height", label: "Height", unit: "mm", step: 1, min: 0 },
  { key: "materialThickness", label: "Material thickness", unit: "mm", step: 0.5, min: 0 },
  { key: "kerf", label: "Kerf", unit: "mm", step: 0.01, min: 0 },
];

const fingerField: FieldSpec<NumericField> = { key: "fingers", label: "Fingers per edge", unit: "", step: 2, min: 2 };
const dovetailField: FieldSpec<NumericField> = { key: "dovetailAngle", label: "Dovetail angle", unit: "deg", step: 1, min: 1 };
const cornerRadiusField: FieldSpec<NumericField> = { key: "cornerRadius", label: "Corner radius", unit: "mm", step: 0.1, min: 0 };
const dividerRowField: FieldSpec<NumericField> = { key: "dividerRows", label: "Dividers (width-wise)", unit: "", step: 1, min: 0 };
const dividerColumnField: FieldSpec<NumericField> = { key: "dividerColumns", label: "Dividers (depth-wise)", unit: "", step: 1, min: 0 };

const jointLabels: Record<JointType, string> = {
  finger: "Finger",
  dovetail: "Dovetail",
  rabbet: "Rabbet",
  mortise_tenon: "Mortise/tenon",
};

const lidLabels: Record<LidStyle, string> = {
  none: "Open",
  flat: "Flat",
  slide: "Slide",
  hinged: "Hinged",
};

interface BoxControlsProps {
  spec: BoxSpec;
  setSpec: (updater: (current: BoxSpec) => BoxSpec) => void;
}

export default function BoxControls({ spec, setSpec }: BoxControlsProps) {
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
        {(spec.joint === "finger" || spec.joint === "dovetail") && (
          <NumberField field={fingerField} value={spec.fingers} onChange={(value) => updateField("fingers", value)} />
        )}
        {spec.joint === "dovetail" && (
          <NumberField field={dovetailField} value={spec.dovetailAngle} onChange={(value) => updateField("dovetailAngle", value)} />
        )}
        <NumberField field={cornerRadiusField} value={spec.cornerRadius} onChange={(value) => updateField("cornerRadius", value)} />
      </div>

      <h2 className={`${styles.sectionLabel} ${styles.sectionLabelSpaced} mono`}>lid</h2>
      <div className={styles.field}>
        <Segmented
          options={LID_STYLES}
          labels={lidLabels}
          value={spec.lidStyle}
          onChange={(lidStyle) => setSpec((current) => ({ ...current, lidStyle }))}
          ariaLabel="Lid style"
        />
      </div>
      {spec.lidStyle === "hinged" && (
        <p className={`${styles.hintText} mono`}>hinge uses a separate living-hinge strip, glued across the seam</p>
      )}
      {spec.lidStyle === "slide" && (
        <p className={`${styles.hintText} mono`}>lid slides between two glued-on guide rails, not a milled groove</p>
      )}

      <h2 className={`${styles.sectionLabel} ${styles.sectionLabelSpaced} mono`}>dividers</h2>
      <div className={styles.fields}>
        <NumberField field={dividerRowField} value={spec.dividerRows} onChange={(value) => updateField("dividerRows", value)} />
        <NumberField field={dividerColumnField} value={spec.dividerColumns} onChange={(value) => updateField("dividerColumns", value)} />
      </div>

      <label className={styles.checkboxField}>
        <input
          type="checkbox"
          checked={spec.stackable}
          onChange={(event) => setSpec((current) => ({ ...current, stackable: event.target.checked }))}
        />
        <span>Stackable (adds a collar accessory)</span>
      </label>
    </>
  );
}
