import { BoxSpec, DEFAULT_BOX_SPEC, JOINT_TYPES, LID_STYLES, generateBox, validateBoxSpec } from "../src/lib/geometry";
import { CylinderSpec, DEFAULT_CYLINDER_SPEC, CYLINDER_LID_STYLES, generateCylinder, validateCylinderSpec } from "../src/lib/shapes";
import { TraySpec, DEFAULT_TRAY_SPEC, generateTray, validateTraySpec } from "../src/lib/tray";
import { PegboardSpec, DEFAULT_PEGBOARD_SPEC, generatePegboard, validatePegboardSpec } from "../src/lib/pegboard";
import { StandSpec, DEFAULT_STAND_SPEC, generateStand, validateStandSpec } from "../src/lib/stand";
import { ShelfBinSpec, DEFAULT_SHELF_BIN_SPEC, generateShelfBin, validateShelfBinSpec } from "../src/lib/shelf";
import { boxToSvg } from "../src/lib/svg";

let failures = 0;

function check(label: string, condition: boolean) {
  if (!condition) {
    failures += 1;
    console.error(`FAIL: ${label}`);
  }
}

function pathIsClosedAndFinite(points: readonly (readonly [number, number])[]): boolean {
  if (points.length < 3) return false;
  return points.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
}

function svgHasNoNaN(svg: string): boolean {
  return !svg.includes("NaN") && !svg.includes("Infinity");
}

// 1. Every joint type, base box, no accessories.
for (const joint of JOINT_TYPES) {
  const spec: BoxSpec = { ...DEFAULT_BOX_SPEC, joint };
  const errors = validateBoxSpec(spec);
  check(`joint=${joint} validates clean`, errors.length === 0);
  const panels = generateBox(spec);
  check(`joint=${joint} produces 5 panels`, panels.length === 5);
  for (const panel of panels) {
    check(`joint=${joint} panel ${panel.name} path closed/finite`, pathIsClosedAndFinite(panel.path));
  }
  const svg = boxToSvg(panels);
  check(`joint=${joint} svg has no NaN`, svgHasNoNaN(svg));
  check(`joint=${joint} svg has 5 <path`, (svg.match(/<path /g) ?? []).length === 5);
}

// 2. Every lid style.
for (const lidStyle of LID_STYLES) {
  const spec: BoxSpec = { ...DEFAULT_BOX_SPEC, lidStyle };
  const errors = validateBoxSpec(spec);
  check(`lidStyle=${lidStyle} validates clean`, errors.length === 0);
  const panels = generateBox(spec);
  const expectedCounts: Record<string, number> = { none: 5, flat: 6, slide: 8, hinged: 7 };
  check(`lidStyle=${lidStyle} panel count`, panels.length === expectedCounts[lidStyle]);
  const svg = boxToSvg(panels);
  check(`lidStyle=${lidStyle} svg has no NaN`, svgHasNoNaN(svg));
  for (const panel of panels) {
    check(`lidStyle=${lidStyle} panel ${panel.name} path closed/finite`, pathIsClosedAndFinite(panel.path));
    for (const hole of panel.holes) {
      check(`lidStyle=${lidStyle} panel ${panel.name} hole closed/finite`, pathIsClosedAndFinite(hole));
    }
    for (const [a, b] of panel.cuts) {
      check(
        `lidStyle=${lidStyle} panel ${panel.name} cut finite`,
        [a[0], a[1], b[0], b[1]].every((n) => Number.isFinite(n))
      );
    }
  }
}

// 3. Hinge strip actually has flex cuts, and they stay inside the strip bounds.
{
  const spec: BoxSpec = { ...DEFAULT_BOX_SPEC, lidStyle: "hinged" };
  const panels = generateBox(spec);
  const hinge = panels.find((p) => p.name === "hinge-strip");
  check("hinge-strip exists", !!hinge);
  if (hinge) {
    check("hinge-strip has cuts", hinge.cuts.length > 0);
    const outOfBounds = hinge.cuts.some(
      ([[x1, y1], [x2, y2]]) => x1 < 0 || x2 > hinge.width || y1 < 0 || y2 > hinge.height || y1 > hinge.height
    );
    check("hinge-strip cuts stay within panel bounds", !outOfBounds);
  }
}

