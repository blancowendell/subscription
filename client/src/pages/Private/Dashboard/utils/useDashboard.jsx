import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import DashboardAPI from "../../../../api/private/dashboard/dashboardAPI";
import { GRID_COLS, MIN_SIZE, createWidget, getPresetSize } from "./widgetCatalog";
import { buildTemplate } from "./templates";
import { bottomOf, resolveCollisions } from "./layoutEngine";

const HISTORY_LIMIT = 60;
const DEFAULT_TITLE = "My dashboard";

const clone = (value) => JSON.parse(JSON.stringify(value));

// Accepts the raw API result whether or not it's already unwrapped
const unwrap = (res) => {
  let data = res;
  while (data && !Array.isArray(data.widgets) && data.data) data = data.data;
  return {
    dashboard: data?.dashboard ?? null,
    widgets: Array.isArray(data?.widgets) ? data.widgets : [],
  };
};

const emptyDoc = { title: DEFAULT_TITLE, widgets: [] };

const initialHistory = { doc: emptyDoc, past: [], future: [], lastKey: null };

// Undo/redo over the whole draft (title + widgets).
// Commits with the same coalesce key (typing in one field) become one undo step.
const historyReducer = (state, action) => {
  switch (action.type) {
    case "reset":
      return { doc: action.doc, past: [], future: [], lastKey: null };

    case "commit": {
      const next = action.update(state.doc);
      if (next === state.doc) return state;

      if (action.key && action.key === state.lastKey) {
        return { ...state, doc: next, future: [] };
      }

      return {
        doc: next,
        past: [...state.past, state.doc].slice(-HISTORY_LIMIT),
        future: [],
        lastKey: action.key || null,
      };
    }

    case "undo": {
      if (state.past.length === 0) return state;
      return {
        doc: state.past[state.past.length - 1],
        past: state.past.slice(0, -1),
        future: [state.doc, ...state.future],
        lastKey: null,
      };
    }

    case "redo": {
      if (state.future.length === 0) return state;
      return {
        doc: state.future[0],
        past: [...state.past, state.doc],
        future: state.future.slice(1),
        lastKey: null,
      };
    }

    default:
      return state;
  }
};

const mapWidgets = (doc, fn) => {
  let changed = false;
  const widgets = doc.widgets.map((w) => {
    const next = fn(w);
    if (next !== w) changed = true;
    return next;
  });
  return changed ? { ...doc, widgets } : doc;
};

