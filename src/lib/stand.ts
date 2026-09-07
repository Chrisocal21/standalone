/**
 * Ported from src/standalone_box/stand.py — keep in sync with the Python
 * reference. The Python engine remains the source of truth for real cut
 * files; this is a browser-side reimplementation for the live preview.
 */

import { Panel, lapNotchedStripPath } from "./geometry";

export interface StandSpec {
  legWidth: number;
  legHeight: number;
  materialThickness: number;
  kerf: number;
}

export const DEFAULT_STAND_SPEC: StandSpec = {
  legWidth: 100,
  legHeight: 120,
  materialThickness: 3,
  kerf: 0.15,
};

export function validateStandSpec(spec: StandSpec): string[] {
  const errors: string[] = [];
  if (!(spec.materialThickness > 0)) errors.push("materialThickness must be greater than zero");
  if (spec.kerf < 0) errors.push("kerf cannot be negative");
  if (spec.legWidth <= spec.materialThickness * 3) errors.push("legWidth must allow room for the crossing notch");
  if (spec.legHeight <= spec.materialThickness * 2) errors.push("legHeight must be greater than two material thicknesses");
  return errors;
}

/**
 * Two identical legs that cross-lap into a free-standing X (easel/sign-holder).
 *
 * The same notch-on-top / notch-on-bottom mechanism already built and tested
 * for internal box dividers (see geometry.ts's `lapNotchedStripPath`) —
 * reused as-is rather than reinvented. Right angle only for this first pass.
 */
export function generateStand(spec: StandSpec): Panel[] {
  const notchWidth = spec.materialThickness + spec.kerf;
  const center = spec.legWidth / 2;
  const legAPath = lapNotchedStripPath(spec.legWidth, spec.legHeight, notchWidth, [center], true);
  const legBPath = lapNotchedStripPath(spec.legWidth, spec.legHeight, notchWidth, [center], false);
  return [
    { name: "leg-a", width: spec.legWidth, height: spec.legHeight, path: legAPath, holes: [], cuts: [] },
    { name: "leg-b", width: spec.legWidth, height: spec.legHeight, path: legBPath, holes: [], cuts: [] },
  ];
}
