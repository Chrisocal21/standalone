import { Panel, Point, circlePath, rectPath } from "./geometry";

export type SunMode = "behind_peak" | "rising";

export type FujiLayerId = "sky" | "sun" | "distant_mountain" | "fuji" | "snow_cap" | "foreground_ridge";

/** Back-to-front physical stacking order — fixed regardless of the order layers were toggled on in. */
export const FUJI_LAYER_IDS: FujiLayerId[] = ["sky", "sun", "distant_mountain", "fuji", "snow_cap", "foreground_ridge"];

export const FUJI_LAYER_LABELS: Record<FujiLayerId, string> = {
  sky: "Sky / back panel",
  sun: "Sun",
  distant_mountain: "Distant mountain",
  fuji: "Mt. Fuji",
  snow_cap: "Snow cap",
  foreground_ridge: "Foreground ridge",
};

/** A starting suggestion, not a real spec sheet — pick to taste per material on hand. */
export const FUJI_MATERIAL_LEGEND: Record<FujiLayerId, string> = {
  sky: "pale blue/grey acrylic or plywood",
  sun: "orange or red acrylic",
  distant_mountain: "mid-grey acrylic",
  fuji: "slate/navy acrylic or dark plywood",
  snow_cap: "white acrylic",
  foreground_ridge: "near-black acrylic or plywood",
};

/**
 * Which layers are full solid boards (silhouette traced all the way down to
 * the panel's base edge) versus small appliqués that don't reach it. This is
 * what makes "duplicate the artwork instead of cutting a blank spacer" work
 * at all: a plane layer is already solid material behind its silhouette line,
 * so gluing N identical copies of it back-to-back is a real standoff, not
 * just a thicker picture. An overlay has no back plane to speak of — it's a
 * thin accent meant to sit flush on whichever plane is glued behind it.
 */
export const FUJI_PLANE_LAYER_IDS: FujiLayerId[] = ["sky", "distant_mountain", "fuji", "foreground_ridge"];
export const FUJI_OVERLAY_LAYER_IDS: FujiLayerId[] = ["sun", "snow_cap"];

export interface FujiSceneSpec {
  width: number;
  height: number;
  materialThickness: number;
  sunMode: SunMode;
  sunDiameter: number;
  /** Which depth planes to include. "sky" is the structural back panel and can't be removed. */
  layers: FujiLayerId[];
  /**
   * How many identical copies of each *plane* layer to cut and laminate
   * back-to-back. There's no separate blank spacer part any more — the
   * standoff between planes is just more copies of that plane's own
   * silhouette glued behind it (or, equivalently, cutting that one layer
   * from thicker stock — same physical result, this is only needed when
   * you're laminating thinner sheets instead). Overlay layers (sun, snow
   * cap) always cut as a single copy regardless of this value.
   */
  layerBacking: number;
  /** Cut a hanging slot into the back (sky) panel. */
  wallHanger: boolean;
}

export const DEFAULT_FUJI_SCENE_SPEC: FujiSceneSpec = {
  width: 300,
  height: 220,
  materialThickness: 3,
  sunMode: "behind_peak",
  sunDiameter: 54,
  layers: ["sky", "sun", "distant_mountain", "fuji", "snow_cap", "foreground_ridge"],
  layerBacking: 1,
  wallHanger: true,
};

function registrationHoles(width: number, height: number, inset: number): Point[][] {
  const radius = Math.max(1, inset * 0.18);
  return [
    circlePath([inset, inset], radius, 20),
    circlePath([width - inset, inset], radius, 20),
    circlePath([inset, height - inset], radius, 20),
    circlePath([width - inset, height - inset], radius, 20),
  ];
}

function silhouette(points: Point[], name: string, width: number, height: number, inset: number): Panel {
  return { name, width, height, path: points, holes: registrationHoles(width, height, inset), cuts: [] };
}

function mountainRidge(width: number, baseY: number, peakX: number, peakY: number, shoulder: number): Point[] {
  return [
    [0, baseY],
    [0, baseY - shoulder * 0.18],
    [width * 0.12, baseY - shoulder * 0.42],
    [width * 0.28, baseY - shoulder * 0.22],
    [peakX - width * 0.13, baseY - shoulder * 0.48],
    [peakX, peakY],
    [peakX + width * 0.13, baseY - shoulder * 0.48],
    [width * 0.72, baseY - shoulder * 0.18],
    [width * 0.88, baseY - shoulder * 0.52],
    [width, baseY - shoulder * 0.28],
    [width, baseY],
    [width, heightSafe(baseY)],
    [0, heightSafe(baseY)],
  ];
}

function heightSafe(value: number): number {
  return Math.max(value, 0);
}

function fujiSilhouette(width: number, height: number, baseY: number): Point[] {
  const peakX = width * 0.52;
  const peakY = height * 0.18;
  return [
    [0, baseY],
    [width * 0.12, baseY - height * 0.08],
    [width * 0.27, baseY - height * 0.18],
    [width * 0.38, baseY - height * 0.34],
    [peakX, peakY],
    [width * 0.61, baseY - height * 0.34],
    [width * 0.73, baseY - height * 0.18],
    [width * 0.9, baseY - height * 0.07],
    [width, baseY],
    [width, height],
    [0, height],
  ];
}

