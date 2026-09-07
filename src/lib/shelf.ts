/**
 * Ported from src/standalone_box/shelf.py — keep in sync with the Python
 * reference. The Python engine remains the source of truth for real cut
 * files; this is a browser-side reimplementation for the live preview.
 */

import { BoxSpec, JOINT_TYPES, JointType, Panel, circlePath, generateBox } from "./geometry";

export interface ShelfBinSpec {
  width: number;
  depth: number;
  height: number;
  materialThickness: number;
  kerf: number;
  fingers: number;
  joint: JointType;
  mountingHoleDiameter: number;
  mountingHoleInset: number;
  stackable: boolean;
}

export const DEFAULT_SHELF_BIN_SPEC: ShelfBinSpec = {
  width: 200,
  depth: 100,
  height: 80,
  materialThickness: 3,
  kerf: 0.15,
  fingers: 4,
  joint: "finger",
  mountingHoleDiameter: 4,
  mountingHoleInset: 10,
  stackable: false,
};

export function validateShelfBinSpec(spec: ShelfBinSpec): string[] {
  const errors: string[] = [];
  if (!JOINT_TYPES.includes(spec.joint)) errors.push(`joint must be one of ${JOINT_TYPES.join(", ")}`);
  if (!(spec.mountingHoleDiameter > 0)) errors.push("mountingHoleDiameter must be greater than zero");
  if (spec.mountingHoleInset < spec.mountingHoleDiameter / 2) {
    errors.push("mountingHoleInset must clear the mounting hole's own radius");
  }
  if (spec.mountingHoleInset * 2 >= spec.width) errors.push("mountingHoleInset leaves no room across the back panel's width");
  return errors;
}

/**
 * An open-top box with mounting holes added to its back panel for wall-hanging.
 *
 * Built by generating a normal box and swapping in a back panel with holes
 * added — no new panel-outline geometry, just reusing generateBox.
 */
export function generateShelfBin(spec: ShelfBinSpec): Panel[] {
  const boxSpec: BoxSpec = {
    width: spec.width,
    depth: spec.depth,
    height: spec.height,
    materialThickness: spec.materialThickness,
    kerf: spec.kerf,
    fingers: spec.fingers,
    joint: spec.joint,
    dovetailAngle: 10,
    cornerRadius: 0,
    lidStyle: "none",
    dividerRows: 0,
    dividerColumns: 0,
    stackable: spec.stackable,
  };
  const panels = generateBox(boxSpec);
  const inset = spec.mountingHoleInset;
  const radius = spec.mountingHoleDiameter / 2;
  return panels.map((panel) => {
    if (panel.name !== "back") return panel;
    const mountHoles = [circlePath([inset, inset], radius), circlePath([panel.width - inset, inset], radius)];
    return { ...panel, holes: [...panel.holes, ...mountHoles] };
  });
}
