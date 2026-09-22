"use client";

import { useEffect, useState } from "react";
import { LENGTH_UNITS, LengthUnit, fromMm, nearestInchFraction, roundForDisplay, toMm } from "@/lib/units";
import styles from "./unit-converter.module.css";

const unitNames: Record<LengthUnit, string> = {
  mm: "Millimeters",
  cm: "Centimeters",
  m: "Meters",
  in: "Inches",
  ft: "Feet",
};

interface UnitConverterProps {
  onClose: () => void;
}

/**
 * A standalone scratch-pad converter — its own local state, unconnected to
 * whatever shape spec is being edited underneath. Opening or closing it
 * never touches the in-progress design; it's here so you can check a
 * conversion mid-build without losing your place.
 */
export default function UnitConverter({ onClose }: UnitConverterProps) {
  const [amount, setAmount] = useState(1);
  const [fromUnit, setFromUnit] = useState<LengthUnit>("mm");

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const mm = Number.isFinite(amount) ? toMm(amount, fromUnit) : 0;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(event) => event.stopPropagation()} role="dialog" aria-label="Unit converter">
        <div className={styles.header}>
          <span className={`${styles.title} mono`}>unit converter</span>
          <button type="button" className={`${styles.closeButton} mono`} onClick={onClose}>
            Close
          </button>
        </div>

        <div className={styles.inputRow}>
          <input
            type="number"
            className={`${styles.amountInput} mono`}
            value={amount}
            onChange={(event) => setAmount(Number(event.target.value))}
          />
          <select
            className={`${styles.unitSelect} mono`}
            value={fromUnit}
            onChange={(event) => setFromUnit(event.target.value as LengthUnit)}
            aria-label="Convert from unit"
          >
            {LENGTH_UNITS.map((u) => (
              <option key={u} value={u}>
                {unitNames[u]}
              </option>
            ))}
          </select>
        </div>

        <ul className={styles.results}>
          {LENGTH_UNITS.map((u) => (
            <li key={u} className={styles.resultRow}>
              <span className={`${styles.resultUnit} mono`}>{unitNames[u]}</span>
              <span className={`${styles.resultValue} mono`}>
                {roundForDisplay(fromMm(mm, u), u)} {u}
              </span>
            </li>
          ))}
        </ul>

        <p className={`${styles.hint} mono`}>nearest fraction: {nearestInchFraction(fromMm(mm, "in"))}</p>
      </div>
    </div>
  );
}
