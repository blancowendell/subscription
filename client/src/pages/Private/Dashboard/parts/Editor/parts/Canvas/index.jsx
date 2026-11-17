import React, { useRef, useState } from "react";
import Widget from "../../../Widgets";
import CanvasStyles from "./parts/CanvasStyles";
import SelectionToolbar from "./parts/SelectionToolbar";
import EmptyCanvas from "./parts/EmptyCanvas";
import {
  GRID_COLS,
  GRID_MARGIN,
  MIN_SIZE,
  ROW_HEIGHT,
  getWidgetType,
} from "../../../../utils/widgetCatalog";
import {
  bottomOf,
  cellAt,
  clamp,
  getMetrics,
  gridPlacement,
  overlaps,
} from "../../../../utils/layoutEngine";

const DRAG_THRESHOLD = 4;
const EXTRA_ROWS = 8;

const HANDLES = [
  { mode: "e", className: "resize-handle resize-e", label: "Resize width" },
  { mode: "s", className: "resize-handle resize-s", label: "Resize height" },
  { mode: "se", className: "resize-handle resize-se", label: "Resize" },
];

// Drag and resize run on pointer events with pointer capture, so the rest of
// the page can't interrupt them.
const Canvas = ({
  widgets,
  selectedId,
  draggingType,
  onSelect,
  onDropWidget,
  onPlace,
  onSwap,
  onResizePreset,
  onDuplicate,
  onRemove,
  onUseTemplate,
}) => {
  const gridRef = useRef(null);
  const dragRef = useRef(null);
  const [preview, setPreview] = useState(null); // { id, rect, swapId }
  const previewRef = useRef(null); // same as preview, readable right away on pointer up
  const [dropPreview, setDropPreview] = useState(null);

  const startDrag = (e, widget, mode) => {
    if (e.button !== undefined && e.button !== 0) return;
    if (mode === "move" && e.target.closest?.(".widget-no-drag")) return;
    if (mode !== "move") e.stopPropagation();

    onSelect(widget.id);
    previewRef.current = null;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragRef.current = {
      id: widget.id,
      type: widget.type,
      mode,
      startX: e.clientX,
      startY: e.clientY,
      origin: { x: widget.x, y: widget.y, w: widget.w, h: widget.h },
      moved: false,
    };
  };

  const handlePointerMove = (e) => {
    const drag = dragRef.current;
    if (!drag || !gridRef.current) return;

    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    drag.moved = true;

    const metrics = getMetrics(gridRef.current);
    const { origin } = drag;
    const min = MIN_SIZE[drag.type] || {};
    let rect = origin;
    let swapId = null;

    if (drag.mode === "move") {
      rect = {
        ...origin,
        x: clamp(origin.x + Math.round(dx / metrics.stepX), 0, GRID_COLS - origin.w),
        y: Math.max(0, origin.y + Math.round(dy / metrics.stepY)),
      };
      const cell = cellAt(metrics, e.clientX, e.clientY);
      const target = widgets.find(
        (w) =>
          w.id !== drag.id &&
          cell.x >= w.x &&
          cell.x < w.x + w.w &&
          cell.y >= w.y &&
          cell.y < w.y + w.h
      );
      swapId = target?.id ?? null;
    } else {
      const w = drag.mode.includes("e")
        ? clamp(origin.w + Math.round(dx / metrics.stepX), min.minW || 1, GRID_COLS - origin.x)
        : origin.w;
      const h = drag.mode.includes("s")
        ? Math.max(min.minH || 1, origin.h + Math.round(dy / metrics.stepY))
        : origin.h;
      rect = { ...origin, w, h };
    }

    const current = previewRef.current;
    const unchanged =
      current &&
      current.id === drag.id &&
      current.swapId === swapId &&
      current.rect.x === rect.x &&
      current.rect.y === rect.y &&
      current.rect.w === rect.w &&
      current.rect.h === rect.h;

    if (!unchanged) {
      previewRef.current = { id: drag.id, rect, swapId };
      setPreview(previewRef.current);
    }
  };

  const finishDrag = (e, cancelled = false) => {
    const drag = dragRef.current;
    dragRef.current = null;
    e.currentTarget.releasePointerCapture?.(e.pointerId);

    const result = previewRef.current;
    previewRef.current = null;
    setPreview(null);
    if (!drag || !drag.moved || cancelled || !result) return;

    if (drag.mode === "move" && result.swapId) {
      onSwap(drag.id, result.swapId);
    } else {
      onPlace(drag.id, result.rect);
    }
  };

  // Widgets dragged in from the library (native drag and drop)
  const handleDragOver = (e) => {
    if (!draggingType || !gridRef.current) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    const size = getWidgetType(draggingType)?.size || { w: 4, h: 4 };
    const cell = cellAt(getMetrics(gridRef.current), e.clientX, e.clientY);
    const rect = {
      x: clamp(cell.x, 0, GRID_COLS - size.w),
      y: Math.max(0, cell.y),
      w: size.w,
      h: size.h,
    };
    setDropPreview((current) =>
      current && current.x === rect.x && current.y === rect.y ? current : rect
    );
  };

  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setDropPreview(null);
  };

  const handleDrop = (e) => {
    if (!draggingType) return;
    e.preventDefault();
    if (dropPreview) onDropWidget(draggingType, dropPreview);
    setDropPreview(null);
  };

  const handleBackgroundPointerDown = (e) => {
    if (e.target === e.currentTarget || e.target === gridRef.current) onSelect(null);
  };

  const rows = bottomOf(widgets) + EXTRA_ROWS;
  const previewCollides =
    preview &&
    !preview.swapId &&
    widgets.some((w) => w.id !== preview.id && overlaps(w, preview.rect));

  return (
    <div
      className="dashboard-canvas relative min-w-0 rounded-2xl p-3"
      onPointerDown={handleBackgroundPointerDown}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <CanvasStyles />

      {widgets.length === 0 && !dropPreview && <EmptyCanvas onUseTemplate={onUseTemplate} />}

      <div
        ref={gridRef}
        className="relative grid"
        style={{
          display: "grid",
          position: "relative",
          gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))`,
          gridAutoRows: `${ROW_HEIGHT}px`,
          gap: `${GRID_MARGIN[1]}px ${GRID_MARGIN[0]}px`,
          minHeight: Math.max(520, rows * (ROW_HEIGHT + GRID_MARGIN[1])),
        }}
      >
        {widgets.map((w) => {
          const isDragging = preview?.id === w.id;
          const rect = isDragging ? preview.rect : w;
          const selected = w.id === selectedId;
          const swapTarget = preview?.swapId === w.id;

          return (
            <div
              key={w.id}
              className={`canvas-item relative ${selected ? "is-selected" : ""} ${
                isDragging ? "is-dragging" : ""
              } ${swapTarget ? "is-swap-target" : ""}`}
              style={{ ...gridPlacement(rect), position: "relative", touchAction: "none" }}
              onPointerDown={(e) => startDrag(e, w, "move")}
              onPointerMove={handlePointerMove}
              onPointerUp={(e) => finishDrag(e)}
              onPointerCancel={(e) => finishDrag(e, true)}
            >
              {/* Visual only while editing so the whole card drags */}
              <div className="h-full w-full pointer-events-none select-none">
                <Widget widget={w} editing />
              </div>

              {swapTarget && (
                <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                  <span
                    className="px-3 py-1 rounded-full text-xs font-semibold shadow"
                    style={{ background: "var(--main-color)", color: "var(--main-text-color)" }}
                  >
                    Drop to swap
                  </span>
                </div>
              )}

              {selected && !preview && (
                <SelectionToolbar
                  widget={w}
                  onResize={onResizePreset}
                  onDuplicate={onDuplicate}
                  onRemove={onRemove}
                />
              )}

              {HANDLES.map((handle) => (
                <span
                  key={handle.mode}
                  role="presentation"
                  aria-label={handle.label}
                  className={handle.className}
                  onPointerDown={(e) => startDrag(e, w, handle.mode)}
                />
              ))}
            </div>
          );
        })}

        {preview && previewCollides && (
          <div
            className="canvas-push-hint pointer-events-none"
            style={gridPlacement(preview.rect)}
          />
        )}

        {dropPreview && (
          <div className="canvas-drop-preview pointer-events-none" style={gridPlacement(dropPreview)} />
        )}
      </div>
    </div>
  );
};

export default Canvas;