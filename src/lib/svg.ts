/**
 * Ported from src/standalone_box/svg.py — keep in sync with the Python
 * reference.
 */

import { Panel, Point } from "./geometry";

/**
 * Deliberately not black: most laser software maps cut/engrave operations by
 * stroke or fill color, so keeping labels off the cut color means they show
 * up for reference in the preview without being sent to the laser as a path.
 */
const LABEL_COLOR = "red";

const CUT_COLOR = "#000000";
const CUT_STROKE_WIDTH = 0.124;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function normalize([x, y]: Point): Point {
  const length = Math.hypot(x, y);
  return length > 1e-9 ? [x / length, y / length] : [0, 0];
}

function straightPathData(points: Point[]): string {
  const commands = [`M ${points[0][0].toFixed(3)},${points[0][1].toFixed(3)}`];
  for (const [x, y] of points.slice(1)) {
    commands.push(`L ${x.toFixed(3)},${y.toFixed(3)}`);
  }
  commands.push("Z");
  return commands.join(" ");
}

/**
 * Replace each sharp vertex with a short arc of at most `radius`.
 *
 * Every corner in this geometry engine is a right angle (all edges are
 * generated axis-aligned in their own local frame), so the arc's tangent
 * length equals its radius exactly — no trigonometry needed beyond that.
 * Each corner's radius is clamped to half of its shorter neighboring segment
 * so tight finger-joint notches can't make adjacent arcs overlap.
 */
function roundedPathData(points: Point[], radius: number): string {
  const count = points.length;
  const commands: string[] = [];
  for (let index = 0; index < count; index++) {
    const prev = points[(index - 1 + count) % count];
    const current = points[index];
    const next = points[(index + 1) % count];
    const directionIn = normalize([current[0] - prev[0], current[1] - prev[1]]);
    const directionOut = normalize([next[0] - current[0], next[1] - current[1]]);
    const lengthIn = Math.hypot(current[0] - prev[0], current[1] - prev[1]);
    const lengthOut = Math.hypot(next[0] - current[0], next[1] - current[1]);
    const cornerRadius = Math.min(radius, lengthIn / 2, lengthOut / 2);
    const before: Point = [current[0] - directionIn[0] * cornerRadius, current[1] - directionIn[1] * cornerRadius];
    const after: Point = [current[0] + directionOut[0] * cornerRadius, current[1] + directionOut[1] * cornerRadius];
    const cross = directionIn[0] * directionOut[1] - directionIn[1] * directionOut[0];
    const sweep = cross > 0 ? 1 : 0;
    commands.push(`${index === 0 ? "M" : "L"} ${before[0].toFixed(3)},${before[1].toFixed(3)}`);
    if (cornerRadius > 1e-6) {
      commands.push(`A ${cornerRadius.toFixed(3)} ${cornerRadius.toFixed(3)} 0 0 ${sweep} ${after[0].toFixed(3)},${after[1].toFixed(3)}`);
    } else {
      commands.push(`L ${after[0].toFixed(3)},${after[1].toFixed(3)}`);
    }
  }
  commands.push("Z");
  return commands.join(" ");
}

function pathData(points: readonly Point[], offsetX: number, offsetY: number, cornerRadius: number): string {
  const absolute: Point[] = points.map(([x, y]) => [x + offsetX, y + offsetY]);
  return cornerRadius > 0 ? roundedPathData(absolute, cornerRadius) : straightPathData(absolute);
}

/**
 * Lay panels out on a grid and trace them into one SVG document.
 *
 * The viewBox is derived from the actual drawn geometry, not the nominal
 * layout size: a panel's outermost tabs (on the sheet's own outer edges, not
 * facing another panel) protrude past the nominal width/height and, for a
 * first-row or first-column panel, past x=0/y=0 into negative space. A
 * viewBox that only spans "0 0 width height" silently clips those tabs, so
 * we compute the true bounding box of every drawn point instead.
 */
export function boxToSvg(panels: Panel[], spacing = 10, cornerRadius = 0): string {
  const columns = 3;
  const rows = Math.ceil(panels.length / columns);
  const columnWidths: number[] = [];
  for (let column = 0; column < columns; column++) {
    const widths: number[] = [];
    for (let index = column; index < panels.length; index += columns) {
      widths.push(panels[index].width);
    }
    columnWidths.push(widths.length ? Math.max(...widths) : 0);
  }
  const rowHeights: number[] = [];
  for (let row = 0; row < rows; row++) {
    const rowPanels = panels.slice(row * columns, (row + 1) * columns);
    rowHeights.push(rowPanels.length ? Math.max(...rowPanels.map((p) => p.height)) : 0);
  }

  const offsets = panels.map((_, index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;
    return {
      x: columnWidths.slice(0, column).reduce((a, b) => a + b, 0) + spacing * column,
      y: rowHeights.slice(0, row).reduce((a, b) => a + b, 0) + spacing * row,
    };
  });

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  panels.forEach((panel, index) => {
    const { x: offsetX, y: offsetY } = offsets[index];
    for (const [x, y] of panel.path) {
      minX = Math.min(minX, x + offsetX);
      maxX = Math.max(maxX, x + offsetX);
      minY = Math.min(minY, y + offsetY);
      maxY = Math.max(maxY, y + offsetY);
    }
  });
  const width = maxX - minX;
  const height = maxY - minY;

  const elements: string[] = [];
  panels.forEach((panel, index) => {
    const { x: offsetX, y: offsetY } = offsets[index];
    const labelX = offsetX + panel.width / 2;
    const labelY = offsetY + panel.height / 2;
    elements.push(`  <path id="${escapeXml(panel.name)}" d="${pathData(panel.path, offsetX, offsetY, cornerRadius)}" />`);
    for (const hole of panel.holes) {
      elements.push(`  <path d="${pathData(hole, offsetX, offsetY, cornerRadius)}" />`);
    }
    for (const [[x1, y1], [x2, y2]] of panel.cuts) {
      elements.push(`  <path d="M ${(x1 + offsetX).toFixed(3)},${(y1 + offsetY).toFixed(3)} L ${(x2 + offsetX).toFixed(3)},${(y2 + offsetY).toFixed(3)}" />`);
    }
    elements.push(
      `  <text x="${labelX.toFixed(3)}" y="${labelY.toFixed(3)}" text-anchor="middle" dominant-baseline="middle" ` +
        `font-family="monospace" font-size="5" fill="${LABEL_COLOR}" stroke="none">${escapeXml(panel.name)}</text>`
    );
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width.toFixed(3)}mm" height="${height.toFixed(3)}mm" viewBox="${minX.toFixed(3)} ${minY.toFixed(3)} ${width.toFixed(3)} ${height.toFixed(3)}">`,
    `  <g fill="none" stroke="${CUT_COLOR}" stroke-width="${CUT_STROKE_WIDTH}">`,
    ...elements,
    "  </g>",
    "</svg>",
  ].join("\n");
}
