"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./svg-lightbox.module.css";

interface SvgLightboxProps {
  svg: string;
  title: string;
  onClose: () => void;
}

const MIN_SCALE = 0.25;
const MAX_SCALE = 8;

export default function SvgLightbox({ svg, title, onClose }: SvgLightboxProps) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragOrigin = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  function zoomBy(factor: number) {
    setScale((current) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, current * factor)));
  }

  function handleWheel(event: React.WheelEvent) {
    event.preventDefault();
    zoomBy(event.deltaY < 0 ? 1.12 : 1 / 1.12);
  }

  function handlePointerDown(event: React.PointerEvent) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragOrigin.current = { startX: event.clientX, startY: event.clientY, originX: offset.x, originY: offset.y };
    setDragging(true);
  }

  function handlePointerMove(event: React.PointerEvent) {
    if (!dragOrigin.current) return;
    setOffset({
      x: dragOrigin.current.originX + (event.clientX - dragOrigin.current.startX),
      y: dragOrigin.current.originY + (event.clientY - dragOrigin.current.startY),
    });
  }

  function endDrag() {
    dragOrigin.current = null;
    setDragging(false);
  }

  function reset() {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.toolbar} onClick={(event) => event.stopPropagation()}>
        <div className={styles.toolbarLeft}>
          <span className={`${styles.title} mono`}>{title}</span>
          <span className={`${styles.hint} mono`}>scroll to zoom &middot; drag to pan &middot; esc to close</span>
        </div>
        <div className={styles.toolbarActions}>
          <button type="button" className="mono" onClick={() => zoomBy(1 / 1.25)} aria-label="Zoom out">
            &minus;
          </button>
          <span className={`${styles.scaleReadout} mono`}>{Math.round(scale * 100)}%</span>
          <button type="button" className="mono" onClick={() => zoomBy(1.25)} aria-label="Zoom in">
            +
          </button>
          <button type="button" className="mono" onClick={reset}>
            Reset
          </button>
          <button type="button" className="mono" onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      <div
        className={`${styles.stage} ${dragging ? styles.stageDragging : ""}`}
        onClick={(event) => event.stopPropagation()}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
      >
        <div
          className={styles.canvasTransform}
          style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}
        >
          <div className={styles.canvasCard} dangerouslySetInnerHTML={{ __html: svg }} />
        </div>
      </div>
    </div>
  );
}
