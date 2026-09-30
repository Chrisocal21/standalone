"use client";

import { BoxSpec, JOINT_TYPES, JointType, LID_STYLES, LidStyle } from "@/lib/geometry";
import { CncBoxOptions, CncReliefStyle, CNC_RELIEF_STYLES } from "@/lib/cnc-box";
import { LengthUnit } from "@/lib/units";
import { CollapsibleSection, FieldSpec, NumberField, Segmented } from "./field";
import styles from "./cnc-tool.module.css";

type NumericField = Extract<keyof BoxSpec, "width" | "depth" | "height" | "materialThickness" | "fingers" | "dovetailAngle">;

const dimensionFields: FieldSpec<NumericField>[] = [
  { key: "width", label: "Width", unit: "", step: 1, min: 0 },
  { key: "depth", label: "Depth", unit: "", step: 1, min: 0 },
  { key: "height", label: "Height", unit: "", step: 1, min: 0 },
  { key: "materialThickness", label: "Material thickness", unit: "", step: 0.5, min: 0 },
];

const fingerField: FieldSpec<NumericField> = { key: "fingers", label: "Fingers per edge", unit: "", step: 2, min: 2, isLength: false };
const dovetailField: FieldSpec<NumericField> = { key: "dovetailAngle", label: "Dovetail angle", unit: "deg", step: 1, min: 1, isLength: false };

const jointLabels: Record<JointType, string> = {
  finger: "Finger",
  dovetail: "Dovetail",
  rabbet: "Rabbet",
  mortise_tenon: "Mortise/tenon",
};

const lidLabels: Record<LidStyle, string> = { none: "Open", flat: "Flat", slide: "Slide", hinged: "Hinged" };

const reliefLabels: Record<CncReliefStyle, string> = { dogbone: "Dogbone", tbone: "T-bone", none: "None" };

export default function CncBoxControls({
  spec,
  setSpec,
  options,
  setOptions,
  unit,
}: {
  spec: BoxSpec;
  setSpec: (updater: (current: BoxSpec) => BoxSpec) => void;
  options: CncBoxOptions;
  setOptions: (options: CncBoxOptions) => void;
  unit: LengthUnit;
}) {
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

      <CollapsibleSection title="Bit & relief">
        <div className={styles.fields}>
          <NumberField
            field={{ key: "bitDiameter", label: "Bit diameter", unit: "", step: 0.1, min: 0.1 }}
            value={options.bitDiameter}
            onChange={(v) => setOptions({ ...options, bitDiameter: v })}
            unit={unit}
          />
        </div>
        <div className={styles.fieldsSpaced}>
          <span className={styles.fieldLabel}>Corner relief</span>
          <div style={{ marginTop: 6 }}>
            <Segmented
              options={CNC_RELIEF_STYLES}
              labels={reliefLabels}
              value={options.reliefStyle}
              onChange={(reliefStyle) => setOptions({ ...options, reliefStyle })}
              ariaLabel="Corner relief style"
              columns={3}
            />
          </div>
        </div>
        <p className={styles.hintText}>
          Dogbone is the standard, fully-tangent relief. T-bone is a straight-line alternative for controllers that don&rsquo;t like small arcs.
        </p>
      </CollapsibleSection>

      <CollapsibleSection title="Joint">
        <Segmented options={JOINT_TYPES} labels={jointLabels} value={spec.joint} onChange={(joint) => setSpec((current) => ({ ...current, joint }))} ariaLabel="Joint type" />
        <div className={`${styles.fields} ${styles.fieldsSpaced}`}>
          {(spec.joint === "finger" || spec.joint === "dovetail") && (
            <NumberField field={fingerField} value={spec.fingers} onChange={(value) => updateField("fingers", value)} unit={unit} />
          )}
          {spec.joint === "dovetail" && (
            <NumberField field={dovetailField} value={spec.dovetailAngle} onChange={(value) => updateField("dovetailAngle", value)} unit={unit} />
          )}
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Lid / closure">
        <Segmented options={LID_STYLES} labels={lidLabels} value={spec.lidStyle} onChange={(lidStyle) => setSpec((current) => ({ ...current, lidStyle }))} ariaLabel="Lid style" />
      </CollapsibleSection>
    </>
  );
}