// Works on one dashboard (one tab). dashboardId = null means the user has none yet.
const useDashboard = (dashboardId) => {
  const [saved, setSaved] = useState(emptyDoc);
  const [loadedId, setLoadedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [history, dispatch] = useReducer(historyReducer, initialHistory);

  const historyRef = useRef(history);
  historyRef.current = history;
  const requestRef = useRef(0);

  const load = useCallback(
    async ({ silent = false } = {}) => {
      const requestId = ++requestRef.current;

      if (!dashboardId) {
        setSaved(emptyDoc);
        setLoadedId(null);
        setLoadError(null);
        setLoading(false);
        return;
      }

      if (!silent) setLoading(true);
      setLoadError(null);
      try {
        const res = await DashboardAPI.loadLayout(dashboardId);
        if (requestId !== requestRef.current) return;
        const { dashboard, widgets } = unwrap(res);
        setSaved({ title: dashboard?.title || DEFAULT_TITLE, widgets });
        setLoadedId(dashboardId);
      } catch (err) {
        if (requestId !== requestRef.current) return;
        console.error("Error loading dashboard:", err);
        setLoadError("Couldn't load this dashboard.");
      } finally {
        if (!silent && requestId === requestRef.current) setLoading(false);
      }
    },
    [dashboardId]
  );

  // Switching tabs closes the editor and loads the other dashboard
  useEffect(() => {
    setEditing(false);
    setSelectedId(null);
    dispatch({ type: "reset", doc: emptyDoc });
    load();
  }, [load]);

  const doc = editing ? history.doc : saved;

  const isDirty = useMemo(
    () => editing && JSON.stringify(history.doc) !== JSON.stringify(saved),
    [editing, history.doc, saved]
  );

  const commit = useCallback((update, key) => dispatch({ type: "commit", update, key }), []);
  const undo = useCallback(() => dispatch({ type: "undo" }), []);
  const redo = useCallback(() => dispatch({ type: "redo" }), []);
  const select = useCallback((id) => setSelectedId(id), []);

  const startEditing = useCallback(() => {
    setSelectedId(null);
    dispatch({ type: "reset", doc: clone(saved) });
    setEditing(true);
  }, [saved]);

  const cancelEditing = useCallback(() => {
    setSelectedId(null);
    dispatch({ type: "reset", doc: emptyDoc });
    setEditing(false);
  }, []);

  const setTitle = useCallback(
    (title) => commit((current) => ({ ...current, title }), "title"),
    [commit]
  );

  // position is set when dropped from the library; otherwise it goes to the bottom
  const addWidget = useCallback(
    (type, position) => {
      const current = historyRef.current.doc.widgets;
      const widget = createWidget(type, position || { x: 0, y: bottomOf(current) });
      commit((doc) => ({
        ...doc,
        widgets: resolveCollisions([...doc.widgets, widget], widget.id),
      }));
      setSelectedId(widget.id);
      return widget.id;
    },
    [commit]
  );

  const duplicateWidget = useCallback(
    (id) => {
      const current = historyRef.current.doc.widgets;
      const source = current.find((w) => w.id === id);
      if (!source) return;

      const copy = {
        ...clone(source),
        id: `new-${uuidv4()}`,
        title: `${source.title || "Widget"} (copy)`,
        y: bottomOf(current),
      };
      commit((doc) => ({ ...doc, widgets: [...doc.widgets, copy] }));
      setSelectedId(copy.id);
    },
    [commit]
  );

  const removeWidget = useCallback(
    (id) => {
      commit((doc) => ({ ...doc, widgets: doc.widgets.filter((w) => w.id !== id) }));
      setSelectedId((current) => (current === id ? null : current));
    },
    [commit]
  );

  const updateWidget = useCallback(
    (id, patch, coalesceKey) =>
      commit(
        (doc) => mapWidgets(doc, (w) => (w.id === id ? { ...w, ...patch } : w)),
        coalesceKey
      ),
    [commit]
  );

  const updateSettings = useCallback(
    (id, patch, coalesceKey) =>
      commit(
        (doc) =>
          mapWidgets(doc, (w) =>
            w.id === id ? { ...w, settings: { ...(w.settings || {}), ...patch } } : w
          ),
        coalesceKey
      ),
    [commit]
  );

  // Moves and/or resizes one widget; anything it lands on moves down
  const placeWidget = useCallback(
    (id, rect) =>
      commit((doc) => {
        const target = doc.widgets.find((w) => w.id === id);
        if (!target) return doc;
        const min = MIN_SIZE[target.type] || {};
        const w = Math.min(GRID_COLS, Math.max(min.minW || 1, rect.w ?? target.w));
        const h = Math.max(min.minH || 1, rect.h ?? target.h);
        const x = Math.min(GRID_COLS - w, Math.max(0, rect.x ?? target.x));
        const y = Math.max(0, rect.y ?? target.y);
        if (x === target.x && y === target.y && w === target.w && h === target.h) return doc;
        const widgets = doc.widgets.map((item) => (item.id === id ? { ...item, x, y, w, h } : item));
        return { ...doc, widgets: resolveCollisions(widgets, id) };
      }),
    [commit]
  );

  const resizeWidget = useCallback(
    (id, presetKey) => {
      const target = historyRef.current.doc.widgets.find((w) => w.id === id);
      const size = target ? getPresetSize(target.type, presetKey) : null;
      if (size) placeWidget(id, size);
    },
    [placeWidget]
  );

  const applyTemplate = useCallback(
    (key) => {
      commit((doc) => ({ ...doc, widgets: buildTemplate(key) }));
      setSelectedId(null);
    },
    [commit]
  );

  // Dropped onto another widget: trade places
  const swapWidgets = useCallback(
    (idA, idB) =>
      commit((doc) => {
        const a = doc.widgets.find((w) => w.id === idA);
        const b = doc.widgets.find((w) => w.id === idB);
        if (!a || !b) return doc;
        const widgets = mapWidgets(doc, (w) => {
          if (w.id === idA) return { ...w, x: Math.min(b.x, GRID_COLS - w.w), y: b.y };
          if (w.id === idB) return { ...w, x: Math.min(a.x, GRID_COLS - w.w), y: a.y };
          return w;
        }).widgets;
        return { ...doc, widgets: resolveCollisions(widgets, [idA, idB]) };
      }),
    [commit]
  );

  // Returns true when something was actually saved
  const save = useCallback(async () => {
    if (!isDirty) {
      cancelEditing();
      return false;
    }

    setSaving(true);
    try {
      const { title, widgets } = historyRef.current.doc;
      const payload = widgets.map(({ id, apiName, apiLabel, apiUnavailable, ...rest }) => rest);

      await DashboardAPI.addWidgets({
        dashboardId,
        title: String(title || "").trim() || DEFAULT_TITLE,
        widgets: payload,
      });
      await load({ silent: true });
      cancelEditing();
      return true;
    } finally {
      setSaving(false);
    }
  }, [isDirty, dashboardId, load, cancelEditing]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    if (!isDirty) return undefined;

    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  const selectedWidget = editing
    ? history.doc.widgets.find((w) => w.id === selectedId) || null
    : null;

  return {
    dashboardId,
    loadedId,
    title: doc.title,
    widgets: doc.widgets,
    loading,
    loadError,
    editing,
    saving,
    isDirty,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    selectedId: selectedWidget ? selectedId : null,
    selectedWidget,
    select,
    reload: load,
    startEditing,
    cancelEditing,
    save,
    undo,
    redo,
    setTitle,
    addWidget,
    duplicateWidget,
    removeWidget,
    updateWidget,
    updateSettings,
    resizeWidget,
    placeWidget,
    swapWidgets,
    applyTemplate,
  };
};

export default useDashboard;