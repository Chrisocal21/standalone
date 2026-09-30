"use client";

import { useEffect, useRef, useState } from "react";
import { boundingBox, Mesh, Vec3 } from "@/lib/solids";
import { LengthUnit, fromMm, roundForDisplay } from "@/lib/units";
import styles from "./print-tool.module.css";

/**
 * Hand-rolled wireframe/shaded solid preview — no three.js dependency.
 * Rotates the mesh with two rotation matrices (yaw, pitch), projects
 * orthographically, then paints triangles back-to-front (painter's
 * algorithm) with a flat directional-light shade. Good enough for a few
 * thousand triangles at interactive drag rates; not a general 3D engine.
 *
 * The ground grid, axis gizmo, and dimension callouts borrow Tinkercad's
 * "always show me where the model sits and how big it is" instinct, redrawn
 * in this app's paper/mono palette rather than Tinkercad's own colors.
 */
export default function MeshPreview({ meshes, label, unit = "mm" }: { meshes: Mesh[]; label: string; unit?: LengthUnit }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rotation, setRotation] = useState({ yaw: -0.6, pitch: 0.55 });
  const [zoom, setZoom] = useState(1);
  const [resizeTick, setResizeTick] = useState(0);
  const dragRef = useRef<{ x: number; y: number } | null>(null);

  // Redraw at the new canvas size whenever the container resizes — entering/exiting
  // fullscreen being the main case, since that changes the canvas's rect without
  // touching any of the other draw-effect dependencies below.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => setResizeTick((t) => t + 1));
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    dragRef.current = { x: event.clientX, y: event.clientY };
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
  }
  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    const last = dragRef.current;
    if (!last) return;
    const dx = event.clientX - last.x;
    const dy = event.clientY - last.y;
    dragRef.current = { x: event.clientX, y: event.clientY };
    setRotation((r) => ({ yaw: r.yaw + dx * 0.008, pitch: Math.max(-1.5, Math.min(1.5, r.pitch - dy * 0.008)) }));
  }
  function endDrag() {
    dragRef.current = null;
  }
  function handleWheel(event: React.WheelEvent<HTMLCanvasElement>) {
    event.preventDefault();
    setZoom((z) => Math.max(0.2, Math.min(4, z * (event.deltaY > 0 ? 0.9 : 1 / 0.9))));
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const all = meshes.flat();
    if (all.length === 0) return;
    const { min, max } = boundingBox(all);
    const center: Vec3 = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
    const extent = Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2], 1);
    const scale = (Math.min(rect.width, rect.height) / extent) * 0.7 * zoom;

    const cosY = Math.cos(rotation.yaw);
    const sinY = Math.sin(rotation.yaw);
    const cosP = Math.cos(rotation.pitch);
    const sinP = Math.sin(rotation.pitch);

    function rotatePoint(v: Vec3): Vec3 {
      const x1 = v[0] * cosY - v[1] * sinY;
      const y1 = v[0] * sinY + v[1] * cosY;
      const y2 = y1 * cosP - v[2] * sinP;
      const z2 = y1 * sinP + v[2] * cosP;
      return [x1, y2, z2];
    }

    function project(v: Vec3): { x: number; y: number; z: number } {
      const rotated = rotatePoint([v[0] - center[0], v[1] - center[1], v[2] - center[2]]);
      return { x: rect.width / 2 + rotated[0] * scale, y: rect.height / 2 - rotated[2] * scale, z: rotated[1] };
    }

    const styleRoot = getComputedStyle(canvas);
    const colorVar = (name: string, fallback: string) => styleRoot.getPropertyValue(name).trim() || fallback;
    const monoFont = colorVar("--font-mono", "") || "ui-monospace, monospace";
    const inkRgb = hexToRgb(colorVar("--ink", "#191c20")) ?? { r: 25, g: 28, b: 32 };
    const paperRgb = hexToRgb(colorVar("--paper-raised", "#e5e0d1")) ?? { r: 229, g: 224, b: 209 };
    const ruleSoft = colorVar("--rule-soft", "rgba(25,28,32,0.12)");
    const inkFaint = colorVar("--ink-faint", "#8a8f96");
    const accent = colorVar("--accent", "#1f4b8f");
    const danger = colorVar("--danger", "#9a3324");

    // --- ground grid (Tinkercad-style workplane), drawn under the model at its lowest Z ---
    const gridExtent = extent * 1.6;
    const gridStep = niceGridStep(gridExtent / 10);
    const gridLines: number[] = [];
    for (let g = -Math.ceil(gridExtent / gridStep) * gridStep; g <= gridExtent; g += gridStep) gridLines.push(g);

    ctx.strokeStyle = ruleSoft;
    ctx.lineWidth = 1;
    for (const g of gridLines) {
      const a = project([center[0] + g, center[1] - gridExtent, min[2]]);
      const b = project([center[0] + g, center[1] + gridExtent, min[2]]);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      const c = project([center[0] - gridExtent, center[1] + g, min[2]]);
      const d = project([center[0] + gridExtent, center[1] + g, min[2]]);
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      ctx.lineTo(d.x, d.y);
      ctx.stroke();
    }

    // --- solid, painter's algorithm ---
    const light = { x: -0.4, y: -0.5, z: 0.75 };
    const lightLen = Math.hypot(light.x, light.y, light.z);
    const lightDir = [light.x / lightLen, light.y / lightLen, light.z / lightLen];

    interface Drawable {
      depth: number;
      points: { x: number; y: number }[];
      shade: number;
    }
    const drawables: Drawable[] = [];
    for (const tri of all) {
      const p0 = project(tri.v0);
      const p1 = project(tri.v1);
      const p2 = project(tri.v2);
      const depth = (p0.z + p1.z + p2.z) / 3;
      const n = rotatePoint(tri.normal);
      const dot = n[0] * lightDir[0] + n[1] * lightDir[1] + n[2] * lightDir[2];
      const shade = 0.35 + 0.55 * Math.max(0, dot);
      drawables.push({ depth, points: [p0, p1, p2], shade });
    }
    drawables.sort((a, b) => a.depth - b.depth);

    for (const d of drawables) {
      const r = Math.round(paperRgb.r + (inkRgb.r - paperRgb.r) * d.shade * 0.6);
      const g = Math.round(paperRgb.g + (inkRgb.g - paperRgb.g) * d.shade * 0.6);
      const b = Math.round(paperRgb.b + (inkRgb.b - paperRgb.b) * d.shade * 0.6);
      ctx.beginPath();
      ctx.moveTo(d.points[0].x, d.points[0].y);
      ctx.lineTo(d.points[1].x, d.points[1].y);
      ctx.lineTo(d.points[2].x, d.points[2].y);
      ctx.closePath();
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fill();
    }

    // --- dimension callouts, anchored off the near-bottom corner ---
    const cornerMm: Vec3 = [min[0], min[1], min[2]];
    ctx.font = `10px ${monoFont}`;
    ctx.fillStyle = inkFaint;
    ctx.strokeStyle = inkFaint;
    ctx.lineWidth = 1;

    const context = ctx;
    const callout = (from: Vec3, to: Vec3, mmLength: number) => {
      const a = project(from);
      const b = project(to);
      context.beginPath();
      context.moveTo(a.x, a.y);
      context.lineTo(b.x, b.y);
      context.stroke();
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const displayValue = roundForDisplay(fromMm(mmLength, unit), unit);
      context.fillText(`${displayValue}${unit}`, mid.x + 4, mid.y - 4);
    };

    callout(cornerMm, [max[0], min[1], min[2]], max[0] - min[0]); // width, X
    callout(cornerMm, [min[0], max[1], min[2]], max[1] - min[1]); // depth, Y
    callout(cornerMm, [min[0], min[1], max[2]], max[2] - min[2]); // height, Z

    // --- axis gizmo, fixed size/position in the bottom-left, rotation-only ---
    const gizmoOrigin = { x: 44, y: rect.height - 44 };
    const gizmoLength = 26;
    const axes: { vec: Vec3; label: string; color: string }[] = [
      { vec: [1, 0, 0], label: "X", color: danger },
      { vec: [0, 1, 0], label: "Y", color: accent },
      { vec: [0, 0, 1], label: "Z", color: colorVar("--ink", "#191c20") },
    ];
    for (const axis of axes) {
      const rotated = rotatePoint(axis.vec);
      const tip = { x: gizmoOrigin.x + rotated[0] * gizmoLength, y: gizmoOrigin.y - rotated[2] * gizmoLength };
      ctx.strokeStyle = axis.color;
      ctx.fillStyle = axis.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(gizmoOrigin.x, gizmoOrigin.y);
      ctx.lineTo(tip.x, tip.y);
      ctx.stroke();
      ctx.font = `bold 10px ${monoFont}`;
      ctx.fillText(axis.label, tip.x + (rotated[0] >= 0 ? 3 : -10), tip.y + (rotated[2] <= 0 ? 10 : -4));
    }
  }, [meshes, rotation, zoom, resizeTick, unit]);

  return (
    <div className={styles.meshPreviewWrap}>
      <canvas
        ref={canvasRef}
        className={styles.meshCanvas}
        aria-label={label}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onWheel={handleWheel}
      />
      <span className={`${styles.zoomHint} mono`}>drag to rotate &middot; scroll to zoom</span>
    </div>
  );
}

/** Rounds a raw grid spacing to the nearest "nice" 1/2/5 x 10^n step, same idea as a CAD workplane's adaptive grid. */
function niceGridStep(raw: number): number {
  const exponent = Math.floor(Math.log10(raw));
  const base = Math.pow(10, exponent);
  const fraction = raw / base;
  const nice = fraction < 1.5 ? 1 : fraction < 3.5 ? 2 : fraction < 7.5 ? 5 : 10;
  return nice * base;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!match) return null;
  return { r: parseInt(match[1], 16), g: parseInt(match[2], 16), b: parseInt(match[3], 16) };
}