// 4. Dividers: various row/column combos, check notch symmetry and panel count.
for (const [rows, cols] of [
  [1, 0],
  [0, 1],
  [2, 3],
  [3, 3],
]) {
  const spec: BoxSpec = { ...DEFAULT_BOX_SPEC, dividerRows: rows, dividerColumns: cols };
  const errors = validateBoxSpec(spec);
  check(`dividers r${rows}c${cols} validates clean`, errors.length === 0);
  const panels = generateBox(spec);
  const dividerPanels = panels.filter((p) => p.name.startsWith("divider-"));
  check(`dividers r${rows}c${cols} count`, dividerPanels.length === rows + cols);
  for (const panel of dividerPanels) {
    check(`dividers r${rows}c${cols} ${panel.name} path closed/finite`, pathIsClosedAndFinite(panel.path));
    check(`dividers r${rows}c${cols} ${panel.name} positive width/height`, panel.width > 0 && panel.height > 0);
  }
  const svg = boxToSvg(panels);
  check(`dividers r${rows}c${cols} svg has no NaN`, svgHasNoNaN(svg));
}

// 5. Stackable collar has exactly one hole and it's inside the outer path bounds.
{
  const spec: BoxSpec = { ...DEFAULT_BOX_SPEC, stackable: true };
  const panels = generateBox(spec);
  const collar = panels.find((p) => p.name === "stacking-collar");
  check("stacking-collar exists", !!collar);
  if (collar) {
    check("stacking-collar has one hole", collar.holes.length === 1);
    const hole = collar.holes[0];
    const outerXs = collar.path.map(([x]) => x);
    const outerYs = collar.path.map(([, y]) => y);
    const withinBounds = hole.every(
      ([x, y]) => x > Math.min(...outerXs) && x < Math.max(...outerXs) && y > Math.min(...outerYs) && y < Math.max(...outerYs)
    );
    check("stacking-collar hole sits inside outer boundary", withinBounds);
  }
}

// 6. Corner radius: 0 means no arcs, >0 means arcs appear, and no NaN at extreme radius.
{
  const panels = generateBox(DEFAULT_BOX_SPEC);
  const sharp = boxToSvg(panels, 10, 0);
  check("corner_radius=0 has no arcs", !sharp.includes(" A "));
  const rounded = boxToSvg(panels, 10, 1.0);
  check("corner_radius=1 has arcs", rounded.includes(" A "));
  check("corner_radius=1 svg has no NaN", svgHasNoNaN(rounded));
  const extreme = boxToSvg(panels, 10, 1000);
  check("corner_radius=1000 (over-clamped) svg has no NaN", svgHasNoNaN(extreme));
}

// 7. Full combo: everything on at once.
{
  const spec: BoxSpec = {
    ...DEFAULT_BOX_SPEC,
    joint: "dovetail",
    dovetailAngle: 12,
    cornerRadius: 0.8,
    lidStyle: "hinged",
    dividerRows: 1,
    dividerColumns: 1,
    stackable: true,
  };
  const errors = validateBoxSpec(spec);
  check("kitchen-sink spec validates clean", errors.length === 0);
  const panels = generateBox(spec);
  check("kitchen-sink panel count", panels.length === 5 + 2 /* hinged lid */ + 2 /* dividers */ + 1 /* collar */);
  const svg = boxToSvg(panels, 10, spec.cornerRadius);
  check("kitchen-sink svg has no NaN", svgHasNoNaN(svg));
  check("kitchen-sink svg has arcs", svg.includes(" A "));
  const viewBoxMatch = svg.match(/viewBox="(-?[\d.]+) (-?[\d.]+) ([\d.]+) ([\d.]+)"/);
  check("kitchen-sink has a viewBox", !!viewBoxMatch);
}

