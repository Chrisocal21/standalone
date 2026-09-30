/**
 * CNC router feeds-and-speeds calculator for the wood-cnc venture. All
 * internal math is metric (mm, mm/tooth, mm/min) — the tool's own mm/in
 * toggle only converts at the display boundary, same convention as
 * units.ts for the other ventures.
 *
 * The chip-load table below is a rough starting point assembled from
 * commonly published router bit charts (Onsrud/Amana-style guides), not a
 * substitute for your bit manufacturer's own data — real chip load depends
 * heavily on bit geometry, spindle rigidity, and hold-down, which this tool
 * has no way to know. Treat every output as a first pass to dial in at the
 * machine, not a number to trust blind.
 */

export type Material = "softwood" | "hardwood" | "plywood" | "mdf" | "hdpe" | "acrylic";

export const MATERIALS: Material[] = ["softwood", "hardwood", "plywood", "mdf", "hdpe", "acrylic"];

export const MATERIAL_LABELS: Record<Material, string> = {
  softwood: "Softwood (pine, fir)",
  hardwood: "Hardwood (oak, maple)",
  plywood: "Plywood",
  mdf: "MDF",
  hdpe: "HDPE / plastics",
  acrylic: "Acrylic",
};

interface ChipLoadRangeIn {
  min: number;
  max: number;
}

/** Chip load per tooth, in inches, at standard bit-diameter buckets (inches). Bucket keys are the bit diameter in mm for direct lookup. */
const BIT_DIAMETER_BUCKETS_MM = [3.175, 6.35, 9.525, 12.7, 19.05] as const;

const CHIP_LOAD_TABLE_IN: Record<Material, Record<(typeof BIT_DIAMETER_BUCKETS_MM)[number], ChipLoadRangeIn>> = {
  softwood: {
    3.175: { min: 0.002, max: 0.004 },
    6.35: { min: 0.004, max: 0.008 },
    9.525: { min: 0.006, max: 0.01 },
    12.7: { min: 0.008, max: 0.014 },
    19.05: { min: 0.01, max: 0.018 },
  },
  hardwood: {
    3.175: { min: 0.0015, max: 0.003 },
    6.35: { min: 0.003, max: 0.006 },
    9.525: { min: 0.004, max: 0.007 },
    12.7: { min: 0.005, max: 0.009 },
    19.05: { min: 0.006, max: 0.011 },
  },
  plywood: {
    3.175: { min: 0.002, max: 0.0035 },
    6.35: { min: 0.0035, max: 0.007 },
    9.525: { min: 0.005, max: 0.009 },
    12.7: { min: 0.006, max: 0.011 },
    19.05: { min: 0.008, max: 0.014 },
  },
  mdf: {
    3.175: { min: 0.0025, max: 0.0045 },
    6.35: { min: 0.005, max: 0.009 },
    9.525: { min: 0.007, max: 0.012 },
    12.7: { min: 0.009, max: 0.015 },
    19.05: { min: 0.011, max: 0.018 },
  },
  hdpe: {
    3.175: { min: 0.003, max: 0.005 },
    6.35: { min: 0.006, max: 0.01 },
    9.525: { min: 0.008, max: 0.013 },
    12.7: { min: 0.01, max: 0.016 },
    19.05: { min: 0.012, max: 0.02 },
  },
  acrylic: {
    3.175: { min: 0.0008, max: 0.0015 },
    6.35: { min: 0.0015, max: 0.003 },
    9.525: { min: 0.002, max: 0.0035 },
    12.7: { min: 0.0025, max: 0.004 },
    19.05: { min: 0.003, max: 0.005 },
  },
};

