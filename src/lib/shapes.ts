/**
 * Ported from src/standalone_box/shapes.py — keep in sync with the Python
 * reference. The Python engine remains the source of truth for real cut
 * files; this is a browser-side reimplementation for the live preview.
 */

import { Panel, Point, flexCuts } from "./geometry";

export type CylinderLidStyle = "none" | "flat";
export const CYLINDER_LID_STYLES: CylinderLidStyle[] = ["none", "flat"];

export interface CylinderSpec {
  diameter: number;
  height: number;
  materialThickness: number;
  kerf: number;
  tabCount: number;
  lidStyle: CylinderLidStyle;
}

export const DEFAULT_CYLINDER_SPEC: CylinderSpec = {
  diameter: 80,
  height: 60,
  materialThickness: 3,
  kerf: 0.15,
  tabCount: 12,
  lidStyle: "none",
};

export function validateCylinderSpec(spec: CylinderSpec): string[] {
  const errors: string[] = [];
  if (!(spec.diameter > 0)) errors.push("diameter must be greater than zero");
  if (!(spec.height > 0)) errors.push("height must be greater than zero");
  if (!(spec.materialThickness > 0)) errors.push("materialThickness must be greater than zero");
  if (spec.kerf < 0) errors.push("kerf cannot be negative");
  if (spec.tabCount < 4) errors.push("tabCount must be at least 4");
  if (!CYLINDER_LID_STYLES.includes(spec.lidStyle)) {
    errors.push(`lidStyle must be one of ${CYLINDER_LID_STYLES.join(", ")}`);
  }
  if (spec.diameter <= spec.materialThickness * 4) {
    errors.push("diameter must allow room for the tab notches");
  }
  return errors;
}

function circlePoint([cx, cy]: Point, radius: number, angle: number): Point {
  return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
}

/**
 * A circle's boundary with `tabCount` evenly spaced radial notches.
 *
 * Each notch is a straight-sided radial indentation (in, across, out) sized
 * to receive a matching wall tab folded up 90 degrees — a flat tab meeting a
 * flat notch wall is a closer fit than a notch curved to match the circle
 * exactly. Smooth circle segments fill the gaps between notches; the circle
 * itself is approximated as a many-sided polygon rather than true arcs,
 * which is visually indistinguishable from a circle at any reasonable zoom
 * for these tab counts and radii.
 */
function notchedCirclePolygon(
  center: Point,
  radius: number,
  tabCount: number,
  tabWidth: number,
  notchDepth: number,
  arcSegmentsPerGap = 8
): Point[] {
  const pitchAngle = (2 * Math.PI) / tabCount;
  const halfNotchAngle = tabWidth / 2 / radius;
  const points: Point[] = [];
  for (let index = 0; index < tabCount; index++) {
    const centerAngle = index * pitchAngle;
    const notchStart = centerAngle - halfNotchAngle;
    const notchEnd = centerAngle + halfNotchAngle;
    const gapEnd = centerAngle + pitchAngle - halfNotchAngle;
    points.push(circlePoint(center, radius, notchStart));
    points.push(circlePoint(center, radius - notchDepth, notchStart));
    points.push(circlePoint(center, radius - notchDepth, notchEnd));
    points.push(circlePoint(center, radius, notchEnd));
    for (let step = 1; step <= arcSegmentsPerGap; step++) {
      const angle = notchEnd + ((gapEnd - notchEnd) * step) / arcSegmentsPerGap;
      points.push(circlePoint(center, radius, angle));
    }
  }
  return points;
}

function notchedEdge(
  startX: number,
  endX: number,
  y: number,
  positions: number[],
  notchWidth: number,
  notchDepth: number,
  notchDirection: 1 | -1
): Point[] {
  const step = endX >= startX ? 1 : -1;
  const ordered = step > 0 ? positions : [...positions].reverse();
  const points: Point[] = [[startX, y]];
  for (const center of ordered) {
    const near = center - (step * notchWidth) / 2;
    const far = center + (step * notchWidth) / 2;
    points.push([near, y]);
    points.push([near, y + notchDepth * notchDirection]);
    points.push([far, y + notchDepth * notchDirection]);
    points.push([far, y]);
  }
  points.push([endX, y]);
  return points;
}

/**
 * A rolled wall strip plus a bottom (and optional top) disc.
 *
 * A flat rigid panel doesn't bend into a circle on its own, so the wall
 * carries a kerf-bend slit field (the same brick-offset flex pattern used
 * for the hinged lid, but oriented to curl continuously along the whole
 * width instead of folding at one line) to let it roll. How much that
 * actually flexes depends on the material and this radius — unvalidated,
 * same as everything else that needs a real test-cut.
 *
 * The wall's seam (where its two short ends meet once rolled) is a plain
 * glued butt joint, not interlocking — a first-pass simplification, same
 * spirit as the rabbet joint. What *does* interlock is the wall-to-disc
 * connection: tabs along the wall's top/bottom edges fold up 90 degrees into
 * matching radial notches cut around each disc's rim, at the same pitch, so
 * the two are built from a single shared position list rather than two
 * independently-tuned patterns that could drift apart.
 */
export function generateCylinder(spec: CylinderSpec): Panel[] {
  const radius = spec.diameter / 2 + spec.kerf;
  const circumference = 2 * Math.PI * radius;
  const pitch = circumference / spec.tabCount;
  const tabWidth = pitch * 0.5;
  const tabDepth = spec.materialThickness;
  const positions = Array.from({ length: spec.tabCount }, (_, index) => index * pitch);

  const topEdge: Point[] =
    spec.lidStyle !== "none"
      ? notchedEdge(0, circumference, 0, positions, tabWidth, tabDepth, -1)
      : [
          [0, 0],
          [circumference, 0],
        ];
  const bottomEdge = notchedEdge(circumference, 0, spec.height, positions, tabWidth, tabDepth, 1);
  const wall: Panel = {
    name: "wall",
    width: circumference,
    height: spec.height,
    path: [...topEdge, ...bottomEdge],
    holes: [],
    cuts: flexCuts(circumference, spec.height, "roll"),
  };

  const discPath = notchedCirclePolygon([radius, radius], radius, spec.tabCount, tabWidth, tabDepth);
  const panels: Panel[] = [wall, { name: "bottom", width: radius * 2, height: radius * 2, path: discPath, holes: [], cuts: [] }];
  if (spec.lidStyle === "flat") {
    panels.push({ name: "top", width: radius * 2, height: radius * 2, path: discPath, holes: [], cuts: [] });
  }
  return panels;
}
