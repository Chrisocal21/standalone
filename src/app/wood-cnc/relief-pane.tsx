"use client";

import { useMemo, useState } from "react";
import { addCornerRelief, countConcaveVertices, Point, ReliefStyle } from "@/lib/cnc-relief";
import { parseStraightSvgPaths } from "@/lib/svg-path-parse";
import { LengthUnit } from "@/lib/units";
import { CollapsibleSection, NumberField, Segmented } from "./field";
import styles from "./cnc-tool.module.css";

const RELIEF_STYLES: ReliefStyle[] = ["dogbone", "tbone"];
const reliefLabels: Record<ReliefStyle, string> = { dogbone: "Dogbone", tbone: "T-bone" };

const SAMPLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 30">
  <path d="M 0,0 L 15,0 L 15,10 L 25,10 L 25,0 L 40,0 L 40,30 L 0,30 Z" />
</svg>`;

function polygonsToSvg(polygons: readonly Point[][]): { svg: string; width: number; height: number } {
  const allPoints = polygons.flat();
  const xs = allPoints.map((p) => p[0]);
  const ys = allPoints.map((p) => p[1]);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  const width = maxX - minX;
  const height = maxY - minY;
  const margin = Math.max(width, height, 1) * 0.05;

  const paths = polygons
    .map((polygon) => {
      const d = polygon.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${(x - minX).toFixed(3)},${(y - minY).toFixed(3)}`).join(" ");
      return `  <path d="${d} Z" fill="none" stroke="#191c20" stroke-width="${Math.max(width, height) * 0.003}" />`;
    })
    .join("\n");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-margin} ${-margin} ${width + margin * 2} ${height + margin * 2}">\n${paths}\n</svg>`;
  return { svg, width, height };
}

export default function ReliefPane({ unit }: { unit: LengthUnit }) {
  const [source, setSource] = useState("");
  const [bitDiameterMm, setBitDiameterMm] = useState(6.35);
  const [style, setStyle] = useState<ReliefStyle>("dogbone");

  const { polygons: parsed, error } = useMemo((): { polygons: Point[][] | null; error: string | null } => {
    if (source.trim() === "") return { polygons: null, error: null };
    try {
      return { polygons: parseStraightSvgPaths(source), error: null };
    } catch (err) {
      return { polygons: null, error: err instanceof Error ? err.message : "Couldn't parse that path data." };
    }
  }, [source]);

  const { svg, reliefCount } = useMemo(() => {
    if (!parsed) return { svg: null as string | null, reliefCount: 0 };
    const toolRadius = bitDiameterMm / 2;
    let count = 0;
    const relieved = parsed.map((polygon) => {
      count += countConcaveVertices(polygon);
      return addCornerRelief(polygon, { style, toolRadius });
    });
    return { svg: polygonsToSvg(relieved).svg, reliefCount: count };
  }, [parsed, bitDiameterMm, style]);

  function handleFile(file: File) {
    file.text().then(setSource);
  }

  function downloadSvg() {
    if (!svg) return;
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "relieved-path.svg";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <section className={styles.canvasPane} aria-label="Corner relief preview">
        <div className={styles.resultsHead}>
          <h2 className={`${styles.sectionLabel} mono`}>preview</h2>
          <div className={styles.topBarGroup}>
            {svg && (
              <span className={`${styles.hintText} mono`} style={{ marginTop: 0 }}>
                {reliefCount} corners relieved
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
            <p className={`${styles.hintText} mono`}>paste or upload straight-line SVG path data to preview it here</p>
          )}
        </div>
        {error && (
          <ul className={styles.errors}>
            <li className="mono">{error}</li>
          </ul>
        )}
      </section>

      <aside className={styles.dock} aria-label="Relief parameters">
        <CollapsibleSection title="SVG path">
          <textarea
            className={styles.textarea}
            value={source}
            onChange={(event) => setSource(event.target.value)}
            placeholder="Paste an SVG document or raw path 'd' data (straight lines only — M/L/H/V/Z)"
            rows={8}
          />
          <div className={styles.fieldsSpaced} style={{ display: "flex", gap: 8 }}>
            <label className={`${styles.converterToggle} mono`} style={{ cursor: "pointer" }}>
              Upload file
              <input
                type="file"
                accept=".svg,.txt"
                style={{ display: "none" }}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) handleFile(file);
                  event.target.value = "";
                }}
              />
            </label>
            <button type="button" className={`${styles.converterToggle} mono`} onClick={() => setSource(SAMPLE_SVG)}>
              Load sample
            </button>
          </div>
          <p className={styles.hintText}>
            Straight-line paths only (no curves) — exactly what this app&rsquo;s own laser SVG export produces, so a laser-cut panel design can be
            reused here for a CNC-routed version instead.
          </p>
        </CollapsibleSection>

        <CollapsibleSection title="Bit &amp; relief">
          <div className={styles.fields}>
            <NumberField
              field={{ key: "bitDiameterMm", label: "Bit diameter", unit: "", step: 0.1, min: 0.1 }}
              value={bitDiameterMm}
              onChange={setBitDiameterMm}
              unit={unit}
            />
          </div>
          <div className={styles.fieldsSpaced}>
            <span className={styles.fieldLabel}>Corner relief style</span>
            <div style={{ marginTop: 6 }}>
              <Segmented options={RELIEF_STYLES} labels={reliefLabels} value={style} onChange={setStyle} ariaLabel="Corner relief style" />
            </div>
          </div>
        </CollapsibleSection>
      </aside>
    </>
  );
}