function snowCap(width: number, height: number): Point[] {
  const peakX = width * 0.52;
  const peakY = height * 0.18;
  const baseY = height * 0.49;
  return [
    [width * 0.38, baseY],
    [width * 0.44, baseY - height * 0.12],
    [peakX, peakY],
    [width * 0.59, baseY - height * 0.12],
    [width * 0.67, baseY],
    [width * 0.59, baseY - height * 0.04],
    [width * 0.51, baseY - height * 0.1],
    [width * 0.44, baseY - height * 0.03],
  ];
}

export function validateFujiSceneSpec(spec: FujiSceneSpec): string[] {
  const errors: string[] = [];
  if (!(spec.width > 0)) errors.push("width must be greater than zero");
  if (!(spec.height > 0)) errors.push("height must be greater than zero");
  if (!(spec.materialThickness > 0)) errors.push("materialThickness must be greater than zero");
  const layers = new Set(spec.layers);
  if (!layers.has("sky")) errors.push("layers must include \"sky\" — it's the structural back panel");
  if (spec.layers.length < 3) errors.push("pick at least 3 layers for a real sense of depth");
  if (!spec.layers.every((id) => FUJI_LAYER_IDS.includes(id))) errors.push(`layers must only contain ${FUJI_LAYER_IDS.join(", ")}`);
  if (layers.has("sun") && !(spec.sunDiameter > 0 && spec.sunDiameter < spec.width * 0.5)) {
    errors.push("sunDiameter must be positive and less than half the scene width");
  }
  if (spec.layerBacking < 1 || spec.layerBacking > 4 || !Number.isInteger(spec.layerBacking)) {
    errors.push("layerBacking must be a whole number from 1 to 4");
  }
  return errors;
}

/** Original parametric Mt. Fuji-inspired scene, not a traced artwork. */
export function generateFujiSunset(spec: FujiSceneSpec): Panel[] {
  const inset = Math.max(spec.materialThickness * 2, 8);
  const horizon = spec.height * 0.7;

  const sunX = spec.width * 0.55;
  const risingSunY = horizon - spec.sunDiameter * 0.34;
  const behindSunY = spec.height * 0.34;
  const sunY = spec.sunMode === "rising" ? risingSunY : behindSunY;

  function layerPanel(id: FujiLayerId): Panel {
    switch (id) {
      case "sky":
        return silhouette(rectPath(spec.width, spec.height), "sky / back layer", spec.width, spec.height, inset);
      case "sun":
        return {
          name: spec.sunMode === "rising" ? "rising sun" : "sun behind peak",
          width: spec.width,
          height: spec.height,
          path: circlePath([sunX, sunY], spec.sunDiameter / 2, 48),
          holes: registrationHoles(spec.width, spec.height, inset),
          cuts: [],
        };
      case "distant_mountain":
        return silhouette(
          mountainRidge(spec.width, horizon, spec.width * 0.22, spec.height * 0.35, spec.height * 0.25),
          "distant mountain layer",
          spec.width,
          spec.height,
          inset
        );
      case "fuji":
        return silhouette(fujiSilhouette(spec.width, spec.height, horizon + spec.height * 0.03), "Mt. Fuji layer", spec.width, spec.height, inset);
      case "snow_cap":
        return silhouette(snowCap(spec.width, spec.height), "snow cap layer", spec.width, spec.height, inset);
      case "foreground_ridge":
        return silhouette(
          mountainRidge(spec.width, spec.height * 0.86, spec.width * 0.8, spec.height * 0.6, spec.height * 0.22),
          "foreground ridge layer",
          spec.width,
          spec.height,
          inset
        );
    }
  }

  const included = new Set(spec.layers);
  const ordered = FUJI_LAYER_IDS.filter((id) => included.has(id));
  if (ordered.length === 0) return [];

  const panels: Panel[] = [];
  let lastSkyIndex = -1;
  ordered.forEach((id) => {
    const isPlane = FUJI_PLANE_LAYER_IDS.includes(id);
    const copies = isPlane ? spec.layerBacking : 1;
    const base = layerPanel(id);
    for (let copyIndex = 0; copyIndex < copies; copyIndex++) {
      const name = copies > 1 ? `${base.name} — backing ${copyIndex + 1}/${copies}` : base.name;
      panels.push({ ...base, name });
      if (id === "sky") lastSkyIndex = panels.length - 1;
    }
  });

  // The hang slot goes on whichever sky copy ends up glued as the true rear
  // face of the stack — the last one cut, by convention — not the first.
  if (spec.wallHanger && lastSkyIndex >= 0) {
    const backPanel = panels[lastSkyIndex];
    const slotWidth = Math.max(spec.width * 0.18, 24);
    const slotHeight = Math.max(spec.materialThickness * 2.2, 5);
    const slotX = spec.width / 2 - slotWidth / 2;
    const slotY = Math.max(inset * 0.6, 6);
    const slotHole: Point[] = rectPath(slotWidth, slotHeight).map(([x, y]) => [x + slotX, y + slotY]);
    panels[lastSkyIndex] = { ...backPanel, holes: [...backPanel.holes, slotHole] };
  }

  return panels;
}

/** Total sheet count across all included layers, counting each plane layer's laminated backing copies. */
export function fujiSheetCount(spec: FujiSceneSpec): number {
  return spec.layers.reduce((total, id) => total + (FUJI_PLANE_LAYER_IDS.includes(id) ? spec.layerBacking : 1), 0);
}
