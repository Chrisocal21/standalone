/**
 * Browser-side solid mesh generator for the 3D-printing venture — the STL
 * equivalent of geometry.ts for the laser venture. Solids are built as
 * unions of simple primitives (boxes, cylinders) rather than through real
 * CSG: overlapping internal faces between unioned parts are left in place.
 * Slicers flood-fill/ray-cast through these fine for FDM printing, but the
 * mesh itself is not a strictly manifold solid, so don't feed it to tools
 * that demand one (structural sims, boolean editors, etc).
 *
 * All lengths are mm, matching the laser venture's convention (see units.ts).
 */

export type Vec3 = [number, number, number];

export interface Triangle {
  normal: Vec3;
  v0: Vec3;
  v1: Vec3;
  v2: Vec3;
}

export type Mesh = Triangle[];

function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function normalize(v: Vec3): Vec3 {
  const len = Math.hypot(v[0], v[1], v[2]);
  if (len === 0) return [0, 0, 0];
  return [v[0] / len, v[1] / len, v[2] / len];
}

/** CCW winding (viewed from the outward side) gives an outward-facing normal. */
function tri(a: Vec3, b: Vec3, c: Vec3): Triangle {
  return { normal: normalize(cross(sub(b, a), sub(c, a))), v0: a, v1: b, v2: c };
}

function quad(a: Vec3, b: Vec3, c: Vec3, d: Vec3): Mesh {
  return [tri(a, b, c), tri(a, c, d)];
}

/** Axis-aligned box from corner (x0,y0,z0) to (x1,y1,z1), outward normals. */
export function boxMesh(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): Mesh {
  const p = (x: number, y: number, z: number): Vec3 => [x, y, z];
  return [
    ...quad(p(x0, y0, z0), p(x1, y0, z0), p(x1, y1, z0), p(x0, y1, z0)), // bottom (-z)
    ...quad(p(x0, y0, z1), p(x0, y1, z1), p(x1, y1, z1), p(x1, y0, z1)), // top (+z)
    ...quad(p(x0, y0, z0), p(x0, y1, z0), p(x0, y1, z1), p(x0, y0, z1)), // -x
    ...quad(p(x1, y0, z0), p(x1, y0, z1), p(x1, y1, z1), p(x1, y1, z0)), // +x
    ...quad(p(x0, y0, z0), p(x0, y0, z1), p(x1, y0, z1), p(x1, y0, z0)), // -y
    ...quad(p(x0, y1, z0), p(x1, y1, z0), p(x1, y1, z1), p(x0, y1, z1)), // +y
  ];
}

/**
 * Solid or hollow cylinder centered on the z-axis at (cx, cy), from z0 to
 * z1. Pass `innerRadius` to get a tube (annular top/bottom caps, inner wall
 * added); leave it 0 for a solid rod (used for the enclosure's screw bosses).
 */
export function cylinderMesh(
  cx: number,
  cy: number,
  z0: number,
  z1: number,
  outerRadius: number,
  innerRadius = 0,
  segments = 48,
): Mesh {
  const mesh: Mesh = [];
  const outer: Vec3[] = [];
  const inner: Vec3[] = [];
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    outer.push([cx + outerRadius * Math.cos(angle), cy + outerRadius * Math.sin(angle), 0]);
    if (innerRadius > 0) inner.push([cx + innerRadius * Math.cos(angle), cy + innerRadius * Math.sin(angle), 0]);
  }

  for (let i = 0; i < segments; i++) {
    const j = (i + 1) % segments;
    const a0: Vec3 = [outer[i][0], outer[i][1], z0];
    const a1: Vec3 = [outer[j][0], outer[j][1], z0];
    const b0: Vec3 = [outer[i][0], outer[i][1], z1];
    const b1: Vec3 = [outer[j][0], outer[j][1], z1];
    mesh.push(...quad(a0, a1, b1, b0)); // outer wall

    if (innerRadius > 0) {
      const ia0: Vec3 = [inner[i][0], inner[i][1], z0];
      const ia1: Vec3 = [inner[j][0], inner[j][1], z0];
      const ib0: Vec3 = [inner[i][0], inner[i][1], z1];
      const ib1: Vec3 = [inner[j][0], inner[j][1], z1];
      mesh.push(...quad(ia1, ia0, ib0, ib1)); // inner wall, reversed so normal points inward toward the bore

      // annular caps
      mesh.push(tri(a0, ia0, ia1), tri(a0, ia1, a1)); // bottom ring
      mesh.push(tri(b0, b1, ib1), tri(b0, ib1, ib0)); // top ring
    } else {
      const bottomCenter: Vec3 = [cx, cy, z0];
      const topCenter: Vec3 = [cx, cy, z1];
      mesh.push(tri(bottomCenter, a1, a0)); // solid bottom cap
      mesh.push(tri(topCenter, b0, b1)); // solid top cap
    }
  }
  return mesh;
}

