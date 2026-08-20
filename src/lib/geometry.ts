/**
 * Ported from src/standalone_box/geometry.py — keep in sync with the Python
 * reference. The Python CLI remains the source of truth for real cut files;
 * this is a browser-side reimplementation for the live preview.
 */

export type JointType = "finger" | "dovetail" | "rabbet" | "mortise_tenon";
export type LidStyle = "none" | "flat" | "slide" | "hinged";

export const JOINT_TYPES: JointType[] = ["finger", "dovetail", "rabbet", "mortise_tenon"];
export const LID_STYLES: LidStyle[] = ["none", "flat", "slide", "hinged"];

export interface BoxSpec {
  width: number;
  depth: number;
  height: number;
  materialThickness: number;
  kerf: number;
  fingers: number;
  joint: JointType;
  dovetailAngle: number;
  cornerRadius: number;
  lidStyle: LidStyle;
  dividerRows: number;
  dividerColumns: number;
  stackable: boolean;
}

export const DEFAULT_BOX_SPEC: BoxSpec = {
  width: 200,
  depth: 120,
  height: 80,
  materialThickness: 3,
  kerf: 0.15,
  fingers: 4,
  joint: "finger",
  dovetailAngle: 10,
  cornerRadius: 0,
  lidStyle: "none",
  dividerRows: 0,
  dividerColumns: 0,
  stackable: false,
};

export function validateBoxSpec(spec: BoxSpec): string[] {
  const errors: string[] = [];
  for (const [name, value] of [
    ["width", spec.width],
    ["depth", spec.depth],
    ["height", spec.height],
    ["materialThickness", spec.materialThickness],
  ] as const) {
    if (!(value > 0)) errors.push(`${name} must be greater than zero`);
  }
  if (spec.kerf < 0) errors.push("kerf cannot be negative");
  if (spec.fingers < 2 || spec.fingers % 2 !== 0) {
    errors.push("fingers must be an even number of at least 2");
  }
  if (Math.min(spec.width, spec.depth, spec.height) <= spec.materialThickness * 2) {
    errors.push("each box dimension must allow two material thicknesses");
  }
  if (!JOINT_TYPES.includes(spec.joint)) {
    errors.push(`joint must be one of ${JOINT_TYPES.join(", ")}`);
  }
  if (spec.joint === "dovetail" && !(spec.dovetailAngle > 0 && spec.dovetailAngle < 45)) {
    errors.push("dovetailAngle must be between 0 and 45 degrees");
  }
  if (spec.cornerRadius < 0) errors.push("cornerRadius cannot be negative");
  if (!LID_STYLES.includes(spec.lidStyle)) {
    errors.push(`lidStyle must be one of ${LID_STYLES.join(", ")}`);
  }
  if (spec.dividerRows < 0 || spec.dividerColumns < 0) {
    errors.push("divider counts cannot be negative");
  }
  return errors;
}

export type Point = readonly [number, number];

export interface Panel {
  name: string;
  width: number;
  height: number;
  path: readonly Point[];
  holes: readonly (readonly Point[])[];
  cuts: readonly (readonly [Point, Point])[];
}

/**
 * How far a protruding tab's tip widens past its base, in millimeters.
 *
 * Zero for finger, rabbet, and mortise/tenon joints (straight-sided tabs).
 * For dovetail joints this is our own trapezoid construction, not Boxes.py's:
 * each tab's tip is pushed outward by depth * tan(angle), one independently
 * -chosen parameter rather than their four. It needs the same real-machine
 * calibration as the finger joint's kerf before the flare angle can be trusted.
 */
function tabFlare(spec: BoxSpec): number {
  if (spec.joint !== "dovetail") return 0;
  return spec.materialThickness * Math.tan((spec.dovetailAngle * Math.PI) / 180);
}

/** A repeating comb of tabs, local frame: s along the edge, d = 0 or -depth. */
function edgePoints(length: number, fingers: number, depth: number, reverse = false, flare = 0): Point[] {
  const segment = length / fingers;
  const points: Point[] = [];
  for (let index = 0; index <= fingers; index++) {
    const x = index * segment;
    points.push([x, 0]);
    if (index < fingers) {
      const isTab = (index % 2 === 0) !== reverse;
      const y = isTab ? -depth : 0;
      const offset = isTab ? flare : 0;
      points.push([x - offset, y]);
      points.push([(index + 1) * segment + offset, y]);
    }
  }
  return points;
}

