"use client";

import { useEffect } from "react";
import { useZoomPan } from "./use-zoom-pan";
import styles from "./svg-lightbox.module.css";

interface SvgLightboxProps {
  svg: string;
  title: string;
  onClose: () => void;
}

export default function SvgLightbox({ svg, title, onClose }: SvgLightboxProps) {
  const { scale, offset, dragging, zoomBy, reset, handleWheel, handlePointerDown, handlePointerMove, endDrag } = useZoomPan();

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
