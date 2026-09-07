/**
 * Ported from src/standalone_box/pegboard.py — keep in sync with the Python
 * reference. The Python engine remains the source of truth for real cut
 * files; this is a browser-side reimplementation for the live preview.
 */

import { Panel, Point, circlePath, rectPath } from "./geometry";

export interface PegboardSpec {
  width: number;
  height: number;
  materialThickness: number;
  kerf: number;
  holeDiameter: number;
  holePitch: number;
  margin: number;
  mountingHoleDiameter: number;
  mountingHoleInset: number;
}

export const DEFAULT_PEGBOARD_SPEC: PegboardSpec = {
  width: 300,
  height: 200,
  materialThickness: 3,
  kerf: 0.15,
  holeDiameter: 6.35,
  holePitch: 25.4,
  margin: 12.7,
  mountingHoleDiameter: 4,
  mountingHoleInset: 10,
};

export function validatePegboardSpec(spec: PegboardSpec): string[] {
  const errors: string[] = [];
  for (const [name, value] of [
    ["width", spec.width],
    ["height", spec.height],
    ["materialThickness", spec.materialThickness],
    ["holeDiameter", spec.holeDiameter],
    ["mountingHoleDiameter", spec.mountingHoleDiameter],
  ] as const) {
    if (!(value > 0)) errors.push(`${name} must be greater than zero`);
  }
  if (spec.kerf < 0) errors.push("kerf cannot be negative");
  if (spec.holePitch <= spec.holeDiameter) errors.push("holePitch must be greater than holeDiameter");
  if (spec.margin < 0) errors.push("margin cannot be negative");
  if (spec.margin * 2 >= Math.min(spec.width, spec.height)) errors.push("margin leaves no room for holes");
  if (spec.mountingHoleInset < spec.mountingHoleDiameter / 2) {
    errors.push("mountingHoleInset must clear the mounting hole's own radius");
  }
  return errors;
}

/** Evenly spaced hole centers, centered within [margin, span - margin]. */
function holeGridPositions(span: number, pitch: number, margin: number): number[] {
  const usable = span - 2 * margin;
  const count = Math.floor(usable / pitch) + 1;
  const usedSpan = (count - 1) * pitch;
  const start = margin + (usable - usedSpan) / 2;
  return Array.from({ length: count }, (_, i) => start + i * pitch);
}

/** A single flat panel: no joints, since it's meant to mount on a wall as-is. */
export function generatePegboard(spec: PegboardSpec): Panel[] {
  const xPositions = holeGridPositions(spec.width, spec.holePitch, spec.margin);
  const yPositions = holeGridPositions(spec.height, spec.holePitch, spec.margin);
  const pegHoles: Point[][] = [];
  for (const y of yPositions) {
    for (const x of xPositions) {
      pegHoles.push(circlePath([x, y], spec.holeDiameter / 2));
    }
  }

  const inset = spec.mountingHoleInset;
  const mountHoles: Point[][] = [];
  for (const x of [inset, spec.width - inset]) {
    for (const y of [inset, spec.height - inset]) {
      mountHoles.push(circlePath([x, y], spec.mountingHoleDiameter / 2));
    }
  }

  return [
    {
      name: "panel",
      width: spec.width,
      height: spec.height,
      path: rectPath(spec.width, spec.height),
      holes: [...pegHoles, ...mountHoles],
      cuts: [],
    },
  ];
}
