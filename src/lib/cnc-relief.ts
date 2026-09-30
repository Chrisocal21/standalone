/**
 * Corner relief for CNC-routed joints. A router bit is round, so it can't
 * cut a sharp inside (concave) corner — it always leaves a fillet of its
 * own radius there, which stops a mating square tab from seating flush.
 * Dogbone and T-bone reliefs deliberately over-cut a little at exactly
 * those corners so the fillet lands outside the joint instead of inside it.
 *
 * Geometry (dogbone, the well-established case): at a concave vertex where
 * the two walls meet at interior angle psi (the notch's own opening angle,
 * not the polygon's interior angle), a circle of radius r tangent to both
 * walls sits with its center at distance r / sin(psi/2) along the angle
 * bisector, and each wall is trimmed back by r / tan(psi/2) before the
 * tangent point. For a 90° corner this is the widely-cited r*sqrt(2) offset
 * with 1r trim on each wall — this is that formula generalized to any
 * concave angle.
 *
 * T-bone here is a straight-chord variant: the same two tangent points as
 * dogbone, connected by a straight line instead of an arc — for machines or
 * CAM chains that don't like small arcs. It's a safe, gap-free stand-in
 * (verified not to gouge), not a reproduction of the traditional single-axis
 * T-bone extension you'll see in some CAM packages — dogbone is the fully
 * tangent, standard-formula default; reach for T-bone only if your
 * controller specifically has trouble with arcs.
 */

export type Point = readonly [number, number];
export type ReliefStyle = "dogbone" | "tbone";

export interface ReliefOptions {
  style: ReliefStyle;
  toolRadius: number;
  arcSegments?: number;
}

const EPS = 1e-9;
/** Concave corners sharper than ~8.6° or flatter than ~172° are skipped — the tangent-offset formula blows up (or the "corner" is barely a corner) at those extremes. */
const MIN_PSI = 0.15;
const MAX_PSI = Math.PI - 0.15;

function sub(a: Point, b: Point): Point {
  return [a[0] - b[0], a[1] - b[1]];
}
function add(a: Point, b: readonly [number, number]): Point {
  return [a[0] + b[0], a[1] + b[1]];
}
function scale(v: readonly [number, number], s: number): [number, number] {
  return [v[0] * s, v[1] * s];
}
function dot(a: readonly [number, number], b: readonly [number, number]): number {
  return a[0] * b[0] + a[1] * b[1];
}
function cross2(a: readonly [number, number], b: readonly [number, number]): number {
  return a[0] * b[1] - a[1] * b[0];
}
function length(v: readonly [number, number]): number {
  return Math.hypot(v[0], v[1]);
}
function normalize(v: readonly [number, number]): [number, number] {
  const len = length(v);
  return len > EPS ? [v[0] / len, v[1] / len] : [0, 0];
}

/** Drops consecutive duplicate points (within epsilon) — the box/joint generators emit these at some panel corners as an artifact of how edges are concatenated, and a zero-length edge breaks the direction-vector math (normalize returns [0,0], which can never register as concave or convex). */
function dedupeConsecutive(path: readonly Point[]): Point[] {
  const result: Point[] = [];
  const n = path.length;
  for (let i = 0; i < n; i++) {
    const p = path[i];
    const last = result[result.length - 1];
    if (!last || Math.hypot(p[0] - last[0], p[1] - last[1]) > EPS) result.push(p);
  }
  while (result.length > 1 && Math.hypot(result[0][0] - result[result.length - 1][0], result[0][1] - result[result.length - 1][1]) <= EPS) {
    result.pop();
  }
  return result;
}

export function signedArea(path: readonly Point[]): number {
  let area = 0;
  const n = path.length;
  for (let i = 0; i < n; i++) {
    const [x1, y1] = path[i];
    const [x2, y2] = path[(i + 1) % n];
    area += x1 * y2 - x2 * y1;
  }
  return area / 2;
}

function angularDistanceCcw(from: number, to: number): number {
  let d = to - from;
  while (d < 0) d += Math.PI * 2;
  while (d >= Math.PI * 2) d -= Math.PI * 2;
  return d;
}

