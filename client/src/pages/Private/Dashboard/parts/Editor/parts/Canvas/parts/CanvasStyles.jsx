import React from "react";

const css = `
.dashboard-canvas {
  position: relative;
  min-height: calc(100vh - 160px);
  border: 1px dashed rgba(148, 163, 184, 0.5);
  background-color: rgba(148, 163, 184, 0.05);
  background-image: radial-gradient(circle, rgba(148, 163, 184, 0.35) 1px, transparent 1px);
  background-size: 20px 20px;
}

.dashboard-canvas .canvas-item {
  border-radius: 16px;
  cursor: grab;
  user-select: none;
  -webkit-user-select: none;
}

.dashboard-canvas .canvas-item:hover {
  box-shadow: 0 0 0 2px rgba(148, 163, 184, 0.7);
}

.dashboard-canvas .canvas-item.is-selected {
  box-shadow: 0 0 0 2px var(--main-color);
}

.dashboard-canvas .canvas-item.is-dragging {
  cursor: grabbing;
  opacity: 0.85;
  z-index: 20;
  box-shadow: 0 0 0 2px var(--main-color), 0 12px 28px rgba(15, 23, 42, 0.18);
}

.dashboard-canvas .canvas-item.is-swap-target {
  box-shadow: 0 0 0 2px var(--main-color);
}

.dashboard-canvas .canvas-drop-preview,
.dashboard-canvas .canvas-push-hint {
  border: 2px dashed var(--main-color);
  border-radius: 16px;
  background: rgba(148, 163, 184, 0.12);
}

.dashboard-canvas .canvas-push-hint {
  z-index: 15;
}

/* Resize handles: corner always visible, edges on hover/selection */
.dashboard-canvas .resize-handle {
  position: absolute;
  z-index: 25;
  touch-action: none;
}

.dashboard-canvas .resize-se {
  right: -5px;
  bottom: -5px;
  width: 14px;
  height: 14px;
  border-radius: 4px;
  background: #fff;
  border: 2px solid rgba(148, 163, 184, 0.9);
  cursor: nwse-resize;
}

.dashboard-canvas .canvas-item:hover .resize-se,
.dashboard-canvas .canvas-item.is-selected .resize-se {
  background: var(--main-color);
  border-color: var(--main-color);
}

.dashboard-canvas .resize-e,
.dashboard-canvas .resize-s {
  opacity: 0;
  border-radius: 4px;
  background: var(--main-color);
}

.dashboard-canvas .resize-e {
  top: 50%;
  right: -4px;
  width: 7px;
  height: 40px;
  margin-top: -20px;
  cursor: ew-resize;
}

.dashboard-canvas .resize-s {
  left: 50%;
  bottom: -4px;
  width: 40px;
  height: 7px;
  margin-left: -20px;
  cursor: ns-resize;
}

.dashboard-canvas .canvas-item:hover .resize-e,
.dashboard-canvas .canvas-item:hover .resize-s,
.dashboard-canvas .canvas-item.is-selected .resize-e,
.dashboard-canvas .canvas-item.is-selected .resize-s {
  opacity: 1;
}

.dark .dashboard-canvas .resize-se {
  background: #0f172a;
}
`;

const CanvasStyles = () => <style>{css}</style>;

export default CanvasStyles;