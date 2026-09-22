"use client";

import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { BoxSpec, DEFAULT_BOX_SPEC, Panel, generateBox, layoutSize, validateBoxSpec } from "@/lib/geometry";
import { CylinderSpec, DEFAULT_CYLINDER_SPEC, generateCylinder, validateCylinderSpec } from "@/lib/shapes";
import { TraySpec, DEFAULT_TRAY_SPEC, generateTray, validateTraySpec } from "@/lib/tray";
import { PegboardSpec, DEFAULT_PEGBOARD_SPEC, generatePegboard, validatePegboardSpec } from "@/lib/pegboard";
import { StandSpec, DEFAULT_STAND_SPEC, generateStand, validateStandSpec } from "@/lib/stand";
import { ShelfBinSpec, DEFAULT_SHELF_BIN_SPEC, generateShelfBin, validateShelfBinSpec } from "@/lib/shelf";
import { boxToSvg } from "@/lib/svg";
import { LENGTH_UNITS, LengthUnit, fromMm, roundForDisplay } from "@/lib/units";
import SvgLightbox from "./svg-lightbox";
import UnitConverter from "./unit-converter";
import BoxControls from "./box-controls";
import CylinderControls from "./cylinder-controls";
import TrayControls from "./tray-controls";
import PegboardControls from "./pegboard-controls";
import StandControls from "./stand-controls";
import ShelfControls from "./shelf-controls";
import { Segmented } from "./field";
import { ShapeIcon, ShapeIconName } from "./shape-icon";
import { useZoomPan } from "./use-zoom-pan";
import styles from "./box-tool.module.css";

type Shape = "box" | "cylinder" | "tray" | "pegboard" | "stand" | "shelf";

const SHAPES: Shape[] = ["box", "cylinder", "tray", "pegboard", "stand", "shelf"];

const shapeLabels: Record<Shape, string> = {
  box: "Box",
  cylinder: "Cyl",
  tray: "Tray",
  pegboard: "Peg",
  stand: "Stand",
  shelf: "Bin",
};

const shapeFullLabels: Record<Shape, string> = {
  box: "Box",
  cylinder: "Cylinder",
  tray: "Tray",
  pegboard: "Pegboard",
  stand: "Stand",
  shelf: "Bin",
};

const unitLabels: Record<LengthUnit, string> = {
  mm: "mm",
  cm: "cm",
  m: "m",
  in: "in",
  ft: "ft",
};

interface ActiveShape {
  errors: string[];
  panels: Panel[] | null;
  cornerRadius: number;
  filename: string;
  controls: ReactNode;
}

/** Fullscreen API vendor fallbacks — Safari (desktop and iPadOS) still needs the webkit-prefixed names. */
interface FullscreenElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void> | void;
}
interface FullscreenDocument extends Document {
  webkitExitFullscreen?: () => Promise<void> | void;
  webkitFullscreenElement?: Element | null;
}

