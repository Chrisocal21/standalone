/**
 * Registry of individual scene designs available under the "Scene" nav tab.
 * The tab is a category, not a single design — each entry here is one
 * pickable composition. Only "fuji-sunset" has a real generator today;
 * the rest are placeholders marking where future scenes slot in.
 */
export interface SceneCatalogEntry {
  id: string;
  label: string;
  blurb: string;
  /** false = shown in the picker, greyed out, not selectable yet. */
  available: boolean;
}

export const SCENE_CATALOG: SceneCatalogEntry[] = [
  { id: "fuji-sunset", label: "Mt. Fuji", blurb: "Layered silhouette — sunset or sunrise", available: true },
  { id: "coastline", label: "Coastline", blurb: "Layered shoreline scene", available: false },
  { id: "forest", label: "Forest line", blurb: "Layered tree silhouettes", available: false },
  { id: "cityscape", label: "Cityscape", blurb: "Layered skyline scene", available: false },
];

export const DEFAULT_SCENE_ID = "fuji-sunset";
