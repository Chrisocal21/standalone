/**
 * Ported from src/standalone_box/units.py — keep in sync with the Python
 * reference.
 *
 * Every spec in this app stores lengths in mm always (the engine's
 * canonical unit, and what the exported SVG is always written in). These
 * helpers only convert at the display/input boundary — a NumberField shows
 * a length field's mm value converted to whatever unit is currently
 * selected, and converts the user's typed value back to mm before it ever
 * reaches spec state.
 */

export type LengthUnit = "mm" | "cm" | "m" | "in" | "ft";
export const LENGTH_UNITS: LengthUnit[] = ["mm", "cm", "m", "in", "ft"];

const MM_PER_UNIT: Record<LengthUnit, number> = {
  mm: 1,
  cm: 10,
  m: 1000,
  in: 25.4,
  ft: 304.8,
};

export function toMm(value: number, unit: LengthUnit): number {
  return value * MM_PER_UNIT[unit];
}

export function fromMm(value: number, unit: LengthUnit): number {
  return value / MM_PER_UNIT[unit];
}

/** Decimal places to show per unit — enough that a 0.15mm kerf doesn't round to 0 in any of them. */
const DISPLAY_DECIMALS: Record<LengthUnit, number> = {
  mm: 3,
  cm: 4,
  m: 6,
  in: 4,
  ft: 6,
};

/** Round for display only — never applied to a value before it's stored. */
export function roundForDisplay(value: number, unit: LengthUnit): number {
  const factor = 10 ** DISPLAY_DECIMALS[unit];
  return Math.round(value * factor) / factor;
}

const FRACTION_DENOMINATORS = [2, 4, 8, 16, 32, 64];

/** The nearest common woodworking fraction (to 1/64") for an inch value, e.g. 0.1875 -> `3/16"`. */
export function nearestInchFraction(inches: number): string {
  const whole = Math.trunc(inches);
  const remainder = Math.abs(inches - whole);
  let bestNumerator = 0;
  let bestDenominator = 1;
  let bestError = remainder;
  for (const denominator of FRACTION_DENOMINATORS) {
    const numerator = Math.round(remainder * denominator);
    const error = Math.abs(remainder - numerator / denominator);
    if (error <= bestError) {
      bestError = error;
      bestNumerator = numerator;
      bestDenominator = denominator;
    }
  }
  if (bestNumerator === 0) return `${whole}"`;
  if (bestNumerator === bestDenominator) return `${whole + Math.sign(inches || 1)}"`;
  let numerator = bestNumerator;
  let denominator = bestDenominator;
  while (numerator % 2 === 0 && denominator % 2 === 0) {
    numerator /= 2;
    denominator /= 2;
  }
  const fraction = `${numerator}/${denominator}`;
  return whole === 0 ? `${inches < 0 ? "-" : ""}${fraction}"` : `${whole} ${fraction}"`;
}
