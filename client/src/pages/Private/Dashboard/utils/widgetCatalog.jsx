import { v4 as uuidv4 } from "uuid";
import {
  TbHash,
  TbChartBar,
  TbTable,
  TbListNumbers,
  TbProgress,
  TbNote,
  TbChartLine,
  TbChartPie,
  TbChartDonut,
  TbCurrencyPeso,
  TbShoppingCart,
  TbFileInvoice,
  TbReceipt,
  TbPackage,
  TbBuildingWarehouse,
  TbTruck,
  TbUsers,
  TbTrendingUp,
  TbCircleCheck,
  TbClock,
  TbAlertTriangle,
} from "react-icons/tb";

export const GRID_COLS = 12;
export const ROW_HEIGHT = 40;
export const GRID_MARGIN = [16, 16];

// Type values match the backend widget types
export const WIDGET_TYPES = [
  {
    type: "card",
    label: "Number",
    description: "One big number, like sales today",
    icon: TbHash,
    title: "New number",
    size: { w: 3, h: 3 },
    variant: "",
    defaultIcon: "trending",
    settings: { aggregate: "auto", format: "number" },
  },
  {
    type: "graph",
    label: "Chart",
    description: "Bar, line or pie chart",
    icon: TbChartBar,
    title: "New chart",
    size: { w: 6, h: 7 },
    variant: "bar",
    defaultIcon: "",
    settings: { format: "number" },
  },
  {
    type: "table",
    label: "Table",
    description: "Rows and columns of data",
    icon: TbTable,
    title: "New table",
    size: { w: 6, h: 7 },
    variant: "",
    defaultIcon: "",
    settings: { source: "system" },
  },
  {
    type: "leaderboard",
    label: "Top list",
    description: "Highest values ranked, like top customers",
    icon: TbListNumbers,
    title: "New top list",
    size: { w: 4, h: 7 },
    variant: "",
    defaultIcon: "",
    settings: { limit: 5, format: "number" },
  },
  {
    type: "progress",
    label: "Progress",
    description: "Bars showing how far along each item is",
    icon: TbProgress,
    title: "New progress",
    size: { w: 4, h: 6 },
    variant: "",
    defaultIcon: "",
    settings: { limit: 8, format: "number" },
  },
  {
    type: "text",
    label: "Note",
    description: "A heading, reminder or announcement",
    icon: TbNote,
    title: "New note",
    size: { w: 4, h: 3 },
    variant: "",
    defaultIcon: "",
    settings: {},
  },
];

export const MIN_SIZE = {
  card: { minW: 2, minH: 2 },
  graph: { minW: 3, minH: 4 },
  table: { minW: 3, minH: 4 },
  leaderboard: { minW: 3, minH: 4 },
  progress: { minW: 3, minH: 3 },
  text: { minW: 2, minH: 2 },
};

export const getWidgetType = (type) => WIDGET_TYPES.find((item) => item.type === type);

// One-click sizes for users who don't want to drag the corner
export const SIZE_PRESETS = [
  { key: "S", label: "Small", w: 3 },
  { key: "M", label: "Medium", w: 6 },
  { key: "L", label: "Large", w: 8 },
  { key: "FULL", label: "Full width", w: 12 },
];

const PRESET_HEIGHTS = {
  card: { S: 3, M: 3, L: 3, FULL: 3 },
  text: { S: 3, M: 3, L: 4, FULL: 3 },
  default: { S: 6, M: 7, L: 8, FULL: 8 },
};

export const getPresetSize = (type, key) => {
  const preset = SIZE_PRESETS.find((p) => p.key === key);
  if (!preset) return null;
  const heights = PRESET_HEIGHTS[type] || PRESET_HEIGHTS.default;
  const min = MIN_SIZE[type] || {};
  return {
    w: Math.max(preset.w, min.minW || 1),
    h: Math.max(heights[key], min.minH || 1),
  };
};

export const getActivePreset = (widget) =>
  SIZE_PRESETS.find((p) => p.w === widget.w)?.key ?? null;

