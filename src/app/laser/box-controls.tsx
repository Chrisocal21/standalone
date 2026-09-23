"use client";

import { useState } from "react";
import { BoxSpec, JOINT_TYPES, JointType, LID_STYLES, LidStyle } from "@/lib/geometry";
import { applyBoxVariant, BOX_VARIANTS, BOX_VARIANT_LABELS, BoxVariantId } from "@/lib/box-variants";
import { LengthUnit } from "@/lib/units";
import { CollapsibleSection, FieldSpec, NumberField, PanelOmissionControl, Segmented } from "./field";
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

const fingerField: FieldSpec<NumericField> = { key: "fingers", label: "Fingers per edge", unit: "", step: 2, min: 2, isLength: false };
const dovetailField: FieldSpec<NumericField> = { key: "dovetailAngle", label: "Dovetail angle", unit: "deg", step: 1, min: 1, isLength: false };
const cornerRadiusField: FieldSpec<NumericField> = { key: "cornerRadius", label: "Corner radius", unit: "mm", step: 0.1, min: 0 };
const dividerRowField: FieldSpec<NumericField> = { key: "dividerRows", label: "Dividers (width-wise)", unit: "", step: 1, min: 0, isLength: false };
const dividerColumnField: FieldSpec<NumericField> = { key: "dividerColumns", label: "Dividers (depth-wise)", unit: "", step: 1, min: 0, isLength: false };

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
  unit: LengthUnit;
}

export default function BoxControls({ spec, setSpec, unit }: BoxControlsProps) {
  const [variant, setVariant] = useState<BoxVariantId>("storage");

  function updateField(key: NumericField, value: number) {
    setSpec((current) => ({ ...current, [key]: value }));
  }

  return (
    <>
      <CollapsibleSection title="Use case">
        <div className={styles.field}>
          <Segmented
            options={BOX_VARIANTS.map(({ id }) => id)}
            labels={BOX_VARIANT_LABELS}
            value={variant}
            onChange={(nextVariant) => {
              setVariant(nextVariant);
              setSpec((current) => applyBoxVariant(current, nextVariant));
            }}
            ariaLabel="Box use case"
          />
        </div>
        <p className={`${styles.hintText} mono`}>{BOX_VARIANTS.find(({ id }) => id === variant)?.description}</p>
      </CollapsibleSection>

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
          {(spec.joint === "finger" || spec.joint === "dovetail") && (
            <NumberField field={fingerField} value={spec.fingers} onChange={(value) => updateField("fingers", value)} unit={unit} />
          )}
          {spec.joint === "dovetail" && (
            <NumberField field={dovetailField} value={spec.dovetailAngle} onChange={(value) => updateField("dovetailAngle", value)} unit={unit} />
          )}
          <NumberField field={cornerRadiusField} value={spec.cornerRadius} onChange={(value) => updateField("cornerRadius", value)} unit={unit} />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Lid / closure">
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
      </CollapsibleSection>

      <CollapsibleSection title="Dividers" defaultOpen={false}>
        <div className={styles.fields}>
          <NumberField field={dividerRowField} value={spec.dividerRows} onChange={(value) => updateField("dividerRows", value)} unit={unit} />
          <NumberField field={dividerColumnField} value={spec.dividerColumns} onChange={(value) => updateField("dividerColumns", value)} unit={unit} />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Sides & accessories" defaultOpen={false}>
        <PanelOmissionControl value={spec.omitPanels} onChange={(omitPanels) => setSpec((current) => ({ ...current, omitPanels }))} />
        <p className={`${styles.hintText} mono`}>
          uncheck a side to leave it open — neighboring panels get a flat edge there instead of tabs
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
