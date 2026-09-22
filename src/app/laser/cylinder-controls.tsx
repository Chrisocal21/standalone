"use client";

import { CylinderSpec, CYLINDER_LID_STYLES, CylinderLidStyle } from "@/lib/shapes";
import { LengthUnit } from "@/lib/units";
import { CollapsibleSection, FieldSpec, NumberField, Segmented } from "./field";
import styles from "./box-tool.module.css";

type NumericField = Extract<keyof CylinderSpec, "diameter" | "height" | "materialThickness" | "kerf" | "tabCount">;

const dimensionFields: FieldSpec<NumericField>[] = [
  { key: "diameter", label: "Diameter", unit: "mm", step: 1, min: 0 },
  { key: "height", label: "Height", unit: "mm", step: 1, min: 0 },
  { key: "materialThickness", label: "Material thickness", unit: "mm", step: 0.5, min: 0 },
  { key: "kerf", label: "Kerf", unit: "mm", step: 0.01, min: 0 },
  { key: "tabCount", label: "Tabs around seam", unit: "", step: 1, min: 4, isLength: false },
];

const lidLabels: Record<CylinderLidStyle, string> = {
  none: "Open",
  flat: "Flat",
};

interface CylinderControlsProps {
  spec: CylinderSpec;
  setSpec: (updater: (current: CylinderSpec) => CylinderSpec) => void;
  unit: LengthUnit;
}

export default function CylinderControls({ spec, setSpec, unit }: CylinderControlsProps) {
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

      <CollapsibleSection title="Lid">
        <div className={styles.field}>
          <Segmented
            options={CYLINDER_LID_STYLES}
            labels={lidLabels}
            value={spec.lidStyle}
            onChange={(lidStyle) => setSpec((current) => ({ ...current, lidStyle }))}
            ariaLabel="Lid style"
          />
        </div>
        <p className={`${styles.hintText} mono`}>
          wall tabs fold up into notches cut around the disc rim; the wall&rsquo;s side seam is a plain glued butt joint
        </p>
      </CollapsibleSection>
    </>
  );
}
