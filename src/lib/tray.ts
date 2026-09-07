/**
 * Ported from src/standalone_box/tray.py — keep in sync with the Python
 * reference. The Python engine remains the source of truth for real cut
 * files; this is a browser-side reimplementation for the live preview.
 */

import { BoxSpec, JOINT_TYPES, JointType, Panel, generateBox, validateBoxSpec } from "./geometry";

export interface TraySpec {
  width: number;
  depth: number;
  height: number;
  rows: number;
  columns: number;
  materialThickness: number;
  kerf: number;
  fingers: number;
  joint: JointType;
  cornerRadius: number;
}

export const DEFAULT_TRAY_SPEC: TraySpec = {
  width: 200,
  depth: 150,
  height: 40,
  rows: 0,
  columns: 0,
  materialThickness: 3,
  kerf: 0.15,
  fingers: 4,
  joint: "finger",
  cornerRadius: 0,
};

function asBoxSpec(spec: TraySpec): BoxSpec {
  return {
    width: spec.width,
    depth: spec.depth,
    height: spec.height,
    materialThickness: spec.materialThickness,
    kerf: spec.kerf,
    fingers: spec.fingers,
    joint: spec.joint,
    dovetailAngle: 10,
    cornerRadius: spec.cornerRadius,
    lidStyle: "none",
    dividerRows: spec.rows,
    dividerColumns: spec.columns,
    stackable: false,
  };
}

export function validateTraySpec(spec: TraySpec): string[] {
  const errors: string[] = [];
  if (spec.rows < 0 || spec.columns < 0) errors.push("rows and columns cannot be negative");
  if (!JOINT_TYPES.includes(spec.joint)) errors.push(`joint must be one of ${JOINT_TYPES.join(", ")}`);
  return [...errors, ...validateBoxSpec(asBoxSpec(spec))];
}

export function generateTray(spec: TraySpec): Panel[] {
  return generateBox(asBoxSpec(spec));
}