function nearestBucketMm(diameterMm: number): (typeof BIT_DIAMETER_BUCKETS_MM)[number] {
  let closest: (typeof BIT_DIAMETER_BUCKETS_MM)[number] = BIT_DIAMETER_BUCKETS_MM[0];
  let bestDiff = Infinity;
  for (const bucket of BIT_DIAMETER_BUCKETS_MM) {
    const diff = Math.abs(bucket - diameterMm);
    if (diff < bestDiff) {
      bestDiff = diff;
      closest = bucket;
    }
  }
  return closest;
}

/** Recommended chip load range in mm/tooth, looked up by nearest standard bit-diameter bucket — not interpolated, since the source charts are themselves discrete tables, not continuous curves. */
export function recommendedChipLoadMm(material: Material, bitDiameterMm: number): { min: number; max: number; bucketMm: number } {
  const bucket = nearestBucketMm(bitDiameterMm);
  const rangeIn = CHIP_LOAD_TABLE_IN[material][bucket];
  return { min: rangeIn.min * 25.4, max: rangeIn.max * 25.4, bucketMm: bucket };
}

export interface FeedsAndSpeedsInput {
  bitDiameterMm: number;
  flutes: number;
  rpm: number;
  chipLoadMm: number;
  stepoverPercent: number; // radial width of cut, as % of bit diameter
  depthOfCutMm: number;
}

export function validateFeedsAndSpeedsInput(input: FeedsAndSpeedsInput): string[] {
  const errors: string[] = [];
  if (input.bitDiameterMm <= 0) errors.push("Bit diameter must be positive.");
  if (!Number.isInteger(input.flutes) || input.flutes < 1) errors.push("Flute count must be a whole number of at least 1.");
  if (input.rpm <= 0) errors.push("RPM must be positive.");
  if (input.chipLoadMm <= 0) errors.push("Chip load must be positive.");
  if (input.stepoverPercent <= 0 || input.stepoverPercent > 100) errors.push("Stepover must be between 0 and 100% of bit diameter.");
  if (input.depthOfCutMm <= 0) errors.push("Depth of cut must be positive.");
  return errors;
}

export interface FeedsAndSpeedsResult {
  /** >1 when stepover is under 50% of diameter — the cutter takes a thinner bite than the nominal chip load implies, so feed has to speed up to compensate (radial chip thinning). Capped at 6x: below ~4% stepover the formula blows up toward a bit rubbing rather than cutting, which isn't a real operating point. */
  chipThinningFactor: number;
  /** Chip load compensated for chip thinning — the number to actually key into the feed-rate formula. */
  effectiveChipLoadMm: number;
  feedRateMmMin: number;
  plungeRateMmMin: number;
  surfaceSpeedMMin: number;
  materialRemovalRateMm3Min: number;
}

const MAX_THINNING_FACTOR = 6;

export function computeFeedsAndSpeeds(input: FeedsAndSpeedsInput): FeedsAndSpeedsResult {
  const stepoverFraction = Math.min(input.stepoverPercent / 100, 1);
  let chipThinningFactor = 1;
  if (stepoverFraction < 0.5) {
    const term = 1 - (1 - 2 * stepoverFraction) ** 2;
    chipThinningFactor = term > 0 ? Math.min(1 / Math.sqrt(term), MAX_THINNING_FACTOR) : MAX_THINNING_FACTOR;
  }

  const effectiveChipLoadMm = input.chipLoadMm * chipThinningFactor;
  const feedRateMmMin = input.rpm * input.flutes * effectiveChipLoadMm;
  const plungeRateMmMin = feedRateMmMin * 0.4; // common rule of thumb: plunge at ~30-50% of the horizontal feed rate
  const surfaceSpeedMMin = (Math.PI * input.bitDiameterMm * input.rpm) / 1000;
  const stepoverMm = input.bitDiameterMm * stepoverFraction;
  const materialRemovalRateMm3Min = feedRateMmMin * stepoverMm * input.depthOfCutMm;

  return { chipThinningFactor, effectiveChipLoadMm, feedRateMmMin, plungeRateMmMin, surfaceSpeedMMin, materialRemovalRateMm3Min };
}