// 8. Cylinder: every lid style, tab counts, seam/notch alignment, no clipping.
for (const lidStyle of CYLINDER_LID_STYLES) {
  const spec: CylinderSpec = { ...DEFAULT_CYLINDER_SPEC, lidStyle };
  const errors = validateCylinderSpec(spec);
  check(`cylinder lidStyle=${lidStyle} validates clean`, errors.length === 0);
  const panels = generateCylinder(spec);
  const expectedNames = lidStyle === "flat" ? ["wall", "bottom", "top"] : ["wall", "bottom"];
  check(`cylinder lidStyle=${lidStyle} panel names`, JSON.stringify(panels.map((p) => p.name)) === JSON.stringify(expectedNames));
  for (const panel of panels) {
    check(`cylinder lidStyle=${lidStyle} panel ${panel.name} closed/finite`, pathIsClosedAndFinite(panel.path));
  }
  const svg = boxToSvg(panels);
  check(`cylinder lidStyle=${lidStyle} svg no NaN`, svgHasNoNaN(svg));
  const extraPaths = panels.reduce((sum, p) => sum + p.cuts.length + p.holes.length, 0);
  check(`cylinder lidStyle=${lidStyle} svg path count`, (svg.match(/<path /g) ?? []).length === panels.length + extraPaths);
}

{
  // The wall must actually carry flex cuts (it can't bend into a circle
  // without them), oriented to curl along the width, not fold at one line.
  const spec: CylinderSpec = { ...DEFAULT_CYLINDER_SPEC };
  const wall = generateCylinder(spec)[0];
  check("cylinder wall has flex cuts", wall.cuts.length > 0);
  const allWithinBounds = wall.cuts.every(
    ([[x1, y1], [x2, y2]]) =>
      x1 >= 0 && x1 <= wall.width && x2 >= 0 && x2 <= wall.width && y1 >= 0 && y1 <= wall.height && y2 >= 0 && y2 <= wall.height
  );
  check("cylinder wall flex cuts stay within panel bounds", allWithinBounds);
  // "roll" cuts should be vertical (taller than wide) since the wall needs
  // to curl continuously along its width, unlike the hinge strip's
  // horizontal "fold" cuts.
  const mostlyVertical = wall.cuts.every(([[x1, y1], [x2, y2]]) => Math.abs(y2 - y1) >= Math.abs(x2 - x1));
  check("cylinder wall flex cuts are vertical (roll axis), not horizontal", mostlyVertical);
}

check("cylinder rejects too few tabs", validateCylinderSpec({ ...DEFAULT_CYLINDER_SPEC, tabCount: 3 }).length > 0);
check(
  "cylinder rejects diameter too small for tabs",
  validateCylinderSpec({ ...DEFAULT_CYLINDER_SPEC, diameter: 5, materialThickness: 3 }).length > 0
);

{
  const spec: CylinderSpec = { ...DEFAULT_CYLINDER_SPEC, tabCount: 10, kerf: 0 };
  const wall = generateCylinder(spec)[0];
  const expectedCircumference = Math.PI * spec.diameter;
  check("cylinder wall length matches circumference", Math.abs(wall.width - expectedCircumference) < 0.01);
  const bottomProtrusions = wall.path.filter(([, y]) => y > spec.height + 1e-6);
  check("cylinder wall bottom tab count matches spec", bottomProtrusions.length === spec.tabCount * 2);
  const topProtrusions = wall.path.filter(([, y]) => y < -1e-6);
  check("cylinder wall has no top tabs without a lid", topProtrusions.length === 0);
}

{
  const spec: CylinderSpec = { ...DEFAULT_CYLINDER_SPEC, tabCount: 10, lidStyle: "flat" };
  const wall = generateCylinder(spec)[0];
  const topProtrusions = wall.path.filter(([, y]) => y < -1e-6);
  check("cylinder wall has top tabs with a flat lid", topProtrusions.length === spec.tabCount * 2);

  const bottom = generateCylinder(spec)[1];
  const radius = spec.diameter / 2 + spec.kerf;
  const inwardPoints = bottom.path.filter(([x, y]) => Math.hypot(x - radius, y - radius) < radius - spec.materialThickness / 2);
  check("cylinder bottom disc notch count matches wall tab count", inwardPoints.length === spec.tabCount * 2);

  // Every notch's inward corners should sit at the same radius (all
  // notches cut to the same depth) — verifies the notch geometry is
  // uniform, not just correctly counted.
  const radii = inwardPoints.map(([x, y]) => Math.hypot(x - radius, y - radius));
  const expectedInwardRadius = radius - spec.materialThickness;
  check("cylinder notch depth is uniform", radii.every((r) => Math.abs(r - expectedInwardRadius) < 0.01));
}

