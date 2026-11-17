import { GRID_COLS, GRID_MARGIN, ROW_HEIGHT } from "./widgetCatalog";

export const GAP = GRID_MARGIN[0];

export const overlaps = (a, b) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

export const bottomOf = (widgets) => widgets.reduce((max, w) => Math.max(max, w.y + w.h), 0);

// Keeps the fixed widget(s) where they are and moves anything they overlap further down
export const resolveCollisions = (widgets, fixedIds) => {
  const ids = Array.isArray(fixedIds) ? fixedIds : [fixedIds];
  const placed = ids.map((id) => widgets.find((w) => w.id === id)).filter(Boolean);
  const result = new Map(placed.map((w) => [w.id, w]));

  widgets
    .filter((w) => !result.has(w.id))
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .forEach((w) => {
      let current = w;
      let hit = placed.find((p) => overlaps(p, current));
      while (hit) {
        current = { ...current, y: hit.y + hit.h };
        hit = placed.find((p) => overlaps(p, current));
      }
      placed.push(current);
      result.set(current.id, current);
    });

  return widgets.map((w) => result.get(w.id));
};

// Pixel size of one grid step for the grid element on screen
export const getMetrics = (gridEl) => {
  const rect = gridEl.getBoundingClientRect();
  const colWidth = (rect.width - GAP * (GRID_COLS - 1)) / GRID_COLS;
  return { rect, stepX: colWidth + GAP, stepY: ROW_HEIGHT + GRID_MARGIN[1] };
};

export const cellAt = (metrics, clientX, clientY) => ({
  x: Math.floor((clientX - metrics.rect.left) / metrics.stepX),
  y: Math.floor((clientY - metrics.rect.top) / metrics.stepY),
});

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const gridPlacement = (rect) => ({
  gridColumn: `${rect.x + 1} / span ${rect.w}`,
  gridRow: `${rect.y + 1} / span ${rect.h}`,
});