export const CHART_TYPES = [
  { value: "bar", label: "Bar", icon: TbChartBar },
  { value: "line", label: "Line", icon: TbChartLine },
  { value: "pie", label: "Pie", icon: TbChartPie },
  { value: "doughnut", label: "Donut", icon: TbChartDonut },
];

export const COLORS = [
  { key: "blue", label: "Blue", main: "#378ADD", soft: "rgba(55, 138, 221, 0.12)" },
  { key: "teal", label: "Teal", main: "#1D9E75", soft: "rgba(29, 158, 117, 0.12)" },
  { key: "purple", label: "Purple", main: "#7F77DD", soft: "rgba(127, 119, 221, 0.14)" },
  { key: "coral", label: "Coral", main: "#D85A30", soft: "rgba(216, 90, 48, 0.12)" },
  { key: "amber", label: "Amber", main: "#EF9F27", soft: "rgba(239, 159, 39, 0.14)" },
  { key: "green", label: "Green", main: "#639922", soft: "rgba(99, 153, 34, 0.13)" },
  { key: "red", label: "Red", main: "#E24B4A", soft: "rgba(226, 75, 74, 0.12)" },
  { key: "gray", label: "Gray", main: "#888780", soft: "rgba(136, 135, 128, 0.14)" },
];

export const getColor = (key) => COLORS.find((c) => c.key === key) || COLORS[0];

// Distinct colors for pie/donut slices
export const SLICE_COLORS = [
  "#378ADD",
  "#1D9E75",
  "#EF9F27",
  "#7F77DD",
  "#D85A30",
  "#639922",
  "#D4537E",
  "#888780",
];

export const ICON_OPTIONS = [
  { key: "trending", label: "Trend", icon: TbTrendingUp },
  { key: "peso", label: "Money", icon: TbCurrencyPeso },
  { key: "cart", label: "Orders", icon: TbShoppingCart },
  { key: "invoice", label: "Invoice", icon: TbFileInvoice },
  { key: "receipt", label: "Receipt", icon: TbReceipt },
  { key: "package", label: "Product", icon: TbPackage },
  { key: "warehouse", label: "Warehouse", icon: TbBuildingWarehouse },
  { key: "truck", label: "Delivery", icon: TbTruck },
  { key: "users", label: "People", icon: TbUsers },
  { key: "chart", label: "Chart", icon: TbChartBar },
  { key: "check", label: "Done", icon: TbCircleCheck },
  { key: "clock", label: "Pending", icon: TbClock },
  { key: "alert", label: "Warning", icon: TbAlertTriangle },
];

export const getIcon = (key) => ICON_OPTIONS.find((i) => i.key === key)?.icon || null;

export const FORMAT_OPTIONS = [
  { value: "number", label: "Number (1,234)" },
  { value: "currency", label: "Peso (₱1,234)" },
  { value: "percent", label: "Percent (12%)" },
];

export const AGGREGATE_OPTIONS = [
  { value: "auto", label: "Automatic" },
  { value: "sum", label: "Total" },
  { value: "average", label: "Average" },
  { value: "count", label: "Number of rows" },
  { value: "max", label: "Highest" },
  { value: "min", label: "Lowest" },
  { value: "first", label: "First value" },
];

export const REFRESH_OPTIONS = [
  { value: 0, label: "Off" },
  { value: 30, label: "Every 30 seconds" },
  { value: 60, label: "Every minute" },
  { value: 300, label: "Every 5 minutes" },
];

export const createWidget = (type, position = {}) => {
  const meta = getWidgetType(type) || WIDGET_TYPES[0];

  return {
    id: `new-${uuidv4()}`,
    type: meta.type,
    title: meta.title,
    x: position.x ?? 0,
    y: position.y ?? 0,
    w: position.w ?? meta.size.w,
    h: position.h ?? meta.size.h,
    apiId: null,
    apiName: null,
    apiLabel: null,
    apiUnavailable: false,
    variant: meta.variant,
    icon: meta.defaultIcon,
    content: "",
    param: "",
    tableColumns: [],
    tableData: [],
    refreshInterval: null,
    settings: { color: "blue", ...meta.settings },
  };
};