// 9. Tray: open box with a divider grid, no lid ever.
{
  const spec: TraySpec = { ...DEFAULT_TRAY_SPEC, rows: 2, columns: 3 };
  check("tray validates clean", validateTraySpec(spec).length === 0);
  const panels = generateTray(spec);
  check("tray panel names", JSON.stringify(panels.map((p) => p.name).slice(0, 5)) === JSON.stringify(["front", "back", "left", "right", "bottom"]));
  const dividerCount = panels.filter((p) => p.name.startsWith("divider-")).length;
  check("tray divider count", dividerCount === spec.rows + spec.columns);
  const svg = boxToSvg(panels);
  check("tray svg has no NaN", svgHasNoNaN(svg));
  check("tray rejects negative rows", validateTraySpec({ ...DEFAULT_TRAY_SPEC, rows: -1 }).length > 0);
}

// 10. Pegboard: hole grid + 4 mounting holes, all within panel bounds.
{
  const spec: PegboardSpec = { ...DEFAULT_PEGBOARD_SPEC };
  check("pegboard validates clean", validatePegboardSpec(spec).length === 0);
  const panel = generatePegboard(spec)[0];
  const usableW = spec.width - 2 * spec.margin;
  const usableH = spec.height - 2 * spec.margin;
  const expectedCols = Math.floor(usableW / spec.holePitch) + 1;
  const expectedRows = Math.floor(usableH / spec.holePitch) + 1;
  check("pegboard hole count", panel.holes.length === expectedCols * expectedRows + 4);
  const allWithinBounds = panel.holes.every((hole) =>
    hole.every(([x, y]) => x >= 0 && x <= panel.width && y >= 0 && y <= panel.height)
  );
  check("pegboard holes within panel bounds", allWithinBounds);
  check("pegboard rejects pitch <= diameter", validatePegboardSpec({ ...DEFAULT_PEGBOARD_SPEC, holeDiameter: 10, holePitch: 10 }).length > 0);
  check("pegboard rejects margin leaving no room", validatePegboardSpec({ ...DEFAULT_PEGBOARD_SPEC, margin: 200 }).length > 0);
}

// 11. Stand: two identical legs, notches meet at the same half-height.
{
  const spec: StandSpec = { ...DEFAULT_STAND_SPEC };
  check("stand validates clean", validateStandSpec(spec).length === 0);
  const [legA, legB] = generateStand(spec);
  check("stand legs same size", legA.width === legB.width && legA.height === legB.height);
  const halfHeight = spec.legHeight / 2;
  const legAHasNotch = legA.path.some(([, y]) => Math.abs(y - halfHeight) < 1e-6);
  const legBHasNotch = legB.path.some(([, y]) => Math.abs(y - halfHeight) < 1e-6);
  check("stand legs notch to matching depth", legAHasNotch && legBHasNotch);
  check("stand rejects leg width too small", validateStandSpec({ ...DEFAULT_STAND_SPEC, legWidth: 5 }).length > 0);
  const svg = boxToSvg([legA, legB]);
  check("stand svg has no NaN", svgHasNoNaN(svg));
}

// 12. Shelf/bin: open box, back panel gets exactly 2 mounting holes, others none.
{
  const spec: ShelfBinSpec = { ...DEFAULT_SHELF_BIN_SPEC };
  check("shelf validates clean", validateShelfBinSpec(spec).length === 0);
  const panels = generateShelfBin(spec);
  const back = panels.find((p) => p.name === "back");
  check("shelf back panel exists", !!back);
  if (back) {
    check("shelf back panel has 2 mounting holes", back.holes.length === 2);
    const withinBounds = back.holes.every((hole) => hole.every(([x, y]) => x >= 0 && x <= back.width && y >= 0 && y <= back.height));
    check("shelf mounting holes within bounds", withinBounds);
  }
  const others = panels.filter((p) => p.name !== "back");
  check("shelf other panels have no holes", others.every((p) => p.holes.length === 0));
  check("shelf rejects mounting hole inset too large", validateShelfBinSpec({ ...DEFAULT_SHELF_BIN_SPEC, mountingHoleInset: 150 }).length > 0);
}

if (failures === 0) {
  console.log("All geometry checks passed.");
  process.exit(0);
} else {
  console.error(`${failures} check(s) failed.`);
  process.exit(1);
}