export function translateMesh(mesh: Mesh, dx: number, dy: number, dz: number): Mesh {
  const move = (v: Vec3): Vec3 => [v[0] + dx, v[1] + dy, v[2] + dz];
  return mesh.map((t) => ({ normal: t.normal, v0: move(t.v0), v1: move(t.v1), v2: move(t.v2) }));
}

/** Per-axis scale about the origin — normals are unaffected by uniform scale, but a non-uniform scale skews them, so they're renormalized after transforming by the inverse-transpose (== reciprocal per axis, since this is a diagonal matrix). */
export function scaleMesh(mesh: Mesh, sx: number, sy: number, sz: number): Mesh {
  const scalePoint = (v: Vec3): Vec3 => [v[0] * sx, v[1] * sy, v[2] * sz];
  const scaleNormal = (n: Vec3): Vec3 => normalize([n[0] / (sx || 1), n[1] / (sy || 1), n[2] / (sz || 1)]);
  return mesh.map((t) => ({ normal: scaleNormal(t.normal), v0: scalePoint(t.v0), v1: scalePoint(t.v1), v2: scalePoint(t.v2) }));
}

/** Rotates about the origin by degrees around X, then Y, then Z (applied in that order to each point and normal). */
export function rotateMesh(mesh: Mesh, degreesX: number, degreesY: number, degreesZ: number): Mesh {
  const rx = (degreesX * Math.PI) / 180;
  const ry = (degreesY * Math.PI) / 180;
  const rz = (degreesZ * Math.PI) / 180;

  function rotatePoint(v: Vec3): Vec3 {
    let [x, y, z] = v;
    // around X
    let y2 = y * Math.cos(rx) - z * Math.sin(rx);
    let z2 = y * Math.sin(rx) + z * Math.cos(rx);
    y = y2;
    z = z2;
    // around Y
    let x2 = x * Math.cos(ry) + z * Math.sin(ry);
    z2 = -x * Math.sin(ry) + z * Math.cos(ry);
    x = x2;
    z = z2;
    // around Z
    x2 = x * Math.cos(rz) - y * Math.sin(rz);
    y2 = x * Math.sin(rz) + y * Math.cos(rz);
    x = x2;
    y = y2;
    return [x, y, z];
  }

  return mesh.map((t) => ({ normal: normalize(rotatePoint(t.normal)), v0: rotatePoint(t.v0), v1: rotatePoint(t.v1), v2: rotatePoint(t.v2) }));
}

/** Recomputes each face's stored normal from its own vertex winding — use after a transform if you don't trust the propagated normal (e.g. a mirrored/negative scale flips winding without flipping the stored normal). */
export function recomputeNormals(mesh: Mesh): Mesh {
  return mesh.map((t) => {
    const u: Vec3 = sub(t.v1, t.v0);
    const v: Vec3 = sub(t.v2, t.v0);
    return { normal: normalize(cross(u, v)), v0: t.v0, v1: t.v1, v2: t.v2 };
  });
}

export function boundingBox(mesh: Mesh): { min: Vec3; max: Vec3 } {
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (const t of mesh) {
    for (const v of [t.v0, t.v1, t.v2]) {
      for (let a = 0; a < 3; a++) {
        if (v[a] < min[a]) min[a] = v[a];
        if (v[a] > max[a]) max[a] = v[a];
      }
    }
  }
  return { min, max };
}

/** Signed-tetrahedron volume sum (divergence theorem) — correct regardless of internal overlap as long as each part's own faces are consistently outward-wound. */
export function meshVolumeMm3(mesh: Mesh): number {
  let volume = 0;
  for (const t of mesh) {
    volume += (t.v0[0] * (t.v1[1] * t.v2[2] - t.v2[1] * t.v1[2]) -
      t.v0[1] * (t.v1[0] * t.v2[2] - t.v2[0] * t.v1[2]) +
      t.v0[2] * (t.v1[0] * t.v2[1] - t.v2[0] * t.v1[1])) / 6;
  }
  return Math.abs(volume);
}

