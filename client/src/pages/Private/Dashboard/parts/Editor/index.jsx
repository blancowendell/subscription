import React, { useEffect, useState } from "react";
import TopBar from "./parts/TopBar";
import Library from "./parts/Library";
import Canvas from "./parts/Canvas";
import Inspector from "./parts/Inspector";
import Viewer from "../Viewer";

const isTyping = (target) =>
  ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName) ||
  target?.isContentEditable ||
  target?.getAttribute?.("role") === "combobox";

const Editor = ({ dashboard, onSave, onDelete }) => {
  const [mode, setMode] = useState("edit");
  const [device, setDevice] = useState("desktop");
  const [draggingType, setDraggingType] = useState(null);

  // Ctrl+S save, Ctrl+Z/Y undo/redo, Ctrl+D duplicate, Delete remove, Esc deselect
  useEffect(() => {
    const onKeyDown = (e) => {
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      if (mod && key === "s") {
        e.preventDefault();
        onSave();
        return;
      }

      if (mode !== "edit" || isTyping(e.target)) return;

      if (mod && key === "z" && !e.shiftKey) {
        e.preventDefault();
        dashboard.undo();
      } else if (mod && (key === "y" || (key === "z" && e.shiftKey))) {
        e.preventDefault();
        dashboard.redo();
      } else if (mod && key === "d" && dashboard.selectedId) {
        e.preventDefault();
        dashboard.duplicateWidget(dashboard.selectedId);
      } else if ((key === "delete" || key === "backspace") && dashboard.selectedId) {
        e.preventDefault();
        dashboard.removeWidget(dashboard.selectedId);
      } else if (key === "escape") {
        dashboard.select(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mode, dashboard, onSave]);

  const handleDropWidget = (type, item) => {
    dashboard.addWidget(type, { x: item.x, y: item.y, w: item.w, h: item.h });
    setDraggingType(null);
  };

  return (
    <div className="flex flex-col gap-3 w-full min-w-0">
      <TopBar
        title={dashboard.title}
        onTitleChange={dashboard.setTitle}
        canUndo={dashboard.canUndo}
        canRedo={dashboard.canRedo}
        onUndo={dashboard.undo}
        onRedo={dashboard.redo}
        mode={mode}
        onModeChange={setMode}
        device={device}
        onDeviceChange={setDevice}
        isDirty={dashboard.isDirty}
        saving={dashboard.saving}
        onDiscard={dashboard.cancelEditing}
        onSave={onSave}
        onDelete={onDelete}
      />

      {mode === "preview" ? (
        device === "phone" ? (
          <div className="mx-auto w-[390px] max-w-full rounded-[32px] border-[10px] border-gray-800 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 p-3">
            <Viewer widgets={dashboard.widgets} stacked canEdit={false} />
          </div>
        ) : (
          <Viewer widgets={dashboard.widgets} canEdit={false} />
        )
      ) : (
        <div className="grid grid-cols-[190px_minmax(0,1fr)_280px] gap-3 items-start min-w-0">
          <div className="sticky top-[68px] max-h-[calc(100vh-88px)] overflow-y-auto">
            <Library
              hasWidgets={dashboard.widgets.length > 0}
              onAdd={(type) => dashboard.addWidget(type)}
              onDragStart={setDraggingType}
              onDragEnd={() => setDraggingType(null)}
              onUseTemplate={dashboard.applyTemplate}
            />
          </div>

          <Canvas
            widgets={dashboard.widgets}
            selectedId={dashboard.selectedId}
            draggingType={draggingType}
            onSelect={dashboard.select}
            onDropWidget={handleDropWidget}
            onPlace={dashboard.placeWidget}
            onSwap={dashboard.swapWidgets}
            onResizePreset={dashboard.resizeWidget}
            onDuplicate={dashboard.duplicateWidget}
            onRemove={dashboard.removeWidget}
            onUseTemplate={dashboard.applyTemplate}
          />

          <div className="sticky top-[68px] max-h-[calc(100vh-88px)] overflow-y-auto">
            <Inspector
              widget={dashboard.selectedWidget}
              onUpdate={dashboard.updateWidget}
              onUpdateSettings={dashboard.updateSettings}
              onResize={dashboard.resizeWidget}
              onDuplicate={dashboard.duplicateWidget}
              onRemove={dashboard.removeWidget}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Editor;