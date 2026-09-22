"use client";

import { useCallback, useRef, useState } from "react";

const MIN_SCALE = 0.25;
const MAX_SCALE = 8;

/**
 * Wheel-to-zoom, drag-to-pan state shared between the SVG lightbox popup and
 * the inline fullscreen canvas — same interaction, two different places to
 * put it. All the handlers are memoized so callers can safely put `reset` in
 * a `useEffect` dependency array (e.g. to snap back to 100% on shape change)
 * without that effect firing on every render.
 *
 * Panning tracks the last pointer position and applies each move as a delta
 * via a functional state update, rather than snapshotting `offset` into a
 * ref on drag start — reading state during render to keep a ref in sync is
 * exactly the pattern React's ref rules now flag.
 */
export function useZoomPan() {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const lastPointer = useRef<{ x: number; y: number } | null>(null);

  const zoomBy = useCallback((factor: number) => {
    setScale((current) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, current * factor)));
  }, []);

  const handleWheel = useCallback(
    (event: React.WheelEvent) => {
      event.preventDefault();
      zoomBy(event.deltaY < 0 ? 1.12 : 1 / 1.12);
    },
    [zoomBy]
  );

  const handlePointerDown = useCallback((event: React.PointerEvent) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    lastPointer.current = { x: event.clientX, y: event.clientY };
    setDragging(true);
  }, []);

  const handlePointerMove = useCallback((event: React.PointerEvent) => {
    if (!lastPointer.current) return;
    const dx = event.clientX - lastPointer.current.x;
    const dy = event.clientY - lastPointer.current.y;
    lastPointer.current = { x: event.clientX, y: event.clientY };
    setOffset((current) => ({ x: current.x + dx, y: current.y + dy }));
  }, []);

  const endDrag = useCallback(() => {
    lastPointer.current = null;
    setDragging(false);
  }, []);

  const reset = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  return { scale, offset, dragging, zoomBy, reset, handleWheel, handlePointerDown, handlePointerMove, endDrag };
}