/**
 * A single centered tenon rather than a repeating comb.
 *
 * Simplified on purpose: a real mortise-and-tenon has a blind hole cut into
 * the *receiving* panel for the tenon to plug into. We don't model interior
 * holes for this joint, so every edge of every panel gets the same
 * protruding tenon — an honest boundary-only approximation, same as how
 * finger/dovetail edges don't coordinate with whatever panel they'll
 * actually mate with.
 */
function mortiseTenonEdgePoints(length: number, depth: number, tenonRatio = 0.4): Point[] {
  const tenonWidth = length * tenonRatio;
  const margin = (length - tenonWidth) / 2;
  return [
    [0, 0],
    [margin, 0],
    [margin, -depth],
    [margin + tenonWidth, -depth],
    [margin + tenonWidth, 0],
    [length, 0],
  ];
}

function rectPath(width: number, height: number): Point[] {
  return [
    [0, 0],
    [width, 0],
    [width, height],
    [0, height],
  ];
}

/**
 * Trace the panel's outline clockwise from (0, 0).
 *
 * Each edge is generated in its own local frame — s runs along the edge, d
 * is 0 (flush) or -depth (protruding outward) — then projected into the
 * panel's absolute coordinates. Keeping that projection consistent across
 * all four edges is what makes the tabs (and the dovetail flare) actually
 * show up on every side instead of just the bottom, and it's what lets a
 * completely different edge generator (mortise/tenon) plug into the same
 * bottom/right/top/left projection without duplicating it.
 */
function panelPath(width: number, height: number, fingers: number, tabDepth: number, joint: JointType, flare = 0): Point[] {
  if (joint === "rabbet") {
    return rectPath(width, height);
  }

  const bottomEdge: (length: number) => Point[] =
    joint === "mortise_tenon"
      ? (length) => mortiseTenonEdgePoints(length, tabDepth)
      : (length) => edgePoints(length, fingers, tabDepth, false, flare);
  const topEdge: (length: number) => Point[] =
    joint === "mortise_tenon"
      ? (length) => mortiseTenonEdgePoints(length, tabDepth)
      : (length) => edgePoints(length, fingers, tabDepth, true, flare);

  const bottom = bottomEdge(width);
  const right = bottomEdge(height)
    .slice(1)
    .map(([s, d]) => [width - d, s] as Point);
  const top = topEdge(width)
    .slice(1)
    .map(([s, d]) => [width - s, height - d] as Point);
  const left = topEdge(height)
    .slice(1)
    .map(([s, d]) => [d, height - s] as Point);
  return [...bottom, ...right, ...top, ...left];
}

function makePanel(name: string, width: number, height: number, spec: BoxSpec): Panel {
  const cutWidth = width + spec.kerf;
  const cutHeight = height + spec.kerf;
  const tabDepth = spec.materialThickness;
  const flare = tabFlare(spec);
  return {
    name,
    width: cutWidth,
    height: cutHeight,
    path: panelPath(cutWidth, cutHeight, spec.fingers, tabDepth, spec.joint, flare),
    holes: [],
    cuts: [],
  };
}

function rectPanel(name: string, width: number, height: number): Panel {
  return { name, width, height, path: rectPath(width, height), holes: [], cuts: [] };
}

export type FlexAxis = "fold" | "roll";

/**
 * A brick-offset pattern of short parallel slits that lets a rigid panel flex.
 *
 * Two orientations, since "flex" means different things depending on what
 * the panel needs to do:
 *
 * - `axis="fold"`: slits run parallel to width, spaced out across height —
 *   for folding sharply along one line (a hinge), like the lid-to-back-wall
 *   connector.
 * - `axis="roll"`: slits run parallel to height, spaced out across width —
 *   for curling continuously along the whole panel, like a cylinder wall
 *   wrapping into a tube. Implemented as the "fold" pattern with width and
 *   height swapped, then the resulting points swapped back — same brick
 *   logic, just rotated 90 degrees.
 *
 * Our own simple construction, not copied from anywhere specific: rows (or
 * columns) of short cuts, each offset by half a pitch from the one before,
 * leaving solid material bridges between cuts. Slit length/gap/spacing are a
 * starting point, not a calibrated value — how flexible the result actually
 * is depends on the material and grain direction, and needs a real test-cut
 * same as kerf.
 */
