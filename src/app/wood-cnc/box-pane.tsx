"use client";

import { useMemo, useState } from "react";
import { BoxSpec, DEFAULT_BOX_SPEC, validateBoxSpec } from "@/lib/geometry";
import { boxToSvg } from "@/lib/svg";
import { CncBoxOptions, DEFAULT_CNC_BOX_OPTIONS, generateCncBox, validateCncBoxOptions } from "@/lib/cnc-box";
import { LengthUnit } from "@/lib/units";
import CncBoxControls from "./cnc-box-controls";
import styles from "./cnc-tool.module.css";

export default function BoxPane({ unit }: { unit: LengthUnit }) {
  const [boxSpec, setBoxSpec] = useState<BoxSpec>(DEFAULT_BOX_SPEC);
  const [options, setOptions] = useState<CncBoxOptions>(DEFAULT_CNC_BOX_OPTIONS);

  const { errors, svg, reliefCount, panelCount } = useMemo(() => {
    const effectiveSpec = { ...boxSpec, kerf: options.bitDiameter };
    const specErrors = validateBoxSpec(effectiveSpec);
    const optionErrors = validateCncBoxOptions(options);
    const allErrors = [...specErrors, ...optionErrors];
    if (allErrors.length > 0) {
      return { errors: allErrors, svg: null as string | null, reliefCount: 0, panelCount: 0 };
    }
    const result = generateCncBox(boxSpec, options);
    return { errors: allErrors, svg: boxToSvg(result.panels, 10, 0), reliefCount: result.reliefCount, panelCount: result.panels.length };
  }, [boxSpec, options]);

  function downloadSvg() {
    if (!svg) return;
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `cnc-box-${boxSpec.width}x${boxSpec.depth}x${boxSpec.height}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <section className={styles.canvasPane} aria-label="CNC box preview">
        <div className={styles.resultsHead}>
          <h2 className={`${styles.sectionLabel} mono`}>preview</h2>
          <div className={styles.topBarGroup}>
            {svg && (
              <span className={`${styles.hintText} mono`} style={{ marginTop: 0 }}>
                {panelCount} panels &middot; {reliefCount} corners relieved
              </span>
            )}
            <button type="button" className={`${styles.download} mono`} onClick={downloadSvg} disabled={!svg}>
              Download SVG
            </button>
          </div>
        </div>
        <div className={styles.canvas}>
          {svg ? (
            <div className={styles.svgWrap} dangerouslySetInnerHTML={{ __html: svg }} />
          ) : (
            <p className={`${styles.hintText} mono`}>fix the parameters to the right to render a preview</p>
          )}
        </div>
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

      <aside className={styles.dock} aria-label="Box parameters">
        <CncBoxControls spec={boxSpec} setSpec={setBoxSpec} options={options} setOptions={setOptions} unit={unit} />
      </aside>
    </>
  );
}
