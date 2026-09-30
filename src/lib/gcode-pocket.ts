/**
 * Rectangular-pocket G-code generator: a raster (zigzag/boustrophedon)
 * clearing toolpath, multiple depth passes, plus a final perimeter finishing
 * pass at full depth. No islands, no arbitrary boundary — a single
 * rectangular pocket is the whole scope here. Output is plain G-code
 * (G21 metric, G90 absolute) that should work on any standard GRBL/Mach3
 * -style controller, but always air-cut (jog the whole program with the bit
 * well above the stock, spindle off) before running it for real.
 */

export interface PocketSpec {
  pocketWidth: number;
  pocketLength: number;
  totalDepth: number;
  depthPerPass: number;
  bitDiameter: number;
  stepoverPercent: number; // radial stepover, as % of bit diameter
  feedRateMmMin: number;
  plungeRateMmMin: number;
  spindleRpm: number;
  safeHeightMm: number;
  finishPass: boolean;
  originX: number;
  originY: number;
}

export const DEFAULT_POCKET_SPEC: PocketSpec = {
  pocketWidth: 60,
  pocketLength: 100,
  totalDepth: 6,
  depthPerPass: 2,
  bitDiameter: 6.35,
  stepoverPercent: 40,
  feedRateMmMin: 1200,
  plungeRateMmMin: 400,
  spindleRpm: 18000,
  safeHeightMm: 5,
  finishPass: true,
  originX: 0,
  originY: 0,
};

export function validatePocketSpec(spec: PocketSpec): string[] {
  const errors: string[] = [];
  if (spec.pocketWidth <= 0 || spec.pocketLength <= 0) errors.push("Pocket width and length must be positive.");
  if (spec.totalDepth <= 0) errors.push("Total depth must be positive.");
  if (spec.depthPerPass <= 0) errors.push("Depth per pass must be positive.");
  if (spec.bitDiameter <= 0) errors.push("Bit diameter must be positive.");
  if (spec.bitDiameter >= spec.pocketWidth || spec.bitDiameter >= spec.pocketLength) {
    errors.push("Bit diameter must be smaller than both pocket dimensions.");
  }
  if (spec.stepoverPercent <= 0 || spec.stepoverPercent > 100) errors.push("Stepover must be between 0 and 100%.");
  if (spec.feedRateMmMin <= 0) errors.push("Feed rate must be positive.");
  if (spec.plungeRateMmMin <= 0) errors.push("Plunge rate must be positive.");
  if (spec.spindleRpm <= 0) errors.push("Spindle RPM must be positive.");
  if (spec.safeHeightMm <= 0) errors.push("Safe height must be positive.");
  return errors;
}

export interface PocketPlan {
  passCount: number;
  passDepths: number[]; // cumulative depth (positive number, mm below surface) at the bottom of each pass
  rasterLineCount: number;
  estimatedCutLengthMm: number;
  estimatedTimeMin: number;
}

function fmt(n: number): string {
  return n.toFixed(4).replace(/\.?0+$/, "");
}

/** The raster's Y line positions (or X, for a portrait pocket) — half a bit radius in from each wall, then stepped by stepover, always including a final line snapped to the far wall so no strip along that wall is left uncut. */
function rasterLines(clearAcross: number, bitRadius: number, stepover: number): number[] {
  const first = bitRadius;
  const last = clearAcross - bitRadius;
  if (last <= first) return [clearAcross / 2];
  const lines = [first];
  let y = first;
  while (y + stepover < last) {
    y += stepover;
    lines.push(y);
  }
  if (lines[lines.length - 1] < last - 1e-6) lines.push(last);
  return lines;
}

