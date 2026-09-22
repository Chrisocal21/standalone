"use client";

import { ReactNode, useState } from "react";
import { STRUCTURAL_PANELS, StructuralPanel } from "@/lib/geometry";
import { LengthUnit, fromMm, roundForDisplay, toMm } from "@/lib/units";
import styles from "./box-tool.module.css";

/**
 * A clickable-header group that collapses its contents, so a shape with a
 * lot of optional settings (joint, lid, dividers, sides...) doesn't have to
 * show all of them at once. `defaultOpen` is only read on first render —
 * once the user has toggled a section, switching shapes won't fight them.
 */
export function CollapsibleSection({ title, defaultOpen = true, children }: { title: string; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={styles.section}>
      <button type="button" className={styles.sectionHeader} onClick={() => setOpen((current) => !current)} aria-expanded={open}>
        <span className={`${styles.sectionLabel} mono`}>{title}</span>
        <span className={`${styles.sectionToggle} mono`}>{open ? "−" : "+"}</span>
      </button>
      {open && <div className={styles.sectionBody}>{children}</div>}
    </div>
  );
}

export interface FieldSpec<T extends string> {
  key: T;
  label: string;
  /** Suffix shown when the field isn't a length (e.g. "deg", "" for a count). Ignored for length fields — those show the active unit instead. */
  unit: string;
  step: number;
  min?: number;
  /** Whether this field is a physical length that should convert with the unit toggle. Defaults to true — set false for counts, angles, etc. */
  isLength?: boolean;
}

/**
 * `value`/`onChange` always deal in the field's canonical value (mm for
 * length fields, raw otherwise) — conversion to/from the display unit
 * happens entirely inside this component, so spec state never has to know
 * which unit the user is currently viewing in.
 */
export function NumberField<T extends string>({
  field,
  value,
  onChange,
  unit,
}: {
  field: FieldSpec<T>;
  value: number;
  onChange: (value: number) => void;
  unit: LengthUnit;
}) {
  const isLength = field.isLength !== false;
  const displayUnit = isLength ? unit : field.unit;
  const displayValue = isLength ? roundForDisplay(fromMm(value, unit), unit) : value;
  const displayStep = isLength ? fromMm(field.step, unit) : field.step;
  const displayMin = isLength && field.min !== undefined ? fromMm(field.min, unit) : field.min;

  function handleChange(raw: number) {
    onChange(isLength ? toMm(raw, unit) : raw);
  }

  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{field.label}</span>
      <span className={styles.fieldInputRow}>
        <input
          className={`${styles.fieldInput} mono`}
          type="number"
          step={displayStep}
          min={displayMin}
          value={displayValue}
          onChange={(event) => handleChange(Number(event.target.value))}
        />
        {displayUnit && <span className={`${styles.fieldUnit} mono`}>{displayUnit}</span>}
      </span>
    </label>
  );
}

const PANEL_LABELS: Record<StructuralPanel, string> = {
  front: "Front",
  back: "Back",
  left: "Left",
  right: "Right",
  bottom: "Bottom",
};

/**
 * Which of the box's 5 structural panels to keep. Each checkbox reads as
 * "include this side" — unchecking it adds that panel to `omitPanels`, which
 * opens up that side and flattens whichever neighboring edges used to
 * interlock with it (handled entirely by the geometry engine, not here).
 */
export function PanelOmissionControl({ value, onChange }: { value: StructuralPanel[]; onChange: (value: StructuralPanel[]) => void }) {
  function toggle(panel: StructuralPanel, keep: boolean) {
    onChange(keep ? value.filter((p) => p !== panel) : [...value, panel]);
  }

  return (
    <div className={styles.panelGrid}>
      {STRUCTURAL_PANELS.map((panel) => (
        <label key={panel} className={styles.panelCheckbox}>
          <input type="checkbox" checked={!value.includes(panel)} onChange={(event) => toggle(panel, event.target.checked)} />
          <span>{PANEL_LABELS[panel]}</span>
        </label>
      ))}
    </div>
  );
}

export function Segmented<T extends string>({
  options,
  labels,
  value,
  onChange,
  ariaLabel,
  columns = 2,
}: {
  options: readonly T[];
  labels: Record<T, string>;
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  /** Grid columns to lay options out in. Defaults to 2 (the original shape-switcher layout). */
  columns?: number;
}) {
  return (
    <div className={styles.segmented} style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }} role="radiogroup" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={value === option}
          className={`${styles.segmentedOption} mono ${value === option ? styles.segmentedOptionActive : ""}`}
          onClick={() => onChange(option)}
        >
          {labels[option]}
        </button>
      ))}
    </div>
  );
}
