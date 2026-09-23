"use client";

import { ReactElement } from "react";

/**
 * Small schematic glyphs for the shape rail — abstract line-art, not
 * literal previews, matching the blueprint aesthetic (thin strokes, no
 * fill) used everywhere else in this tool.
 */

const commonProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.3,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export type ShapeIconName = "box" | "cylinder" | "tray" | "pegboard" | "stand" | "shelf" | "build" | "scene";

function BoxIcon() {
  return (
    <svg {...commonProps}>
      <rect x="5" y="5" width="14" height="14" />
    </svg>
  );
}

function CylinderIcon() {
  return (
    <svg {...commonProps}>
      <ellipse cx="12" cy="7" rx="7" ry="3" />
      <path d="M5 7v10a7 3 0 0 0 14 0V7" />
    </svg>
  );
}

function TrayIcon() {
  return (
    <svg {...commonProps}>
      <rect x="4" y="6" width="16" height="12" />
      <line x1="12" y1="6" x2="12" y2="18" />
      <line x1="4" y1="12" x2="20" y2="12" />
    </svg>
  );
}

function PegboardIcon() {
  return (
    <svg {...commonProps}>
      <rect x="4" y="4" width="16" height="16" />
      <circle cx="9" cy="9" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="15" cy="9" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="9" cy="15" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="15" cy="15" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

function StandIcon() {
  return (
    <svg {...commonProps}>
      <line x1="6" y1="4" x2="18" y2="20" />
      <line x1="18" y1="4" x2="6" y2="20" />
    </svg>
  );
}

function ShelfIcon() {
  return (
    <svg {...commonProps}>
      <path d="M5 5v14h14V5" />
    </svg>
  );
}

function BuildIcon() {
  return (
    <svg {...commonProps}>
      <rect x="4" y="5" width="9" height="7" />
      <rect x="11" y="12" width="9" height="7" />
      <line x1="13" y1="8" x2="20" y2="8" />
    </svg>
  );
}

function SceneIcon() {
  return (
    <svg {...commonProps}>
      <circle cx="17" cy="7" r="3" />
      <path d="M4 18 10 11l3 3 3-4 4 8H4Z" />
    </svg>
  );
}

const ICONS: Record<ShapeIconName, () => ReactElement> = {
  box: BoxIcon,
  cylinder: CylinderIcon,
  tray: TrayIcon,
  pegboard: PegboardIcon,
  stand: StandIcon,
  shelf: ShelfIcon,
  build: BuildIcon,
  scene: SceneIcon,
};

export function ShapeIcon({ shape }: { shape: ShapeIconName }) {
  const Icon = ICONS[shape];
  return <Icon />;
}