export function planPocket(spec: PocketSpec): PocketPlan {
  const passCount = Math.ceil(spec.totalDepth / spec.depthPerPass);
  const passDepths = Array.from({ length: passCount }, (_, i) => Math.min((i + 1) * spec.depthPerPass, spec.totalDepth));

  const bitRadius = spec.bitDiameter / 2;
  const stepover = spec.bitDiameter * (spec.stepoverPercent / 100);
  // Raster along the longer dimension's lines, sweeping across the shorter one — fewer, longer passes.
  const rasterAcross = spec.pocketLength >= spec.pocketWidth ? spec.pocketWidth : spec.pocketLength;
  const sweepLength = spec.pocketLength >= spec.pocketWidth ? spec.pocketLength : spec.pocketWidth;
  const lines = rasterLines(rasterAcross, bitRadius, stepover);

  const perPassCutLength = lines.length * (sweepLength - spec.bitDiameter) + (spec.finishPass ? 2 * (spec.pocketWidth + spec.pocketLength) : 0);
  const estimatedCutLengthMm = perPassCutLength * passCount;
  const estimatedTimeMin = estimatedCutLengthMm / spec.feedRateMmMin + (passCount * spec.depthPerPass) / spec.plungeRateMmMin;

  return { passCount, passDepths, rasterLineCount: lines.length, estimatedCutLengthMm, estimatedTimeMin };
}

export function generatePocketGcode(spec: PocketSpec): string {
  const lines: string[] = [];
  const push = (s: string) => lines.push(s);

  const bitRadius = spec.bitDiameter / 2;
  const stepover = spec.bitDiameter * (spec.stepoverPercent / 100);
  const portrait = spec.pocketLength < spec.pocketWidth;
  const rasterAcross = portrait ? spec.pocketLength : spec.pocketWidth;
  const sweepMin = bitRadius;
  const sweepMax = (portrait ? spec.pocketWidth : spec.pocketLength) - bitRadius;
  const crossLines = rasterLines(rasterAcross, bitRadius, stepover);

  const ox = spec.originX;
  const oy = spec.originY;

  push("; Rectangular pocket — generated by Standalone's wood-cnc pocket tool.");
  push("; AIR-CUT THIS FIRST (bit well above stock, spindle off) before running on real material.");
  push(`; pocket: ${fmt(spec.pocketWidth)}mm x ${fmt(spec.pocketLength)}mm, depth ${fmt(spec.totalDepth)}mm, bit ${fmt(spec.bitDiameter)}mm`);
  push("G21 ; millimeters");
  push("G90 ; absolute positioning");
  push(`G0 Z${fmt(spec.safeHeightMm)}`);
  push(`M3 S${Math.round(spec.spindleRpm)} ; spindle on`);

  const passDepths = Array.from({ length: Math.ceil(spec.totalDepth / spec.depthPerPass) }, (_, i) =>
    Math.min((i + 1) * spec.depthPerPass, spec.totalDepth),
  );

  function point(across: number, sweep: number): [number, number] {
    // "across" indexes the raster lines (short dimension), "sweep" runs the long dimension.
    return portrait ? [ox + sweep, oy + across] : [ox + across, oy + sweep];
  }

  for (const depth of passDepths) {
    push(`; -- pass to Z-${fmt(depth)} --`);
    let forward = true;
    for (let i = 0; i < crossLines.length; i++) {
      const across = crossLines[i];
      const from = forward ? sweepMin : sweepMax;
      const to = forward ? sweepMax : sweepMin;
      const [startX, startY] = point(across, from);
      if (i === 0) {
        push(`G0 X${fmt(startX)} Y${fmt(startY)}`);
        push(`G1 Z-${fmt(depth)} F${fmt(spec.plungeRateMmMin)}`);
      } else {
        push(`G0 X${fmt(startX)} Y${fmt(startY)}`);
      }
      const [endX, endY] = point(across, to);
      push(`G1 X${fmt(endX)} Y${fmt(endY)} F${fmt(spec.feedRateMmMin)}`);
      forward = !forward;
    }

    if (spec.finishPass) {
      push("; perimeter finishing pass");
      const inset = bitRadius;
      const corners: [number, number][] = [
        [ox + inset, oy + inset],
        [ox + spec.pocketWidth - inset, oy + inset],
        [ox + spec.pocketWidth - inset, oy + spec.pocketLength - inset],
        [ox + inset, oy + spec.pocketLength - inset],
        [ox + inset, oy + inset],
      ];
      push(`G0 X${fmt(corners[0][0])} Y${fmt(corners[0][1])}`);
      for (const [x, y] of corners.slice(1)) {
        push(`G1 X${fmt(x)} Y${fmt(y)} F${fmt(spec.feedRateMmMin)}`);
      }
    }

    push(`G0 Z${fmt(spec.safeHeightMm)}`);
  }

  push("M5 ; spindle off");
  push("M30 ; program end");

  return lines.join("\n");
}
