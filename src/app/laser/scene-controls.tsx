"use client";

import { FUJI_LAYER_IDS, FUJI_LAYER_LABELS, FUJI_MATERIAL_LEGEND, FujiLayerId, FujiSceneSpec, SunMode, fujiSheetCount } from "@/lib/layered-scenes";
import { LengthUnit } from "@/lib/units";
import { CollapsibleSection, FieldSpec, NumberField, Segmented } from "./field";
import styles from "./box-tool.module.css";

type SceneField = "width" | "height" | "materialThickness" | "sunDiameter";

const dimensionFields: FieldSpec<SceneField>[] = [
  { key: "width", label: "Scene width", unit: "mm", step: 1, min: 0 },
  { key: "height", label: "Scene height", unit: "mm", step: 1, min: 0 },
  { key: "materialThickness", label: "Material thickness", unit: "mm", step: 0.5, min: 0 },
];

const sunDiameterField: FieldSpec<SceneField> = { key: "sunDiameter", label: "Sun diameter", unit: "mm", step: 1, min: 0 };
const backingField: FieldSpec<"layerBacking"> = { key: "layerBacking", label: "Backing copies per plane layer", unit: "", step: 1, min: 1, isLength: false };

const sunModes: SunMode[] = ["behind_peak", "rising"];
const sunModeLabels: Record<SunMode, string> = { behind_peak: "Behind peak", rising: "Rising" };

/** Add or remove one layer id from the selection; "sky" is pinned on regardless of the checkbox event. */
function toggleLayer(current: FujiLayerId[], id: FujiLayerId, checked: boolean): FujiLayerId[] {
  if (id === "sky") return current; // structural back panel — always included
  if (checked) return current.includes(id) ? current : [...current, id];
  return current.filter((layer) => layer !== id);
}

export default function SceneControls({ spec, setSpec, unit }: { spec: FujiSceneSpec; setSpec: (updater: (current: FujiSceneSpec) => FujiSceneSpec) => void; unit: LengthUnit }) {
  const includesSun = spec.layers.includes("sun");
  const sheetCount = fujiSheetCount(spec);

  return (
    <>
      <CollapsibleSection title="Scene dimensions">
        <div className={styles.fields}>
          {dimensionFields.map((field) => (
            <NumberField key={field.key} field={field} value={spec[field.key]} onChange={(value) => setSpec((current) => ({ ...current, [field.key]: value }))} unit={unit} />
          ))}
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Layers">
        <div className={styles.panelGrid}>
          {FUJI_LAYER_IDS.map((id) => (
            <label key={id} className={styles.panelCheckbox}>
              <input
                type="checkbox"
                checked={spec.layers.includes(id)}
                disabled={id === "sky"}
                onChange={(event) => setSpec((current) => ({ ...current, layers: toggleLayer(current.layers, id, event.target.checked) }))}
              />
              <span>{FUJI_LAYER_LABELS[id]}</span>
            </label>
          ))}
        </div>
        <p className={`${styles.hintText} mono`}>sky is the structural back panel and can&rsquo;t be removed &middot; pick at least 3 for real depth</p>
      </CollapsibleSection>

      {includesSun && (
        <CollapsibleSection title="Sun treatment">
          <div className={styles.field}>
            <Segmented options={sunModes} labels={sunModeLabels} value={spec.sunMode} onChange={(sunMode) => setSpec((current) => ({ ...current, sunMode }))} ariaLabel="Sun treatment" />
          </div>
          <div className={styles.fields}>
            <NumberField field={sunDiameterField} value={spec.sunDiameter} onChange={(value) => setSpec((current) => ({ ...current, sunDiameter: value }))} unit={unit} />
          </div>
          <p className={`${styles.hintText} mono`}>the same Mt. Fuji composition can read as sunset or sunrise</p>
        </CollapsibleSection>
      )}

      <CollapsibleSection title="Assembly">
        <div className={styles.fields}>
          <NumberField field={backingField} value={spec.layerBacking} onChange={(value) => setSpec((current) => ({ ...current, layerBacking: value }))} unit={unit} />
        </div>
        <p className={`${styles.hintText} mono`}>
          no separate blank spacer part — sky, distant mountain, Mt. Fuji and the foreground ridge are already solid boards behind their skyline, so
          the standoff between them is just extra identical copies of that same layer, glued back-to-back. Sun and snow cap are thin accents and
          always cut as a single copy, glued flush onto whichever plane sits behind them. All copies share the same 4 corner holes — thread a dowel
          or long screw through them to keep everything aligned while it glues. Prefer thicker stock over lamination? Cut a plane layer once from
          thicker material instead and leave its backing count at 1 — same result, fewer parts.
        </p>
        <label className={styles.checkboxField}>
          <input
            type="checkbox"
            checked={spec.wallHanger}
            onChange={(event) => setSpec((current) => ({ ...current, wallHanger: event.target.checked }))}
          />
          <span>Wall-hanging slot (cut into the back panel)</span>
        </label>
      </CollapsibleSection>

      <CollapsibleSection title="Materials" defaultOpen={false}>
        <ul className={`${styles.hintText} mono`}>
          {spec.layers
            .filter((id) => FUJI_LAYER_IDS.includes(id))
            .map((id) => (
              <li key={id}>
                {FUJI_LAYER_LABELS[id]}: {FUJI_MATERIAL_LEGEND[id]}
              </li>
            ))}
        </ul>
        <p className={`${styles.hintText} mono`}>{sheetCount} sheets total, including laminated backing copies — a starting suggestion, not a spec sheet</p>
      </CollapsibleSection>
    </>
  );
}