export function flexCuts(
  width: number,
  height: number,
  axis: FlexAxis = "fold",
  slitLength = 6,
  slitGap = 1.5,
  rowGap = 3
): [Point, Point][] {
  if (axis === "roll") {
    return flexCuts(height, width, "fold", slitLength, slitGap, rowGap).map(
      ([[x, y], [x2, y2]]) =>
        [
          [y, x],
          [y2, x2],
        ] as [Point, Point]
    );
  }

  const cuts: [Point, Point][] = [];
  const pitch = slitLength + slitGap;
  let rowIndex = 0;
  let y = rowGap;
  while (y < height - rowGap / 2) {
    const offset = rowIndex % 2 === 0 ? 0 : pitch / 2;
    let x = offset;
    while (x + slitLength <= width) {
      cuts.push([
        [x, y],
        [x + slitLength, y],
      ]);
      x += pitch;
    }
    y += rowGap;
    rowIndex += 1;
  }
  return cuts;
}

/**
 * A separate flex-cut strip glued across the back-wall/lid seam.
 *
 * We deliberately don't try to cut one continuous back-wall-plus-lid panel
 * with a built-in fold: the wall's side edges need tabs only along the wall
 * portion, and our per-edge joint generators apply to a whole edge at once,
 * not part of one. A separate hinge strip sidesteps that and matches how
 * flex-hinge lids are commonly built by hand anyway.
 */
function hingeStrip(spec: BoxSpec): Panel {
  const height = Math.max(spec.materialThickness * 5, 15);
  const width = spec.width;
  return { name: "hinge-strip", width, height, path: rectPath(width, height), holes: [], cuts: flexCuts(width, height, "fold") };
}

function slideLidPanel(spec: BoxSpec): Panel {
  const clearance = spec.materialThickness * 0.5;
  const width = spec.width - clearance;
  const height = spec.depth + spec.kerf;
  return rectPanel("lid", width, height);
}

/**
 * A rail glued to the inside face of a wall to form the slide channel.
 *
 * We can't cut a partial-depth groove into a solid wall with a single
 * through-cut laser pass, so the channel is built from two thin glued-on
 * rails instead of a groove milled into the wall itself.
 */
function slideGuideStrip(name: string, spec: BoxSpec): Panel {
  const width = spec.depth;
  const height = Math.max(spec.materialThickness * 2.5, 8);
  return rectPanel(name, width, height);
}

