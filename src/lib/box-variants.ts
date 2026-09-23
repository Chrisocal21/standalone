import { BoxSpec } from "./geometry";

export type BoxVariantId = "storage" | "organizer" | "display" | "stackable" | "gift" | "tool_case";

export interface BoxVariantInfo {
  id: BoxVariantId;
  label: string;
  description: string;
}

export const BOX_VARIANTS: BoxVariantInfo[] = [
  { id: "storage", label: "Storage box", description: "A general-purpose open box." },
  { id: "organizer", label: "Organizer", description: "A box with a divider grid." },
  { id: "display", label: "Display bin", description: "An open-front box for visible contents." },
  { id: "stackable", label: "Stackable bin", description: "A box with a registration collar." },
  { id: "gift", label: "Gift box", description: "A box with a slide lid." },
  { id: "tool_case", label: "Tool case", description: "A hinged box with internal dividers." },
];

export const BOX_VARIANT_LABELS: Record<BoxVariantId, string> = Object.fromEntries(BOX_VARIANTS.map(({ id, label }) => [id, label])) as Record<
  BoxVariantId,
  string
>;

/** Apply a use-case starting point without changing the user's dimensions or material settings. */
export function applyBoxVariant(spec: BoxSpec, variant: BoxVariantId): BoxSpec {
  const base = { ...spec, omitPanels: [] as BoxSpec["omitPanels"], dividerRows: 0, dividerColumns: 0, stackable: false, lidStyle: "none" as BoxSpec["lidStyle"] };
  switch (variant) {
    case "organizer":
      return { ...base, dividerRows: 1, dividerColumns: 2 };
    case "display":
      return { ...base, omitPanels: ["front"] };
    case "stackable":
      return { ...base, stackable: true };
    case "gift":
      return { ...base, lidStyle: "slide" };
    case "tool_case":
      return { ...base, lidStyle: "hinged", dividerRows: 1, dividerColumns: 2 };
    case "storage":
      return base;
  }
}
