import { BoxSpec, generateBox, Panel } from "./geometry";
import { addCornerRelief, countConcaveVertices, ReliefStyle } from "./cnc-relief";

export type CncReliefStyle = ReliefStyle | "none";
export const CNC_RELIEF_STYLES: CncReliefStyle[] = ["dogbone", "tbone", "none"];

export interface CncBoxOptions {
  /** Router bit diameter — plays the same role laser kerf does in BoxSpec.kerf: it's added to every panel's cut size so the finished box comes out to the nominal dimensions. */
  bitDiameter: number;
  reliefStyle: CncReliefStyle;
}

export const DEFAULT_CNC_BOX_OPTIONS: CncBoxOptions = {
  bitDiameter: 6.35,
  reliefStyle: "dogbone",
};

export function validateCncBoxOptions(options: CncBoxOptions): string[] {
  const errors: string[] = [];
  if (options.bitDiameter <= 0) errors.push("Bit diameter must be positive.");
  return errors;
}

export interface CncBoxResult {
  panels: Panel[];
  /** Total concave corners relieved across all panels — surfaced in the UI so "0 corners relieved" is a visible signal something's off, not a silent no-op. */
  reliefCount: number;
}

/**
 * Same joint engine as the laser venture (finger/dovetail/rabbet/mortise-tenon,
 * lids, kerf-style compensation) — `spec.kerf` here represents the router bit's
 * footprint rather than a laser's, and every concave (inside) corner of every
 * panel gets dogbone/T-bone relief so the bit's own radius doesn't leave a
 * fillet that stops the mating panel's tab from seating flush.
 */
export function generateCncBox(spec: BoxSpec, options: CncBoxOptions): CncBoxResult {
  // The bit-diameter field is the single source of truth for compensation — feeding it in as `kerf`
  // reuses generateBox's existing cut-size math instead of duplicating it for a second "tool width" input.
  const panels = generateBox({ ...spec, kerf: options.bitDiameter });
  if (options.reliefStyle === "none" || options.bitDiameter <= 0) {
    return { panels, reliefCount: 0 };
  }

  const toolRadius = options.bitDiameter / 2;
  let reliefCount = 0;
  const relieved = panels.map((panel) => {
    reliefCount += countConcaveVertices(panel.path);
    return {
      ...panel,
      path: addCornerRelief(panel.path, { style: options.reliefStyle as ReliefStyle, toolRadius }),
    };
  });
  return { panels: relieved, reliefCount };
}
