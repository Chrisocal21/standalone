"use client";

import { ReactNode, useMemo, useState } from "react";
import { BoxSpec, DEFAULT_BOX_SPEC, Panel, generateBox, layoutSize, validateBoxSpec } from "@/lib/geometry";
import { CylinderSpec, DEFAULT_CYLINDER_SPEC, generateCylinder, validateCylinderSpec } from "@/lib/shapes";
import { TraySpec, DEFAULT_TRAY_SPEC, generateTray, validateTraySpec } from "@/lib/tray";
import { PegboardSpec, DEFAULT_PEGBOARD_SPEC, generatePegboard, validatePegboardSpec } from "@/lib/pegboard";
import { StandSpec, DEFAULT_STAND_SPEC, generateStand, validateStandSpec } from "@/lib/stand";
import { ShelfBinSpec, DEFAULT_SHELF_BIN_SPEC, generateShelfBin, validateShelfBinSpec } from "@/lib/shelf";
import { boxToSvg } from "@/lib/svg";
import SvgLightbox from "./svg-lightbox";
import BoxControls from "./box-controls";
import CylinderControls from "./cylinder-controls";
import TrayControls from "./tray-controls";
import PegboardControls from "./pegboard-controls";
import StandControls from "./stand-controls";
import ShelfControls from "./shelf-controls";
import { Segmented } from "./field";
import styles from "./box-tool.module.css";

type Shape = "box" | "cylinder" | "tray" | "pegboard" | "stand" | "shelf";

const shapeLabels: Record<Shape, string> = {
  box: "Box",
  cylinder: "Cylinder",
  tray: "Tray",
  pegboard: "Pegboard",
  stand: "Stand",
  shelf: "Bin",
};

interface ActiveShape {
  errors: string[];
  panels: Panel[] | null;
  cornerRadius: number;
  filename: string;
  controls: ReactNode;
}

export default function BoxTool() {
  const [shape, setShape] = useState<Shape>("box");
  const [boxSpec, setBoxSpec] = useState<BoxSpec>(DEFAULT_BOX_SPEC);
  const [cylinderSpec, setCylinderSpec] = useState<CylinderSpec>(DEFAULT_CYLINDER_SPEC);
  const [traySpec, setTraySpec] = useState<TraySpec>(DEFAULT_TRAY_SPEC);
  const [pegboardSpec, setPegboardSpec] = useState<PegboardSpec>(DEFAULT_PEGBOARD_SPEC);
  const [standSpec, setStandSpec] = useState<StandSpec>(DEFAULT_STAND_SPEC);
  const [shelfSpec, setShelfSpec] = useState<ShelfBinSpec>(DEFAULT_SHELF_BIN_SPEC);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const active: ActiveShape = useMemo(() => {
    switch (shape) {
      case "box": {
        const errors = validateBoxSpec(boxSpec);
        return {
          errors,
          panels: errors.length === 0 ? generateBox(boxSpec) : null,
          cornerRadius: boxSpec.cornerRadius,
          filename: `box-${boxSpec.width}x${boxSpec.depth}x${boxSpec.height}`,
          controls: <BoxControls spec={boxSpec} setSpec={setBoxSpec} />,
        };
      }
      case "cylinder": {
        const errors = validateCylinderSpec(cylinderSpec);
        return {
          errors,
          panels: errors.length === 0 ? generateCylinder(cylinderSpec) : null,
          cornerRadius: 0,
          filename: `cylinder-${cylinderSpec.diameter}x${cylinderSpec.height}`,
          controls: <CylinderControls spec={cylinderSpec} setSpec={setCylinderSpec} />,
        };
      }
      case "tray": {
        const errors = validateTraySpec(traySpec);
        return {
          errors,
          panels: errors.length === 0 ? generateTray(traySpec) : null,
          cornerRadius: traySpec.cornerRadius,
          filename: `tray-${traySpec.width}x${traySpec.depth}x${traySpec.height}`,
          controls: <TrayControls spec={traySpec} setSpec={setTraySpec} />,
        };
      }
      case "pegboard": {
        const errors = validatePegboardSpec(pegboardSpec);
        return {
          errors,
          panels: errors.length === 0 ? generatePegboard(pegboardSpec) : null,
          cornerRadius: 0,
          filename: `pegboard-${pegboardSpec.width}x${pegboardSpec.height}`,
          controls: <PegboardControls spec={pegboardSpec} setSpec={setPegboardSpec} />,
        };
      }
      case "stand": {
        const errors = validateStandSpec(standSpec);
        return {
          errors,
          panels: errors.length === 0 ? generateStand(standSpec) : null,
          cornerRadius: 0,
          filename: `stand-${standSpec.legWidth}x${standSpec.legHeight}`,
          controls: <StandControls spec={standSpec} setSpec={setStandSpec} />,
        };
      }
      case "shelf": {
        const errors = validateShelfBinSpec(shelfSpec);
        return {
          errors,
          panels: errors.length === 0 ? generateShelfBin(shelfSpec) : null,
          cornerRadius: 0,
          filename: `bin-${shelfSpec.width}x${shelfSpec.depth}x${shelfSpec.height}`,
          controls: <ShelfControls spec={shelfSpec} setSpec={setShelfSpec} />,
        };
      }
    }
  }, [shape, boxSpec, cylinderSpec, traySpec, pegboardSpec, standSpec, shelfSpec]);

  const { svg, panelCount, layout } = useMemo(() => {
    if (!active.panels) {
      return { svg: null as string | null, panelCount: 0, layout: [0, 0] as [number, number] };
    }
    return {
      svg: boxToSvg(active.panels, 10, active.cornerRadius),
      panelCount: active.panels.length,
      layout: layoutSize(active.panels),
    };
  }, [active]);

  function downloadSvg() {
    if (!svg) return;
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${active.filename}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className={styles.layout}>
      <section className={styles.controls} aria-label="Shape parameters">
        <h2 className={`${styles.sectionLabel} mono`}>shape</h2>
        <div className={styles.field}>
          <Segmented
            options={["box", "cylinder", "tray", "pegboard", "stand", "shelf"]}
            labels={shapeLabels}
            value={shape}
            onChange={setShape}
            ariaLabel="Shape"
          />
        </div>

        {active.controls}

        {active.errors.length > 0 && (
          <ul className={styles.errors}>
            {active.errors.map((error) => (
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

      {lightboxOpen && svg && <SvgLightbox svg={svg} title={active.filename} onClose={() => setLightboxOpen(false)} />}
    </div>
  );
}
