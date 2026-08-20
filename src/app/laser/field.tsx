"use client";

import styles from "./box-tool.module.css";

export interface FieldSpec<T extends string> {
  key: T;
  label: string;
  unit: string;
  step: number;
  min?: number;
}

export function NumberField<T extends string>({
  field,
  value,
  onChange,
}: {
  field: FieldSpec<T>;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{field.label}</span>
      <span className={styles.fieldInputRow}>
        <input
          className={`${styles.fieldInput} mono`}
          type="number"
          step={field.step}
          min={field.min}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        {field.unit && <span className={`${styles.fieldUnit} mono`}>{field.unit}</span>}
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
}: {
  options: readonly T[];
  labels: Record<T, string>;
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
}) {
  return (
    <div className={styles.segmented} role="radiogroup" aria-label={ariaLabel}>
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
