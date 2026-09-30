"use client";

import { useMemo, useState } from "react";
import { DEFAULT_POCKET_SPEC, generatePocketGcode, planPocket, PocketSpec, validatePocketSpec } from "@/lib/gcode-pocket";
import { LengthUnit } from "@/lib/units";
import PocketControls from "./pocket-controls";
import styles from "./cnc-tool.module.css";

export default function PocketPane({ unit }: { unit: LengthUnit }) {
  const [spec, setSpec] = useState<PocketSpec>(DEFAULT_POCKET_SPEC);

  const { errors, gcode, plan } = useMemo(() => {
    const validationErrors = validatePocketSpec(spec);
    if (validationErrors.length > 0) return { errors: validationErrors, gcode: null as string | null, plan: null };
    return { errors: validationErrors, gcode: generatePocketGcode(spec), plan: planPocket(spec) };
  }, [spec]);

  function downloadGcode() {
    if (!gcode) return;
    const blob = new Blob([gcode], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pocket-${spec.pocketWidth}x${spec.pocketLength}x${spec.totalDepth}.nc`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <section className={styles.canvasPane} aria-label="G-code preview">
        <div className={styles.resultsHead}>
          <h2 className={`${styles.sectionLabel} mono`}>g-code</h2>
          <div className={styles.topBarGroup}>
            {plan && (
              <span className={`${styles.hintText} mono`} style={{ marginTop: 0 }}>
                {plan.passCount} passes &middot; {plan.rasterLineCount} raster lines &middot; ~{plan.estimatedTimeMin.toFixed(1)} min
              </span>
            )}
            <button type="button" className={`${styles.download} mono`} onClick={downloadGcode} disabled={!gcode}>
              Download .nc
            </button>
          </div>
        </div>
        <div className={styles.canvas} style={{ alignItems: "stretch" }}>
          {gcode ? (
            <textarea className={styles.textarea} value={gcode} readOnly />
          ) : (
            <p className={`${styles.hintText} mono`}>fix the parameters to the right to generate g-code</p>
          )}
        </div>
        <p className={styles.rangeNote}>
          Rectangular pocket only — no islands, no arbitrary boundary. Feed/plunge rates and RPM are whatever you type here; cross-check them
          against the Feeds &amp; Speeds tool for your actual bit and material. Always air-cut a new program first (bit well clear of the stock,
          spindle off) before running it on real material.
        </p>
        {errors.length > 0 && (
          <ul className={styles.errors}>
            {errors.map((error) => (
              <li key={error} className="mono">
                {error}
              </li>
            ))}
          </ul>
        )}
      </section>

      <aside className={styles.dock} aria-label="Pocket parameters">
        <PocketControls spec={spec} setSpec={setSpec} unit={unit} />
      </aside>
    </>
  );
}
