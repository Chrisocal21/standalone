"use client";

import { ReactNode, useState } from "react";
import { LengthUnit, fromMm, roundForDisplay, toMm } from "@/lib/units";
import styles from "./print-tool.module.css";

/** Same collapsible-section pattern as the laser venture's field.tsx. */
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
  unit: string;
  step: number;
  min?: number;
  isLength?: boolean;
}

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

export function CheckboxField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className={styles.checkboxField}>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>{label}</span>
    </label>
  );
}
