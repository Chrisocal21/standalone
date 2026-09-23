import { Panel } from "./geometry";
import { DEFAULT_TRAY_SPEC, TraySpec, generateTray, validateTraySpec } from "./tray";

export type BuildType = "workshop_organizer";

export interface WorkshopOrganizerSpec {
  width: number;
  depth: number;
  height: number;
  materialThickness: number;
  kerf: number;
}

export const DEFAULT_WORKSHOP_ORGANIZER_SPEC: WorkshopOrganizerSpec = {
  width: 240,
  depth: 160,
  height: 45,
  materialThickness: DEFAULT_TRAY_SPEC.materialThickness,
  kerf: DEFAULT_TRAY_SPEC.kerf,
};

function traySpec(spec: WorkshopOrganizerSpec, width: number, depth: number, height: number, rows: number, columns: number): TraySpec {
  return {
    width,
    depth,
    height,
    rows,
    columns,
    materialThickness: spec.materialThickness,
    kerf: spec.kerf,
    fingers: 4,
    joint: "finger",
    cornerRadius: 0,
    omitPanels: [],
  };
}

function namedPanels(prefix: string, panels: Panel[]): Panel[] {
  return panels.map((panel) => ({ ...panel, name: `${prefix} / ${panel.name}` }));
}

export function validateWorkshopOrganizerSpec(spec: WorkshopOrganizerSpec): string[] {
  const errors = validateTraySpec(traySpec(spec, spec.width, spec.depth, spec.height, 1, 2));
  if (spec.width <= 180) errors.push("width must leave room for the coordinated trays");
  if (spec.depth <= 120) errors.push("depth must leave room for the coordinated trays");
  return errors;
}

/**
 * A coordinated cut set: one divided main tray plus two smaller companion
 * trays sized from the same material and fit assumptions.
 */
export function generateWorkshopOrganizer(spec: WorkshopOrganizerSpec): Panel[] {
  const companionWidth = (spec.width - spec.materialThickness * 3) / 2;
  const companionDepth = spec.depth * 0.55;
  const companionHeight = spec.height * 0.75;
  return [
    ...namedPanels("main tray", generateTray(traySpec(spec, spec.width, spec.depth, spec.height, 1, 2))),
    ...namedPanels("small tray A", generateTray(traySpec(spec, companionWidth, companionDepth, companionHeight, 0, 2))),
    ...namedPanels("small tray B", generateTray(traySpec(spec, companionWidth, companionDepth, companionHeight, 0, 2))),
  ];
}