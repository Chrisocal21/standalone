"use client";

import { WorkshopOrganizerSpec } from "@/lib/builds";
import { LengthUnit } from "@/lib/units";
import { CollapsibleSection, FieldSpec, NumberField } from "./field";
import styles from "./box-tool.module.css";

type OrganizerField = keyof WorkshopOrganizerSpec;

const fields: FieldSpec<OrganizerField>[] = [
  { key: "width", label: "Overall width", unit: "mm", step: 1, min: 0 },
  { key: "depth", label: "Overall depth", unit: "mm", step: 1, min: 0 },
  { key: "height", label: "Tray height", unit: "mm", step: 1, min: 0 },
  { key: "materialThickness", label: "Material thickness", unit: "mm", step: 0.5, min: 0 },
  { key: "kerf", label: "Kerf", unit: "mm", step: 0.01, min: 0 },
];

export default function BuildControls({ spec, setSpec, unit }: { spec: WorkshopOrganizerSpec; setSpec: (updater: (current: WorkshopOrganizerSpec) => WorkshopOrganizerSpec) => void; unit: LengthUnit }) {
  return (
    <>
      <CollapsibleSection title="Organizer dimensions">
        <div className={styles.fields}>
          {fields.map((field) => (
            <NumberField key={field.key} field={field} value={spec[field.key]} onChange={(value) => setSpec((current) => ({ ...current, [field.key]: value }))} unit={unit} />
          ))}
        </div>
      </CollapsibleSection>
      <p className={`${styles.hintText} mono`}>one divided main tray plus two coordinated companion trays</p>
    </>
  );
}