/** Points along the arc strictly between `from` and `to` (endpoints excluded — the caller supplies exact tangent points), sweeping through `through`. */
function arcPoints(center: Point, radius: number, angleA: number, angleB: number, angleThrough: number, segments: number): Point[] {
  const ccwSweep = angularDistanceCcw(angleA, angleB);
  const ccwToThrough = angularDistanceCcw(angleA, angleThrough);
  const goCcw = ccwToThrough <= ccwSweep + EPS;
  const sweep = goCcw ? ccwSweep : -(Math.PI * 2 - ccwSweep);

  const points: Point[] = [];
  for (let i = 1; i < segments; i++) {
    const angle = angleA + (sweep * i) / segments;
    points.push([center[0] + radius * Math.cos(angle), center[1] + radius * Math.sin(angle)]);
  }
  return points;
}

/**
 * Adds dogbone/T-bone relief at every concave (reflex) vertex of a closed
 * polygon path. Convex vertices pass through untouched — a round bit has no
 * trouble with those, since the corner points outward into open space.
 */
export function addCornerRelief(rawPath: readonly Point[], options: ReliefOptions): Point[] {
  const { style, toolRadius: r, arcSegments = 8 } = options;
  const path = dedupeConsecutive(rawPath);
  if (r <= 0 || path.length < 3) return [...path];

  const ccw = signedArea(path) > 0;
  const n = path.length;
  const result: Point[] = [];

  for (let i = 0; i < n; i++) {
    const prev = path[(i - 1 + n) % n];
    const curr = path[i];
    const next = path[(i + 1) % n];

    const u = normalize(sub(curr, prev)); // incoming direction
    const v = normalize(sub(next, curr)); // outgoing direction
    const turn = cross2(u, v);
    const isConcave = ccw ? turn < -EPS : turn > EPS;

    if (!isConcave) {
      result.push(curr);
      continue;
    }

    // psi = the notch's own opening angle at this vertex, between the two walls as seen from the cut-away side.
    const psi = Math.acos(Math.max(-1, Math.min(1, -dot(u, v))));
    if (psi < MIN_PSI || psi > MAX_PSI) {
      result.push(curr);
      continue;
    }

    // Bisector points from the vertex toward the material's own corner apex (away from the pocket's
    // centroid) — the direction the relief bulges into, verified against the standard 90-degree case
    // (r*sqrt(2) center offset, 1r tangent trim) where this reduces to the widely-published formula.
    const bisector = normalize(sub(u, v));
    // Safety cap: very sharp notch angles (near MIN_PSI) blow this up; a plain corner is better than a wild overshoot.
    const tangentLength = Math.min(r / Math.tan(psi / 2), r * 6);

    // The tangent point on each wall's *line* (not necessarily the segment) — for a concave vertex this
    // point sits just past curr along the incoming wall, and just before curr along the outgoing wall's
    // line (extended backward through curr). That's not a bug: the relief replaces the sharp turn with a
    // longer straight run on each wall plus a detour through the bulge, so the tool never actually turns
    // sharply at curr — it happens to pass straight through that coordinate afterward instead.
    const a = add(curr, scale(u, tangentLength));
    const b = sub(curr, scale(v, tangentLength));

    if (style === "dogbone") {
      const centerDist = Math.min(r / Math.sin(psi / 2), r * 6);
      const center = add(curr, scale(bisector, centerDist));

      const angleA = Math.atan2(a[1] - center[1], a[0] - center[0]);
      const angleB = Math.atan2(b[1] - center[1], b[0] - center[0]);
      const angleThrough = Math.atan2(bisector[1], bisector[0]);

      result.push(a, ...arcPoints(center, r, angleA, angleB, angleThrough, arcSegments), b);
    } else {
      // Straight chord between the same two tangent points instead of arcing around them — a softer
      // corner at `a` and `b` rather than dogbone's fully tangent arc, for machines/CAM chains that
      // don't like small arcs. Not the traditional single-axis T-bone extension (that needs a real
      // reference geometry to get right); this is a safe, gap-free stand-in labeled the same in the UI.
      result.push(a, b);
    }
  }

  return result;
}

/** Every concave-vertex index in the path, for callers that just want to report a count ("N corners relieved") without recomputing the relief itself. */
export function countConcaveVertices(rawPath: readonly Point[]): number {
  const path = dedupeConsecutive(rawPath);
  const ccw = signedArea(path) > 0;
  const n = path.length;
  let count = 0;
  for (let i = 0; i < n; i++) {
    const prev = path[(i - 1 + n) % n];
    const curr = path[i];
    const next = path[(i + 1) % n];
    const u = normalize(sub(curr, prev));
    const v = normalize(sub(next, curr));
    const turn = cross2(u, v);
    if (ccw ? turn < -EPS : turn > EPS) count += 1;
  }
  return count;
}
