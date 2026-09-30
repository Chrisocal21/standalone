"use client";

import { SignSpec } from "@/lib/sign";
import { LengthUnit } from "@/lib/units";
import { CheckboxField, CollapsibleSection, FieldSpec, NumberField } from "./field";
import styles from "./cnc-tool.module.css";

const dimensionFields: FieldSpec<"width" | "height" | "cornerRadius">[] = [
  { key: "width", label: "Width", unit: "", step: 5, min: 1 },
  { key: "height", label: "Height", unit: "", step: 5, min: 1 },
  { key: "cornerRadius", label: "Corner radius", unit: "", step: 0.5, min: 0 },
];

const holeFields: FieldSpec<"holeDiameter" | "holeInset">[] = [
  { key: "holeDiameter", label: "Hole diameter", unit: "", step: 0.5, min: 0.5 },
  { key: "holeInset", label: "Hole inset (from corner)", unit: "", step: 0.5, min: 1 },
];

export default function SignControls({ spec, setSpec, unit }: { spec: SignSpec; setSpec: (spec: SignSpec) => void; unit: LengthUnit }) {
  function set<K extends keyof SignSpec>(key: K, value: SignSpec[K]) {
    setSpec({ ...spec, [key]: value });
  }

  return (
    <>
      <CollapsibleSection title="Dimensions">
        <div className={styles.fields}>
          {dimensionFields.map((field) => (
            <NumberField key={field.key} field={field} value={spec[field.key]} onChange={(v) => set(field.key, v)} unit={unit} />
          ))}
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Mounting holes">
        <CheckboxField label="Include corner mounting holes" checked={spec.mountingHoles} onChange={(v) => set("mountingHoles", v)} />
        {spec.mountingHoles && (
          <div className={styles.fieldsSpaced}>
            <div className={styles.fields}>
              {holeFields.map((field) => (
                <NumberField key={field.key} field={field} value={spec[field.key]} onChange={(v) => set(field.key, v)} unit={unit} />
              ))}
            </div>
          </div>
        )}
      </CollapsibleSection>
    </>
  );
}