export default function BoxTool() {
  const [shape, setShape] = useState<Shape>("box");
  const [unit, setUnit] = useState<LengthUnit>("mm");
  const [boxSpec, setBoxSpec] = useState<BoxSpec>(DEFAULT_BOX_SPEC);
  const [cylinderSpec, setCylinderSpec] = useState<CylinderSpec>(DEFAULT_CYLINDER_SPEC);
  const [traySpec, setTraySpec] = useState<TraySpec>(DEFAULT_TRAY_SPEC);
  const [pegboardSpec, setPegboardSpec] = useState<PegboardSpec>(DEFAULT_PEGBOARD_SPEC);
  const [standSpec, setStandSpec] = useState<StandSpec>(DEFAULT_STAND_SPEC);
  const [shelfSpec, setShelfSpec] = useState<ShelfBinSpec>(DEFAULT_SHELF_BIN_SPEC);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [converterOpen, setConverterOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const zoomPan = useZoomPan();
  const resetZoomPan = zoomPan.reset;

  useEffect(() => {
    function onFullscreenChange() {
      const doc = document as FullscreenDocument;
      const current = document.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
      setIsFullscreen(current === rootRef.current);
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("webkitfullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", onFullscreenChange);
    };
  }, []);

  // A different shape (or leaving/re-entering fullscreen) starts from a clean 100% view.
  useEffect(() => {
    resetZoomPan();
  }, [shape, isFullscreen, resetZoomPan]);

  async function toggleFullscreen() {
    const doc = document as FullscreenDocument;
    const el = rootRef.current as FullscreenElement | null;
    if (!el) return;
    const current = document.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
    if (current) {
      await (document.exitFullscreen ?? doc.webkitExitFullscreen)?.call(document);
    } else {
      await (el.requestFullscreen ?? el.webkitRequestFullscreen)?.call(el);
    }
  }

  const active: ActiveShape = useMemo(() => {
    switch (shape) {
      case "box": {
        const errors = validateBoxSpec(boxSpec);
        return {
          errors,
          panels: errors.length === 0 ? generateBox(boxSpec) : null,
          cornerRadius: boxSpec.cornerRadius,
          filename: `box-${boxSpec.width}x${boxSpec.depth}x${boxSpec.height}`,
          controls: <BoxControls spec={boxSpec} setSpec={setBoxSpec} unit={unit} />,
        };
      }
      case "cylinder": {
        const errors = validateCylinderSpec(cylinderSpec);
        return {
          errors,
          panels: errors.length === 0 ? generateCylinder(cylinderSpec) : null,
          cornerRadius: 0,
          filename: `cylinder-${cylinderSpec.diameter}x${cylinderSpec.height}`,
          controls: <CylinderControls spec={cylinderSpec} setSpec={setCylinderSpec} unit={unit} />,
        };
      }
      case "tray": {
        const errors = validateTraySpec(traySpec);
        return {
          errors,
          panels: errors.length === 0 ? generateTray(traySpec) : null,
          cornerRadius: traySpec.cornerRadius,
          filename: `tray-${traySpec.width}x${traySpec.depth}x${traySpec.height}`,
          controls: <TrayControls spec={traySpec} setSpec={setTraySpec} unit={unit} />,
        };
      }
      case "pegboard": {
        const errors = validatePegboardSpec(pegboardSpec);
        return {
          errors,
          panels: errors.length === 0 ? generatePegboard(pegboardSpec) : null,
          cornerRadius: 0,
          filename: `pegboard-${pegboardSpec.width}x${pegboardSpec.height}`,
          controls: <PegboardControls spec={pegboardSpec} setSpec={setPegboardSpec} unit={unit} />,
        };
      }
      case "stand": {
        const errors = validateStandSpec(standSpec);
        return {
          errors,
          panels: errors.length === 0 ? generateStand(standSpec) : null,
          cornerRadius: 0,
          filename: `stand-${standSpec.legWidth}x${standSpec.legHeight}`,
          controls: <StandControls spec={standSpec} setSpec={setStandSpec} unit={unit} />,
        };
      }
      case "shelf": {
        const errors = validateShelfBinSpec(shelfSpec);
        return {
          errors,
          panels: errors.length === 0 ? generateShelfBin(shelfSpec) : null,
          cornerRadius: 0,
          filename: `bin-${shelfSpec.width}x${shelfSpec.depth}x${shelfSpec.height}`,
          controls: <ShelfControls spec={shelfSpec} setSpec={setShelfSpec} unit={unit} />,
        };
      }
    }
  }, [shape, unit, boxSpec, cylinderSpec, traySpec, pegboardSpec, standSpec, shelfSpec]);

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
    <div className={styles.root} ref={rootRef}>
      <div className={styles.topBar}>
        <div className={styles.topBarGroup}>
          <span className={`${styles.topBarLabel} mono`}>{shapeFullLabels[shape]}</span>
        </div>
        <div className={styles.topBarGroup}>
          <span className={`${styles.topBarLabel} mono`}>units</span>
          <Segmented options={LENGTH_UNITS} labels={unitLabels} value={unit} onChange={setUnit} ariaLabel="Length unit" columns={5} />
          <button type="button" className={`${styles.converterToggle} mono`} onClick={() => setConverterOpen(true)}>
            Converter
          </button>
          <button type="button" className={`${styles.download} mono`} onClick={downloadSvg} disabled={!svg}>
            Download SVG
          </button>
          <button type="button" className={`${styles.converterToggle} mono`} onClick={toggleFullscreen}>
            {isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          </button>
        </div>
      </div>

      <div className={styles.workspace}>
        <nav className={styles.shapeRail} aria-label="Shape">
          {SHAPES.map((option) => (
            <button
              key={option}
              type="button"
              className={`${styles.shapeButton} ${shape === option ? styles.shapeButtonActive : ""}`}
              onClick={() => setShape(option)}
              aria-pressed={shape === option}
              title={shapeFullLabels[option]}
            >
              <ShapeIcon shape={option as ShapeIconName} />
              <span className={`${styles.shapeButtonLabel} mono`}>{shapeLabels[option]}</span>
            </button>
          ))}
        </nav>

        <section className={styles.canvasPane} aria-label="Panel layout preview">
          <div className={styles.previewHead}>
            <h2 className={`${styles.sectionLabel} mono`}>preview</h2>
            {svg && (
              <span className={`${styles.previewMeta} mono`}>
                {panelCount} panels &middot; {roundForDisplay(fromMm(layout[0], unit), unit)} x {roundForDisplay(fromMm(layout[1], unit), unit)}{" "}
                {unit} sheet
              </span>
            )}
          </div>
          {isFullscreen && svg ? (
            <div
              className={`${styles.canvas} ${styles.canvasZoomable} ${zoomPan.dragging ? styles.canvasDragging : ""}`}
              onWheel={zoomPan.handleWheel}
              onPointerDown={zoomPan.handlePointerDown}
              onPointerMove={zoomPan.handlePointerMove}
              onPointerUp={zoomPan.endDrag}
              onPointerLeave={zoomPan.endDrag}
            >
              <div
                className={styles.zoomTransform}
                style={{ transform: `translate(${zoomPan.offset.x}px, ${zoomPan.offset.y}px) scale(${zoomPan.scale})` }}
              >
                <div className={styles.svgWrap} dangerouslySetInnerHTML={{ __html: svg }} />
              </div>
              <div className={styles.zoomControls}>
                <button type="button" className="mono" onClick={() => zoomPan.zoomBy(1 / 1.25)} aria-label="Zoom out">
                  &minus;
                </button>
                <span className={`${styles.zoomReadout} mono`}>{Math.round(zoomPan.scale * 100)}%</span>
                <button type="button" className="mono" onClick={() => zoomPan.zoomBy(1.25)} aria-label="Zoom in">
                  +
                </button>
                <button type="button" className="mono" onClick={zoomPan.reset}>
                  Reset
                </button>
              </div>
              <span className={`${styles.zoomHint} mono`}>scroll to zoom &middot; drag to pan</span>
            </div>
          ) : (
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
                <p className={`${styles.canvasEmpty} mono`}>fix the parameters to the right to render a preview</p>
              )}
            </div>
          )}
        </section>

        <aside className={styles.dock} aria-label="Shape parameters">
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
        </aside>
      </div>

      {lightboxOpen && svg && <SvgLightbox svg={svg} title={active.filename} onClose={() => setLightboxOpen(false)} />}
      {converterOpen && <UnitConverter onClose={() => setConverterOpen(false)} />}
    </div>
  );
}
