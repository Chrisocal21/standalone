"use client";

import { EnclosureSpec, LidStyle } from "@/lib/solids";
import { LengthUnit } from "@/lib/units";
import { CheckboxField, CollapsibleSection, FieldSpec, NumberField, Segmented } from "./field";
import styles from "./print-tool.module.css";

const DIMENSION_FIELDS: FieldSpec<"width" | "depth" | "height">[] = [
  { key: "width", label: "Width", unit: "", step: 1, min: 1 },
  { key: "depth", label: "Depth", unit: "", step: 1, min: 1 },
  { key: "height", label: "Height", unit: "", step: 1, min: 1 },
];

const WALL_FIELDS: FieldSpec<"wallThickness" | "floorThickness">[] = [
  { key: "wallThickness", label: "Wall thickness", unit: "", step: 0.2, min: 0.4 },
  { key: "floorThickness", label: "Floor thickness", unit: "", step: 0.2, min: 0.4 },
];

const LID_STYLES: LidStyle[] = ["none", "flat"];
const lidLabels: Record<LidStyle, string> = { none: "None", flat: "Flat" };

export default function EnclosureControls({
  spec,
  setSpec,
  unit,
}: {
  spec: EnclosureSpec;
  setSpec: (spec: EnclosureSpec) => void;
  unit: LengthUnit;
}) {
  function set<K extends keyof EnclosureSpec>(key: K, value: EnclosureSpec[K]) {
    setSpec({ ...spec, [key]: value });
  }

  return (
    <>
      <CollapsibleSection title="Dimensions">
        <div className={styles.fields}>
          {DIMENSION_FIELDS.map((field) => (
            <NumberField key={field.key} field={field} value={spec[field.key]} onChange={(v) => set(field.key, v)} unit={unit} />
          ))}
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Walls & floor">
        <div className={styles.fields}>
          {WALL_FIELDS.map((field) => (
            <NumberField key={field.key} field={field} value={spec[field.key]} onChange={(v) => set(field.key, v)} unit={unit} />
          ))}
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Lid">
        <Segmented options={LID_STYLES} labels={lidLabels} value={spec.lid} onChange={(v) => set("lid", v)} ariaLabel="Lid style" />
        {spec.lid === "flat" && (
          <div className={styles.fieldsSpaced}>
            <NumberField
              field={{ key: "lidClearance", label: "Lid clearance", unit: "", step: 0.05, min: 0 }}
              value={spec.lidClearance}
              onChange={(v) => set("lidClearance", v)}
              unit={unit}
            />
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection title="Screw bosses">
        <CheckboxField label="Include corner bosses" checked={spec.screwBosses} onChange={(v) => set("screwBosses", v)} />
        {spec.screwBosses && (
          <div className={styles.fieldsSpaced}>
            <div className={styles.fields}>
              <NumberField
                field={{ key: "bossDiameter", label: "Boss diameter", unit: "", step: 0.5, min: 1 }}
                value={spec.bossDiameter}
                onChange={(v) => set("bossDiameter", v)}
                unit={unit}
              />
              <NumberField
                field={{ key: "bossInset", label: "Boss inset (from corner)", unit: "", step: 0.5, min: 2 }}
                value={spec.bossInset}
                onChange={(v) => set("bossInset", v)}
                unit={unit}
              />
            </div>
          </div>
        )}
      </CollapsibleSection>
    </>
  );
}
