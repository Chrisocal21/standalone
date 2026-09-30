export interface SignSpec {
  width: number;
  height: number;
  cornerRadius: number;
  mountingHoles: boolean;
  holeDiameter: number;
  holeInset: number;
}

export const DEFAULT_SIGN_SPEC: SignSpec = {
  width: 300,
  height: 150,
  cornerRadius: 8,
  mountingHoles: true,
  holeDiameter: 6,
  holeInset: 15,
};

export function validateSignSpec(spec: SignSpec): string[] {
  const errors: string[] = [];
  if (spec.width <= 0 || spec.height <= 0) errors.push("Width and height must be positive.");
  if (spec.cornerRadius < 0) errors.push("Corner radius cannot be negative.");
  if (spec.cornerRadius * 2 > Math.min(spec.width, spec.height)) errors.push("Corner radius is too large for these dimensions.");
  if (spec.mountingHoles) {
    if (spec.holeDiameter <= 0) errors.push("Hole diameter must be positive.");
    if (spec.holeInset < spec.holeDiameter / 2 + 1) errors.push("Hole inset is too small — the hole would clip the edge.");
    if (spec.holeInset * 2 > Math.min(spec.width, spec.height)) errors.push("Hole inset is too large for these dimensions.");
  }
  return errors;
}

const CUT_COLOR = "#191c20";

/**
 * A rectangular blank with rounded corners and 4 corner mounting holes,
 * rendered as native SVG shapes (<rect>/<circle>) rather than the
 * polygon-approximated paths the box generators use — a sign blank has no
 * joints to worry about, so there's no reason to give up true arcs for it.
 */
export function signToSvg(spec: SignSpec): string {
  const margin = Math.max(spec.width, spec.height) * 0.02;
  const w = spec.width;
  const h = spec.height;

  const holes = spec.mountingHoles
    ? [
        [spec.holeInset, spec.holeInset],
        [w - spec.holeInset, spec.holeInset],
        [spec.holeInset, h - spec.holeInset],
        [w - spec.holeInset, h - spec.holeInset],
      ]
    : [];

  const holeElements = holes
    .map(([cx, cy]) => `  <circle cx="${cx.toFixed(3)}" cy="${cy.toFixed(3)}" r="${(spec.holeDiameter / 2).toFixed(3)}" fill="none" stroke="${CUT_COLOR}" stroke-width="0.25" />`)
    .join("\n");

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-margin} ${-margin} ${w + margin * 2} ${h + margin * 2}">`,
    `  <rect x="0" y="0" width="${w.toFixed(3)}" height="${h.toFixed(3)}" rx="${spec.cornerRadius.toFixed(3)}" ry="${spec.cornerRadius.toFixed(3)}" fill="none" stroke="${CUT_COLOR}" stroke-width="0.25" />`,
    holeElements,
    `</svg>`,
  ]
    .filter(Boolean)
    .join("\n");
}
