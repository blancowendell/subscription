import { createWidget } from "./widgetCatalog";

// Starting layouts. Widgets come without data; the user picks it per widget.
export const TEMPLATES = [
  {
    key: "sales",
    name: "Sales overview",
    description: "Key numbers, a weekly chart, top customers and recent orders",
    widgets: [
      { type: "card", title: "Sales today", x: 0, y: 0, w: 3, h: 3, icon: "peso", settings: { format: "currency" } },
      { type: "card", title: "Open orders", x: 3, y: 0, w: 3, h: 3, icon: "cart" },
      { type: "card", title: "Unpaid invoices", x: 6, y: 0, w: 3, h: 3, icon: "invoice", settings: { lowerIsBetter: true } },
      { type: "card", title: "Collections", x: 9, y: 0, w: 3, h: 3, icon: "receipt", settings: { format: "currency" } },
      { type: "graph", title: "Sales this week", x: 0, y: 3, w: 8, h: 8, variant: "bar" },
      { type: "leaderboard", title: "Top customers", x: 8, y: 3, w: 4, h: 8 },
      { type: "table", title: "Recent orders", x: 0, y: 11, w: 12, h: 7 },
    ],
  },
  {
    key: "operations",
    name: "Operations",
    description: "Status counts, progress per team, daily volume and a team note",
    widgets: [
      { type: "card", title: "Pending", x: 0, y: 0, w: 4, h: 3, icon: "clock" },
      { type: "card", title: "In progress", x: 4, y: 0, w: 4, h: 3, icon: "truck" },
      { type: "card", title: "Completed", x: 8, y: 0, w: 4, h: 3, icon: "check" },
      { type: "progress", title: "Progress by team", x: 0, y: 3, w: 6, h: 7 },
      { type: "graph", title: "Daily volume", x: 6, y: 3, w: 6, h: 7, variant: "line" },
      {
        type: "text",
        title: "Team note",
        x: 0,
        y: 10,
        w: 12,
        h: 3,
        content: "Write reminders or announcements for your team here.",
      },
    ],
  },
  {
    key: "simple",
    name: "Simple",
    description: "Two numbers and one chart",
    widgets: [
      { type: "card", title: "This month", x: 0, y: 0, w: 6, h: 3, icon: "trending" },
      { type: "card", title: "Last month", x: 6, y: 0, w: 6, h: 3, icon: "chart" },
      { type: "graph", title: "Breakdown", x: 0, y: 3, w: 12, h: 8, variant: "doughnut" },
    ],
  },
];

export const buildTemplate = (key) => {
  const template = TEMPLATES.find((t) => t.key === key);
  if (!template) return [];

  return template.widgets.map(({ type, title, x, y, w, h, variant, icon, content, settings }) => {
    const base = createWidget(type, { x, y, w, h });
    return {
      ...base,
      title,
      variant: variant ?? base.variant,
      icon: icon ?? base.icon,
      content: content ?? "",
      settings: { ...base.settings, ...(settings || {}) },
    };
  });
};
