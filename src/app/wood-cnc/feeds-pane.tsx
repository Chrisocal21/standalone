"use client";

import { useMemo, useState } from "react";
import { computeFeedsAndSpeeds, recommendedChipLoadMm, validateFeedsAndSpeedsInput } from "@/lib/feeds-and-speeds";
import { fromMm, LengthUnit, roundForDisplay } from "@/lib/units";
import FeedsControls, { CncInputState, DEFAULT_CNC_INPUT } from "./feeds-controls";
import styles from "./cnc-tool.module.css";

function formatRate(mmPerMin: number, unit: LengthUnit): string {
  const perMin = roundForDisplay(fromMm(mmPerMin, unit), unit);
  return `${perMin} ${unit}/min`;
}

export default function FeedsPane({ unit }: { unit: LengthUnit }) {
  const [input, setInput] = useState<CncInputState>(DEFAULT_CNC_INPUT);

  const errors = useMemo(() => validateFeedsAndSpeedsInput(input), [input]);
  const recommended = useMemo(() => recommendedChipLoadMm(input.material, input.bitDiameterMm), [input.material, input.bitDiameterMm]);
  const result = useMemo(() => (errors.length === 0 ? computeFeedsAndSpeeds(input) : null), [input, errors]);

  const chipLoadInRange = result !== null && input.chipLoadMm >= recommended.min * 0.9 && input.chipLoadMm <= recommended.max * 1.1;

  return (
    <>
      <section className={styles.resultsPane} aria-label="Feeds and speeds results">
        <div className={styles.resultsHead}>
          <h2 className={`${styles.sectionLabel} mono`}>results</h2>
          <span className={`${styles.hintText} mono`} style={{ marginTop: 0 }}>
            nearest bit-size bucket: {roundForDisplay(fromMm(recommended.bucketMm, unit), unit)}
            {unit}
          </span>
        </div>

        {result ? (
          <>
            <div className={styles.statGrid}>
              <div className={`${styles.statCard} ${styles.statCardHighlight}`}>
                <span className={`${styles.statLabel} mono`}>feed rate</span>
                <span className={`${styles.statValue} mono`}>{formatRate(result.feedRateMmMin, unit)}</span>
                <span className={`${styles.statSub} mono`}>horizontal travel speed</span>
              </div>
              <div className={styles.statCard}>
                <span className={`${styles.statLabel} mono`}>plunge rate</span>
                <span className={`${styles.statValue} mono`}>{formatRate(result.plungeRateMmMin, unit)}</span>
                <span className={`${styles.statSub} mono`}>~40% of feed rate</span>
              </div>
              <div className={styles.statCard}>
                <span className={`${styles.statLabel} mono`}>effective chip load</span>
                <span className={`${styles.statValue} mono`}>
                  {roundForDisplay(fromMm(result.effectiveChipLoadMm, unit), unit)} {unit}
                </span>
                <span className={`${styles.statSub} mono`}>after chip-thinning compensation</span>
              </div>
              <div className={styles.statCard}>
                <span className={`${styles.statLabel} mono`}>chip thinning factor</span>
                <span className={`${styles.statValue} mono`}>{result.chipThinningFactor.toFixed(2)}x</span>
                <span className={`${styles.statSub} mono`}>1.00x = no compensation needed</span>
              </div>
              <div className={styles.statCard}>
                <span className={`${styles.statLabel} mono`}>surface speed</span>
                <span className={`${styles.statValue} mono`}>{result.surfaceSpeedMMin.toFixed(0)} m/min</span>
                <span className={`${styles.statSub} mono`}>bit edge velocity</span>
              </div>
              <div className={styles.statCard}>
                <span className={`${styles.statLabel} mono`}>material removal rate</span>
                <span className={`${styles.statValue} mono`}>{(result.materialRemovalRateMm3Min / 1000).toFixed(1)} cm&sup3;/min</span>
                <span className={`${styles.statSub} mono`}>feed &times; stepover &times; depth</span>
              </div>
            </div>

            <p className={styles.rangeNote}>
              Recommended chip load for {input.material} at the nearest standard bit size (
              {roundForDisplay(fromMm(recommended.bucketMm, unit), unit)}
              {unit}): {roundForDisplay(fromMm(recommended.min, unit), unit)}&ndash;{roundForDisplay(fromMm(recommended.max, unit), unit)} {unit}
              /tooth. {chipLoadInRange ? "Your chip load is within that range." : "Your chip load is outside that range — check it before cutting."}{" "}
              These ranges are a rough starting point from published router-bit charts, not a substitute for your bit manufacturer&rsquo;s own data
              or a test cut.
            </p>
          </>
        ) : (
          <p className={`${styles.hintText} mono`}>fix the parameters to the right to see results</p>
        )}

        {errors.length > 0 && (
          <ul className={styles.errors}>
            {errors.map((error) => (
              <li key={error} className="mono">
                {error}
              </li>
            ))}
          </ul>
        )}
      </section>

      <aside className={styles.dock} aria-label="Cut parameters">
        <FeedsControls input={input} setInput={setInput} unit={unit} />
      </aside>
    </>
  );
}
