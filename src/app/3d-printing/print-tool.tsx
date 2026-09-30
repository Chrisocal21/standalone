"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  boundingBox,
  DEFAULT_ENCLOSURE_SPEC,
  DEFAULT_TUBE_SPEC,
  EnclosureSpec,
  generateEnclosure,
  generateTube,
  Mesh,
  meshVolumeMm3,
  rotateMesh,
  scaleMesh,
  TubeSpec,
  translateMesh,
  validateEnclosureSpec,
  validateTubeSpec,
} from "@/lib/solids";
import { meshToStl, parseStl } from "@/lib/stl";
import { LENGTH_UNITS, LengthUnit, fromMm, roundForDisplay } from "@/lib/units";
import { Segmented } from "./field";
import EnclosureControls from "./enclosure-controls";
import TubeControls from "./tube-controls";
import ImportControls, { DEFAULT_IMPORT_TRANSFORM, ImportTransform } from "./import-controls";
import PlacementControls, { DEFAULT_GRID_STEP, GridStepOption, ORIGIN_PLACEMENT, Placement } from "./placement-controls";
import MeshPreview from "./mesh-preview";
import styles from "./print-tool.module.css";

type Shape = "enclosure" | "tube" | "import";
const SHAPES: Shape[] = ["enclosure", "tube", "import"];
const shapeLabels: Record<Shape, string> = { enclosure: "Encl", tube: "Tube", import: "Import" };
const shapeFullLabels: Record<Shape, string> = { enclosure: "Enclosure", tube: "Tube / Spacer", import: "Import STL" };

const unitLabels: Record<LengthUnit, string> = { mm: "mm", cm: "cm", m: "m", in: "in", ft: "ft" };

interface PartOption {
  key: string;
  label: string;
  mesh: Mesh;
}

/** Fullscreen API vendor fallbacks — Safari (desktop and iPadOS) still needs the webkit-prefixed names. */
interface FullscreenElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void> | void;
}
interface FullscreenDocument extends Document {
  webkitExitFullscreen?: () => Promise<void> | void;
  webkitFullscreenElement?: Element | null;
}