// --- Enclosure ---------------------------------------------------------

export type LidStyle = "none" | "flat";

export interface EnclosureSpec {
  width: number;
  depth: number;
  height: number;
  wallThickness: number;
  floorThickness: number;
  lid: LidStyle;
  lidClearance: number;
  screwBosses: boolean;
  bossDiameter: number;
  bossInset: number;
}

export const DEFAULT_ENCLOSURE_SPEC: EnclosureSpec = {
  width: 80,
  depth: 60,
  height: 30,
  wallThickness: 2.4,
  floorThickness: 2,
  lid: "flat",
  lidClearance: 0.2,
  screwBosses: true,
  bossDiameter: 6,
  bossInset: 6,
};

export function validateEnclosureSpec(spec: EnclosureSpec): string[] {
  const errors: string[] = [];
  if (spec.width <= 0 || spec.depth <= 0 || spec.height <= 0) errors.push("Width, depth, and height must be positive.");
  if (spec.wallThickness <= 0) errors.push("Wall thickness must be positive.");
  if (spec.floorThickness <= 0) errors.push("Floor thickness must be positive.");
  if (spec.wallThickness * 2 >= spec.width || spec.wallThickness * 2 >= spec.depth) {
    errors.push("Walls are thicker than the box is wide/deep — nothing would be left for the interior cavity.");
  }
  if (spec.screwBosses) {
    if (spec.bossDiameter <= 0) errors.push("Boss diameter must be positive.");
    if (spec.bossInset < spec.bossDiameter / 2 + 1) errors.push("Boss inset is too small — the boss would clip through the outer wall.");
  }
  return errors;
}

export interface EnclosureResult {
  body: Mesh;
  lid: Mesh | null;
}

/**
 * Body: a floor slab with four walls unioned on top (open top). Bosses are
 * solid rods in the four interior corners for self-tapping screws — no
 * pilot hole is cut (no CSG available), so drill/tap after printing.
 * Lid: a flat slab sized to `lidClearance` under the outer footprint,
 * printed/exported as its own part.
 */
export function generateEnclosure(spec: EnclosureSpec): EnclosureResult {
  const { width: w, depth: d, height: h, wallThickness: t, floorThickness: ft } = spec;
  const body: Mesh = [];

  body.push(...boxMesh(0, 0, 0, w, d, ft)); // floor
  body.push(...boxMesh(0, 0, ft, w, t, ft + h)); // front wall (-y)
  body.push(...boxMesh(0, d - t, ft, w, d, ft + h)); // back wall (+y)
  body.push(...boxMesh(0, t, ft, t, d - t, ft + h)); // left wall (-x), between front/back
  body.push(...boxMesh(w - t, t, ft, w, d - t, ft + h)); // right wall (+x)

  if (spec.screwBosses) {
    const r = spec.bossDiameter / 2;
    const inset = spec.bossInset;
    const z0 = ft;
    const z1 = ft + h;
    for (const [cx, cy] of [
      [inset, inset],
      [w - inset, inset],
      [inset, d - inset],
      [w - inset, d - inset],
    ]) {
      body.push(...cylinderMesh(cx, cy, z0, z1, r, 0, 24));
    }
  }

  let lid: Mesh | null = null;
  if (spec.lid === "flat") {
    const c = spec.lidClearance;
    lid = boxMesh(c, c, 0, w - c, d - c, ft);
  }

  return { body, lid };
}

// --- Tube / spacer / washer ---------------------------------------------

export interface TubeSpec {
  outerDiameter: number;
  innerDiameter: number;
  height: number;
}

export const DEFAULT_TUBE_SPEC: TubeSpec = {
  outerDiameter: 20,
  innerDiameter: 12,
  height: 10,
};

export function validateTubeSpec(spec: TubeSpec): string[] {
  const errors: string[] = [];
  if (spec.outerDiameter <= 0) errors.push("Outer diameter must be positive.");
  if (spec.height <= 0) errors.push("Height must be positive.");
  if (spec.innerDiameter < 0) errors.push("Inner diameter can't be negative.");
  if (spec.innerDiameter >= spec.outerDiameter) errors.push("Inner diameter must be smaller than the outer diameter.");
  return errors;
}

export function generateTube(spec: TubeSpec): Mesh {
  return cylinderMesh(0, 0, 0, spec.height, spec.outerDiameter / 2, spec.innerDiameter / 2, 64);
}
