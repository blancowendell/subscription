import React, { useMemo } from "react";
import WidgetCard from "./parts/WidgetCard";
import NumberWidget from "./parts/NumberWidget";
import ChartWidget from "./parts/ChartWidget";
import TableWidget from "./parts/TableWidget";
import TopListWidget from "./parts/TopListWidget";
import ProgressWidget from "./parts/ProgressWidget";
import NoteWidget from "./parts/NoteWidget";
import useWidgetData, { describeFields, pickFields } from "../../utils/useWidgetData";
import { getColor, getIcon } from "../../utils/widgetCatalog";

const NEEDS_NUMBER = ["card", "graph", "leaderboard", "progress"];

const COMPONENTS = {
  card: NumberWidget,
  graph: ChartWidget,
  table: TableWidget,
  leaderboard: TopListWidget,
  progress: ProgressWidget,
};

// Typed-in tables are saved as headers + array rows
export const toRows = (columns, data) =>
  (Array.isArray(data) ? data : []).map((row) => {
    if (row && !Array.isArray(row) && typeof row === "object") return row;
    const obj = {};
    (columns || []).forEach((col, i) => {
      obj[col] = Array.isArray(row) ? row[i] : "";
    });
    return obj;
  });

const NO_ACCESS = "You don't have access to this information.";

const Widget = ({ widget, editing = false }) => {
  const settings = widget.settings || {};
  const color = getColor(settings.color);
  const icon = getIcon(widget.icon);

  const isManualTable =
    widget.type === "table" &&
    (settings.source === "manual" ||
      (!settings.source && !widget.apiName && (widget.tableColumns || []).length > 0));

  // A source this role may not use is never requested
  const usesApi =
    widget.type !== "text" &&
    !isManualTable &&
    Boolean(widget.apiName) &&
    !widget.apiUnavailable &&
    !widget.apiRestricted;

  // Always called so hook order never changes
  const data = useWidgetData(usesApi ? widget.apiName : null, widget.refreshInterval);

  const manualRows = useMemo(
    () => (isManualTable ? toRows(widget.tableColumns, widget.tableData) : []),
    [isManualTable, widget.tableColumns, widget.tableData]
  );

  const rows = isManualTable ? manualRows : data.rows;
  const fields = useMemo(
    () => (isManualTable ? describeFields(manualRows) : data.fields),
    [isManualTable, manualRows, data.fields]
  );
  const picked = useMemo(() => pickFields(fields, settings), [fields, settings]);

  const stateCard = (state, message, onRetry) => (
    <WidgetCard
      title={widget.title}
      icon={icon}
      color={color}
      state={state}
      message={message}
      onRetry={onRetry}
    />
  );

  const noAccessCard = () =>
    stateCard("locked", editing ? `${NO_ACCESS} Pick another on the right.` : NO_ACCESS);

  if (widget.type === "text") {
    return <NoteWidget widget={widget} color={color} icon={icon} editing={editing} />;
  }

  if (widget.apiUnavailable) {
    return stateCard(
      "error",
      editing
        ? "This information is no longer available. Pick another on the right."
        : "This information is no longer available."
    );
  }

  // Access removed before the dashboard loaded
  if (!isManualTable && widget.apiRestricted) return noAccessCard();

  if (!isManualTable && !widget.apiName) {
    return stateCard(
      "setup",
      editing ? "Pick what information to show on the right." : "This widget isn't set up yet."
    );
  }

  if (!isManualTable && data.loading) return stateCard("loading");

  // Access removed while the dashboard was open: retrying won't help
  if (!isManualTable && data.restricted) return noAccessCard();

  if (!isManualTable && data.error) return stateCard("error", data.error, data.reload);
  if (rows.length === 0) return stateCard("empty", "Nothing to show yet.");

  if (NEEDS_NUMBER.includes(widget.type) && !picked.valueField) {
    return stateCard("empty", "This information has no numbers to show.");
  }

  const Component = COMPONENTS[widget.type];
  if (!Component) return stateCard("error", "This widget type isn't supported.");

  return (
    <Component
      widget={widget}
      rows={rows}
      fields={fields}
      settings={settings}
      color={color}
      icon={icon}
      {...picked}
    />
  );
};

export default Widget;