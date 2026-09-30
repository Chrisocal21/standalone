"use client";

import { ChangeEvent, useRef } from "react";
import { CheckboxField, CollapsibleSection, NumberField } from "./field";
import styles from "./print-tool.module.css";

export interface ImportTransform {
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  uniformScale: boolean;
  rotateX: number;
  rotateY: number;
  rotateZ: number;
}

export const DEFAULT_IMPORT_TRANSFORM: ImportTransform = {
  scaleX: 1,
  scaleY: 1,
  scaleZ: 1,
  uniformScale: true,
  rotateX: 0,
  rotateY: 0,
  rotateZ: 0,
};

const ROTATE_STEPS = [0, 90, 180, 270];

export default function ImportControls({
  fileName,
  onFile,
  onClear,
  transform,
  setTransform,
}: {
  fileName: string | null;
  onFile: (file: File) => void;
  onClear: () => void;
  transform: ImportTransform;
  setTransform: (transform: ImportTransform) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) onFile(file);
    event.target.value = "";
  }

  function setScale(axis: "scaleX" | "scaleY" | "scaleZ", value: number) {
    if (transform.uniformScale) {
      setTransform({ ...transform, scaleX: value, scaleY: value, scaleZ: value });
    } else {
      setTransform({ ...transform, [axis]: value });
    }
  }

  function rotateBy(axis: "rotateX" | "rotateY" | "rotateZ", delta: number) {
    const next = ((transform[axis] + delta) % 360 + 360) % 360;
    setTransform({ ...transform, [axis]: next });
  }

  return (
    <>
      <CollapsibleSection title="STL file">
        <input ref={inputRef} type="file" accept=".stl" onChange={handleChange} style={{ display: "none" }} />
        <button type="button" className={`${styles.download} mono`} onClick={() => inputRef.current?.click()}>
          {fileName ? "Replace STL" : "Upload STL"}
        </button>
        {fileName && (
          <p className={styles.hintText}>
            {fileName}
            <br />
            <button type="button" className={`${styles.converterToggle} mono`} style={{ marginTop: 8 }} onClick={onClear}>
              Clear
            </button>
          </p>
        )}
        {!fileName && <p className={styles.hintText}>Only geometry transforms — scale and 90&deg;-step rotation — are supported; this isn&rsquo;t a mesh editor.</p>}
      </CollapsibleSection>

      {fileName && (
        <>
          <CollapsibleSection title="Scale">
            <CheckboxField
              label="Uniform (lock X/Y/Z together)"
              checked={transform.uniformScale}
              onChange={(uniformScale) => setTransform({ ...transform, uniformScale })}
            />
            <div className={styles.fieldsSpaced}>
              <div className={styles.fields}>
                <NumberField
                  field={{ key: "scaleX", label: "Scale X", unit: "x", step: 0.05, min: 0.01, isLength: false }}
                  value={transform.scaleX}
                  onChange={(v) => setScale("scaleX", v)}
                  unit="mm"
                />
                <NumberField
                  field={{ key: "scaleY", label: "Scale Y", unit: "x", step: 0.05, min: 0.01, isLength: false }}
                  value={transform.scaleY}
                  onChange={(v) => setScale("scaleY", v)}
                  unit="mm"
                />
                <NumberField
                  field={{ key: "scaleZ", label: "Scale Z", unit: "x", step: 0.05, min: 0.01, isLength: false }}
                  value={transform.scaleZ}
                  onChange={(v) => setScale("scaleZ", v)}
                  unit="mm"
                />
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Rotate">
            {(["rotateX", "rotateY", "rotateZ"] as const).map((axis) => (
              <div key={axis} className={styles.field} style={{ marginBottom: 12 }}>
                <span className={styles.fieldLabel}>{axis.replace("rotate", "")} axis &mdash; {transform[axis]}&deg;</span>
                <div className={styles.segmented} style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
                  {ROTATE_STEPS.map((step) => (
                    <button
                      key={step}
                      type="button"
                      className={`${styles.segmentedOption} mono ${transform[axis] === step ? styles.segmentedOptionActive : ""}`}
                      onClick={() => setTransform({ ...transform, [axis]: step })}
                    >
                      {step}&deg;
                    </button>
                  ))}
                </div>
                <button type="button" className={`${styles.converterToggle} mono`} style={{ marginTop: 6 }} onClick={() => rotateBy(axis, 15)}>
                  +15&deg;
                </button>
              </div>
            ))}
          </CollapsibleSection>

          <button type="button" className={`${styles.converterToggle} mono`} onClick={() => setTransform(DEFAULT_IMPORT_TRANSFORM)}>
            Reset transform
          </button>
        </>
      )}
    </>
  );
}
