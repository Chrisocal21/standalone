"use client";

import { useMemo, useState } from "react";
import { BoxSpec, DEFAULT_BOX_SPEC, generateBox, layoutSize, validateBoxSpec } from "@/lib/geometry";
import { CylinderSpec, DEFAULT_CYLINDER_SPEC, generateCylinder, validateCylinderSpec } from "@/lib/shapes";
import { boxToSvg } from "@/lib/svg";
import SvgLightbox from "./svg-lightbox";
import BoxControls from "./box-controls";
import CylinderControls from "./cylinder-controls";
import { Segmented } from "./field";
import styles from "./box-tool.module.css";

type Shape = "box" | "cylinder";

const shapeLabels: Record<Shape, string> = {
  box: "Box",
  cylinder: "Cylinder",
};

export default function BoxTool() {
  const [shape, setShape] = useState<Shape>("box");
  const [boxSpec, setBoxSpec] = useState<BoxSpec>(DEFAULT_BOX_SPEC);
  const [cylinderSpec, setCylinderSpec] = useState<CylinderSpec>(DEFAULT_CYLINDER_SPEC);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const errors = useMemo(
    () => (shape === "box" ? validateBoxSpec(boxSpec) : validateCylinderSpec(cylinderSpec)),
    [shape, boxSpec, cylinderSpec]
  );

  const { svg, panelCount, layout, filename } = useMemo(() => {
    if (errors.length > 0) {
      return { svg: null as string | null, panelCount: 0, layout: [0, 0] as [number, number], filename: "shape" };
    }
    if (shape === "box") {
      const panels = generateBox(boxSpec);
      return {
        svg: boxToSvg(panels, 10, boxSpec.cornerRadius),
        panelCount: panels.length,
        layout: layoutSize(panels),
        filename: `box-${boxSpec.width}x${boxSpec.depth}x${boxSpec.height}`,
      };
    }
    const panels = generateCylinder(cylinderSpec);
    return {
      svg: boxToSvg(panels),
      panelCount: panels.length,
      layout: layoutSize(panels),
      filename: `cylinder-${cylinderSpec.diameter}x${cylinderSpec.height}`,
    };
  }, [shape, boxSpec, cylinderSpec, errors]);

  function downloadSvg() {
    if (!svg) return;
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className={styles.layout}>
      <section className={styles.controls} aria-label="Shape parameters">
        <h2 className={`${styles.sectionLabel} mono`}>shape</h2>
        <div className={styles.field}>
          <Segmented options={["box", "cylinder"]} labels={shapeLabels} value={shape} onChange={setShape} ariaLabel="Shape" />
        </div>

        {shape === "box" ? (
          <BoxControls spec={boxSpec} setSpec={setBoxSpec} />
        ) : (
          <CylinderControls spec={cylinderSpec} setSpec={setCylinderSpec} />
        )}

        {errors.length > 0 && (
          <ul className={styles.errors}>
            {errors.map((error) => (
              <li key={error} className="mono">
                {error}
              </li>
            ))}
          </ul>
        )}

        <button type="button" className={`${styles.download} mono`} onClick={downloadSvg} disabled={!svg}>
          Download SVG
        </button>
      </section>

      <section className={styles.preview} aria-label="Panel layout preview">
        <div className={styles.previewHead}>
          <h2 className={`${styles.sectionLabel} mono`}>preview</h2>
          {svg && (
            <span className={`${styles.previewMeta} mono`}>
              {panelCount} panels &middot; {layout[0].toFixed(1)} x {layout[1].toFixed(1)} mm sheet
            </span>
          )}
        </div>
        <div className={styles.canvas}>
          {svg ? (
            <button
              type="button"
              className={styles.svgWrapButton}
              onClick={() => setLightboxOpen(true)}
              aria-label="Open preview in a zoomable lightbox"
            >
              <div className={styles.svgWrap} dangerouslySetInnerHTML={{ __html: svg }} />
              <span className={`${styles.expandHint} mono`}>click to expand</span>
            </button>
          ) : (
            <p className={`${styles.canvasEmpty} mono`}>fix the parameters above to render a preview</p>
          )}
        </div>
      </section>

      {lightboxOpen && svg && <SvgLightbox svg={svg} title={filename} onClose={() => setLightboxOpen(false)} />}
    </div>
  );
}