export default function PrintTool() {
  const [shape, setShape] = useState<Shape>("enclosure");
  const [unit, setUnit] = useState<LengthUnit>("mm");
  const [enclosureSpec, setEnclosureSpec] = useState<EnclosureSpec>(DEFAULT_ENCLOSURE_SPEC);
  const [tubeSpec, setTubeSpec] = useState<TubeSpec>(DEFAULT_TUBE_SPEC);
  const [activePart, setActivePart] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const [placement, setPlacement] = useState<Placement>(ORIGIN_PLACEMENT);
  const [gridStep, setGridStep] = useState<GridStepOption>(DEFAULT_GRID_STEP);

  const [importedMesh, setImportedMesh] = useState<Mesh | null>(null);
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const [importTransform, setImportTransform] = useState<ImportTransform>(DEFAULT_IMPORT_TRANSFORM);
  const [importError, setImportError] = useState<string | null>(null);

  function handleImportFile(file: File) {
    file
      .arrayBuffer()
      .then((buffer) => {
        const mesh = parseStl(buffer);
        if (mesh.length === 0) throw new Error("No triangles found — is this a valid STL file?");
        setImportedMesh(mesh);
        setImportFileName(file.name);
        setImportTransform(DEFAULT_IMPORT_TRANSFORM);
        setImportError(null);
      })
      .catch((error: unknown) => {
        setImportError(error instanceof Error ? error.message : "Couldn't read that file.");
      });
  }

  function clearImport() {
    setImportedMesh(null);
    setImportFileName(null);
    setImportTransform(DEFAULT_IMPORT_TRANSFORM);
    setImportError(null);
  }

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

  const active = useMemo(() => {
    if (shape === "enclosure") {
      const errors = validateEnclosureSpec(enclosureSpec);
      if (errors.length > 0) return { errors, parts: [] as PartOption[], filename: "enclosure" };
      const result = generateEnclosure(enclosureSpec);
      const parts: PartOption[] = [{ key: "body", label: "Body", mesh: result.body }];
      if (result.lid) parts.push({ key: "lid", label: "Lid", mesh: result.lid });
      return { errors, parts, filename: `enclosure-${enclosureSpec.width}x${enclosureSpec.depth}x${enclosureSpec.height}` };
    }
    if (shape === "tube") {
      const errors = validateTubeSpec(tubeSpec);
      if (errors.length > 0) return { errors, parts: [] as PartOption[], filename: "tube" };
      const mesh = generateTube(tubeSpec);
      return {
        errors,
        parts: [{ key: "tube", label: "Tube", mesh }] as PartOption[],
        filename: `tube-${tubeSpec.outerDiameter}x${tubeSpec.innerDiameter}x${tubeSpec.height}`,
      };
    }
    // shape === "import"
    if (importError) return { errors: [importError], parts: [] as PartOption[], filename: "import" };
    if (!importedMesh) return { errors: ["Upload an STL to edit it here."], parts: [] as PartOption[], filename: "import" };
    const scaled = scaleMesh(importedMesh, importTransform.scaleX, importTransform.scaleY, importTransform.scaleZ);
    const mesh = rotateMesh(scaled, importTransform.rotateX, importTransform.rotateY, importTransform.rotateZ);
    const baseName = (importFileName ?? "import").replace(/\.stl$/i, "");
    return {
      errors: [] as string[],
      parts: [{ key: "edited", label: baseName, mesh }] as PartOption[],
      filename: `${baseName}-edited`,
    };
  }, [shape, enclosureSpec, tubeSpec, importedMesh, importFileName, importTransform, importError]);

  const clampedPartIndex = Math.min(activePart, Math.max(active.parts.length - 1, 0));
  const currentPart = active.parts[clampedPartIndex] ?? null;

  // Placement (position offset) applies universally, on top of whatever shape is active —
  // it's a per-part nudge, not part of any shape's own generation.
  const placedMesh = useMemo(() => {
    if (!currentPart) return null;
    return translateMesh(currentPart.mesh, placement.x, placement.y, placement.z);
  }, [currentPart, placement]);

  const stats = useMemo(() => {
    if (!placedMesh) return null;
    const { min, max } = boundingBox(placedMesh);
    const dims = [max[0] - min[0], max[1] - min[1], max[2] - min[2]] as const;
    const volumeMm3 = meshVolumeMm3(placedMesh);
    return {
      dims: dims.map((d) => roundForDisplay(fromMm(d, unit), unit)),
      triangles: placedMesh.length,
      volumeCm3: (volumeMm3 / 1000).toFixed(2),
    };
  }, [placedMesh, unit]);

  function downloadStl() {
    if (!currentPart || !placedMesh) return;
    // STL has no native unit — mm is the de facto convention slicers assume, so mesh coordinates stay in mm regardless of the display unit.
    const stl = meshToStl(placedMesh, currentPart.key);
    const blob = new Blob([stl], { type: "model/stl" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${active.filename}-${currentPart.key}.stl`;
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
          <button type="button" className={`${styles.download} mono`} onClick={downloadStl} disabled={!currentPart}>
            Download STL
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
              onClick={() => {
                setShape(option);
                setActivePart(0);
              }}
              aria-pressed={shape === option}
              title={shapeFullLabels[option]}
            >
              <span className={`${styles.shapeButtonLabel} mono`}>{shapeLabels[option]}</span>
            </button>
          ))}
        </nav>

        <section className={styles.canvasPane} aria-label="Solid preview">
          <div className={styles.previewHead}>
            <h2 className={`${styles.sectionLabel} mono`}>preview</h2>
            {stats && (
              <span className={`${styles.previewMeta} mono`}>
                {stats.dims[0]} x {stats.dims[1]} x {stats.dims[2]} {unit} &middot; ≈{stats.volumeCm3} cm&sup3; &middot; {stats.triangles} tris
              </span>
            )}
          </div>

          {active.parts.length > 1 && (
            <div className={styles.partTabs} role="tablist" aria-label="Parts">
              {active.parts.map((part, index) => (
                <button
                  key={part.key}
                  type="button"
                  role="tab"
                  aria-selected={clampedPartIndex === index}
                  className={`${styles.partTab} mono ${clampedPartIndex === index ? styles.partTabActive : ""}`}
                  onClick={() => setActivePart(index)}
                >
                  {part.label}
                </button>
              ))}
            </div>
          )}

          <div className={styles.canvas} style={{ padding: 0 }}>
            {placedMesh ? (
              <MeshPreview meshes={[placedMesh]} label={`${shapeFullLabels[shape]} preview`} unit={unit} />
            ) : (
              <p className={`${styles.canvasEmpty} mono`}>fix the parameters to the right to render a preview</p>
            )}
          </div>
        </section>

        <aside className={styles.dock} aria-label="Shape parameters">
          <PlacementControls placement={placement} setPlacement={setPlacement} gridStep={gridStep} setGridStep={setGridStep} unit={unit} />

          {shape === "enclosure" && <EnclosureControls spec={enclosureSpec} setSpec={setEnclosureSpec} unit={unit} />}
          {shape === "tube" && <TubeControls spec={tubeSpec} setSpec={setTubeSpec} unit={unit} />}
          {shape === "import" && (
            <ImportControls
              fileName={importFileName}
              onFile={handleImportFile}
              onClear={clearImport}
              transform={importTransform}
              setTransform={setImportTransform}
            />
          )}

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
    </div>
  );
}