/** Evenly spaced center positions for `count` crossing dividers across `span`. */
function dividerNotchPositions(count: number, span: number): number[] {
  if (count <= 0) return [];
  const step = span / (count + 1);
  return Array.from({ length: count }, (_, i) => step * (i + 1));
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
 * A flat strip with evenly spaced half-lap notches cut into one long edge.
 *
 * Row dividers are notched from the top, column dividers from the bottom,
 * each notch running exactly halfway through the strip's height, so a row
 * strip and a column strip slot together into a lattice at each crossing.
 */
function lapNotchedStripPath(length: number, stripHeight: number, notchWidth: number, positions: number[], notchesOnTop: boolean): Point[] {
  const notchDepth = stripHeight / 2;
  const top = notchesOnTop ? notchedEdge(0, length, 0, positions, notchWidth, notchDepth, 1) : ([[0, 0], [length, 0]] as Point[]);
  const bottom = !notchesOnTop
    ? notchedEdge(length, 0, stripHeight, positions, notchWidth, notchDepth, -1)
    : ([[length, stripHeight], [0, stripHeight]] as Point[]);
  return [...top, ...bottom];
}

function dividerPanels(spec: BoxSpec): Panel[] {
  if (spec.dividerRows <= 0 && spec.dividerColumns <= 0) return [];
  const interiorWidth = spec.width - 2 * spec.materialThickness + spec.kerf;
  const interiorDepth = spec.depth - 2 * spec.materialThickness + spec.kerf;
  const dividerHeight = spec.height - spec.materialThickness;

  const columnPositions = dividerNotchPositions(spec.dividerColumns, interiorWidth);
  const rowPositions = dividerNotchPositions(spec.dividerRows, interiorDepth);

  const panels: Panel[] = [];
  for (let index = 0; index < spec.dividerRows; index++) {
    const path = lapNotchedStripPath(interiorWidth, dividerHeight, spec.materialThickness, columnPositions, true);
    panels.push({ name: `divider-row-${index + 1}`, width: interiorWidth, height: dividerHeight, path, holes: [], cuts: [] });
  }
  for (let index = 0; index < spec.dividerColumns; index++) {
    const path = lapNotchedStripPath(interiorDepth, dividerHeight, spec.materialThickness, rowPositions, false);
    panels.push({ name: `divider-col-${index + 1}`, width: interiorDepth, height: dividerHeight, path, holes: [], cuts: [] });
  }
  return panels;
}

/**
 * A picture-frame ring glued flush on top of the box.
 *
 * Its inner opening matches the box's own interior footprint, effectively
 * extending the walls upward by one collar-thickness so a same-size box
 * stacked on top registers against it. A first-pass registration aid, not a
 * precision-fit joint — worth checking against a real stack before trusting
 * the clearance.
 */
function stackingCollar(spec: BoxSpec): Panel {
  const outerW = spec.width + spec.kerf;
  const outerH = spec.depth + spec.kerf;
  const innerW = outerW - 2 * spec.materialThickness;
  const innerH = outerH - 2 * spec.materialThickness;
  const insetX = (outerW - innerW) / 2;
  const insetY = (outerH - innerH) / 2;
  const innerHole: Point[] = rectPath(innerW, innerH).map(([x, y]) => [x + insetX, y + insetY]);
  return {
    name: "stacking-collar",
    width: outerW,
    height: outerH,
    path: rectPath(outerW, outerH),
    holes: [innerHole],
    cuts: [],
  };
}

/**
 * Return the jointed walls and bottom, plus whatever accessories the spec asks for.
 *
 * The kerf value expands each nominal panel's cut envelope by one kerf. This
 * is a deliberately conservative first calibration model; real machine
 * tests should determine whether the local machine needs a different offset.
 */
export function generateBox(spec: BoxSpec): Panel[] {
  const panels: Panel[] = [
    makePanel("front", spec.width, spec.height, spec),
    makePanel("back", spec.width, spec.height, spec),
    makePanel("left", spec.depth, spec.height, spec),
    makePanel("right", spec.depth, spec.height, spec),
    makePanel("bottom", spec.width, spec.depth, spec),
  ];

  if (spec.lidStyle === "flat") {
    panels.push(makePanel("lid", spec.width, spec.depth, spec));
  } else if (spec.lidStyle === "slide") {
    panels.push(slideLidPanel(spec));
    panels.push(slideGuideStrip("lid-guide-left", spec));
    panels.push(slideGuideStrip("lid-guide-right", spec));
  } else if (spec.lidStyle === "hinged") {
    panels.push(makePanel("lid", spec.width, spec.depth, spec));
    panels.push(hingeStrip(spec));
  }

  panels.push(...dividerPanels(spec));

  if (spec.stackable) {
    panels.push(stackingCollar(spec));
  }

  return panels;
}

export function layoutSize(panels: Panel[], spacing = 10): [number, number] {
  const columns = 3;
  const rows = Math.ceil(panels.length / columns);
  const rowHeights: number[] = [];
  for (let row = 0; row < rows; row++) {
    const rowPanels = panels.slice(row * columns, (row + 1) * columns);
    rowHeights.push(Math.max(...rowPanels.map((p) => p.height)));
  }
  const columnWidths: number[] = [];
  for (let column = 0; column < columns; column++) {
    const widths: number[] = [];
    for (let index = column; index < panels.length; index += columns) {
      widths.push(panels[index].width);
    }
    columnWidths.push(widths.length ? Math.max(...widths) : 0);
  }
  const width = columnWidths.reduce((a, b) => a + b, 0) + spacing * (columns - 1);
  const height = rowHeights.reduce((a, b) => a + b, 0) + spacing * (rows - 1);
  return [width, height];
}
