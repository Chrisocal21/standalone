"use client";

import { useMemo, useState } from "react";
import { DEFAULT_SIGN_SPEC, SignSpec, signToSvg, validateSignSpec } from "@/lib/sign";
import { LengthUnit } from "@/lib/units";
import SignControls from "./sign-controls";
import styles from "./cnc-tool.module.css";

export default function SignPane({ unit }: { unit: LengthUnit }) {
  const [spec, setSpec] = useState<SignSpec>(DEFAULT_SIGN_SPEC);

  const { errors, svg } = useMemo(() => {
    const validationErrors = validateSignSpec(spec);
    return { errors: validationErrors, svg: validationErrors.length === 0 ? signToSvg(spec) : null };
  }, [spec]);

  function downloadSvg() {
    if (!svg) return;
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `sign-${spec.width}x${spec.height}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <section className={styles.canvasPane} aria-label="Sign preview">
        <div className={styles.resultsHead}>
          <h2 className={`${styles.sectionLabel} mono`}>preview</h2>
          <button type="button" className={`${styles.download} mono`} onClick={downloadSvg} disabled={!svg}>
            Download SVG
          </button>
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

      <aside className={styles.dock} aria-label="Sign parameters">
        <SignControls spec={spec} setSpec={setSpec} unit={unit} />
      </aside>
    </>
  );
}
