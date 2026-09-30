import { Mesh, Vec3 } from "./solids";

/** ASCII STL — larger than binary but human-inspectable, and simplest to generate/verify in the browser. */
export function meshToStl(mesh: Mesh, name: string): string {
  const lines: string[] = [`solid ${name}`];
  for (const t of mesh) {
    lines.push(
      `  facet normal ${fmt(t.normal[0])} ${fmt(t.normal[1])} ${fmt(t.normal[2])}`,
      "    outer loop",
      `      vertex ${fmt(t.v0[0])} ${fmt(t.v0[1])} ${fmt(t.v0[2])}`,
      `      vertex ${fmt(t.v1[0])} ${fmt(t.v1[1])} ${fmt(t.v1[2])}`,
      `      vertex ${fmt(t.v2[0])} ${fmt(t.v2[1])} ${fmt(t.v2[2])}`,
      "    endloop",
      "  endfacet",
    );
  }
  lines.push(`endsolid ${name}`);
  return lines.join("\n");
}

function fmt(n: number): string {
  return Number.isFinite(n) ? n.toPrecision(7) : "0";
}

/**
 * Parses either STL flavor from a raw file buffer. Binary STL has no
 * required magic bytes — ASCII files always start with "solid", but some
 * binary exporters also write a "solid ..." header in the 80-byte comment,
 * so the only reliable check is the binary format's self-declared triangle
 * count: byte 80..84 (uint32) must exactly account for the rest of the
 * file's length (each triangle is fixed at 50 bytes).
 */
export function parseStl(buffer: ArrayBuffer): Mesh {
  if (buffer.byteLength >= 84) {
    const view = new DataView(buffer);
    const triangleCount = view.getUint32(80, true);
    const expectedLength = 84 + triangleCount * 50;
    if (expectedLength === buffer.byteLength) {
      return parseBinaryStl(view, triangleCount);
    }
  }
  return parseAsciiStl(new TextDecoder().decode(buffer));
}

function parseBinaryStl(view: DataView, triangleCount: number): Mesh {
  const mesh: Mesh = [];
  let offset = 84;
  for (let i = 0; i < triangleCount; i++) {
    const normal: Vec3 = [view.getFloat32(offset, true), view.getFloat32(offset + 4, true), view.getFloat32(offset + 8, true)];
    const v0: Vec3 = [view.getFloat32(offset + 12, true), view.getFloat32(offset + 16, true), view.getFloat32(offset + 20, true)];
    const v1: Vec3 = [view.getFloat32(offset + 24, true), view.getFloat32(offset + 28, true), view.getFloat32(offset + 32, true)];
    const v2: Vec3 = [view.getFloat32(offset + 36, true), view.getFloat32(offset + 40, true), view.getFloat32(offset + 44, true)];
    mesh.push({ normal, v0, v1, v2 });
    offset += 50; // 12 floats (48 bytes) + 2-byte attribute count
  }
  return mesh;
}

const ASCII_VERTEX_RE = /vertex\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+([-\d.eE+]+)/g;
const ASCII_NORMAL_RE = /facet\s+normal\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+([-\d.eE+]+)/g;

function parseAsciiStl(text: string): Mesh {
  const vertices: Vec3[] = [];
  let match: RegExpExecArray | null;
  while ((match = ASCII_VERTEX_RE.exec(text))) {
    vertices.push([Number(match[1]), Number(match[2]), Number(match[3])]);
  }
  const normals: Vec3[] = [];
  while ((match = ASCII_NORMAL_RE.exec(text))) {
    normals.push([Number(match[1]), Number(match[2]), Number(match[3])]);
  }
  const mesh: Mesh = [];
  for (let i = 0; i + 2 < vertices.length; i += 3) {
    const triangleIndex = i / 3;
    const normal = normals[triangleIndex] ?? computeNormal(vertices[i], vertices[i + 1], vertices[i + 2]);
    mesh.push({ normal, v0: vertices[i], v1: vertices[i + 1], v2: vertices[i + 2] });
  }
  return mesh;
}

function computeNormal(a: Vec3, b: Vec3, c: Vec3): Vec3 {
  const u: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const v: Vec3 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const n: Vec3 = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  const len = Math.hypot(n[0], n[1], n[2]);
  return len === 0 ? [0, 0, 0] : [n[0] / len, n[1] / len, n[2] / len];
}
