"use client";

import { useEffect, useRef, useState } from "react";
import { LENGTH_UNITS, LengthUnit } from "@/lib/units";
import { Segmented } from "./field";
import FeedsPane from "./feeds-pane";
import BoxPane from "./box-pane";
import ReliefPane from "./relief-pane";
import SignPane from "./sign-pane";
import PocketPane from "./pocket-pane";
import styles from "./cnc-tool.module.css";

type Tool = "feeds" | "box" | "relief" | "sign" | "pocket";
const TOOLS: Tool[] = ["feeds", "box", "relief", "sign", "pocket"];
const toolLabels: Record<Tool, string> = { feeds: "F&S", box: "Box", relief: "Relief", sign: "Sign", pocket: "Pocket" };
const toolFullLabels: Record<Tool, string> = {
  feeds: "Feeds & Speeds",
  box: "CNC Box",
  relief: "Corner Relief",
  sign: "Sign / Plaque",
  pocket: "Pocket G-code",
};

const unitLabels: Record<LengthUnit, string> = { mm: "mm", cm: "cm", m: "m", in: "in", ft: "ft" };

/** Fullscreen API vendor fallbacks — Safari (desktop and iPadOS) still needs the webkit-prefixed names. */
interface FullscreenElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void> | void;
}
interface FullscreenDocument extends Document {
  webkitExitFullscreen?: () => Promise<void> | void;
  webkitFullscreenElement?: Element | null;
}

export default function CncTool() {
  const [tool, setTool] = useState<Tool>("feeds");
  const [unit, setUnit] = useState<LengthUnit>("mm");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onFullscreenChange() {
      const doc = document as FullscreenDocument;
      const current = document.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
      setIsFullscreen(current === rootRef.current);
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("webkitfullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", onFullscreenChange);
    };
  }, []);

  async function toggleFullscreen() {
    const doc = document as FullscreenDocument;
    const el = rootRef.current as FullscreenElement | null;
    if (!el) return;
    const current = document.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
    if (current) {
      await (document.exitFullscreen ?? doc.webkitExitFullscreen)?.call(document);
    } else {
      await (el.requestFullscreen ?? el.webkitRequestFullscreen)?.call(el);
    }
  }

  return (
    <div className={styles.root} ref={rootRef}>
      <div className={styles.topBar}>
        <div className={styles.topBarGroup}>
          <span className={`${styles.topBarLabel} mono`}>{toolFullLabels[tool]}</span>
        </div>
        <div className={styles.topBarGroup}>
          <span className={`${styles.topBarLabel} mono`}>units</span>
          <Segmented options={LENGTH_UNITS} labels={unitLabels} value={unit} onChange={setUnit} ariaLabel="Length unit" columns={5} />
          <button type="button" className={`${styles.converterToggle} mono`} onClick={toggleFullscreen}>
            {isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          </button>
        </div>
      </div>

      <div className={styles.workspace}>
        <nav className={styles.shapeRail} aria-label="Tool">
          {TOOLS.map((option) => (
            <button
              key={option}
              type="button"
              className={`${styles.shapeButton} ${tool === option ? styles.shapeButtonActive : ""}`}
              onClick={() => setTool(option)}
              aria-pressed={tool === option}
              title={toolFullLabels[option]}
            >
              <span className={`${styles.shapeButtonLabel} mono`}>{toolLabels[option]}</span>
            </button>
          ))}
        </nav>

        {tool === "feeds" && <FeedsPane unit={unit} />}
        {tool === "box" && <BoxPane unit={unit} />}
        {tool === "relief" && <ReliefPane unit={unit} />}
        {tool === "sign" && <SignPane unit={unit} />}
        {tool === "pocket" && <PocketPane unit={unit} />}
      </div>
    </div>
  );
}
