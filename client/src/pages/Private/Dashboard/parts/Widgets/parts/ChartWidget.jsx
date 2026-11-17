import React, { useEffect, useMemo, useState } from "react";
import { Bar, Line, Pie, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import WidgetCard from "./WidgetCard";
import { SLICE_COLORS } from "../../../utils/widgetCatalog";
import { formatValue, toNumber } from "../../../utils/formatters";
import { withAlpha } from "../../../utils/colors";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler
);

const MAX_POINTS = 30;

const CHARTS = { bar: Bar, line: Line, pie: Pie, doughnut: Doughnut };

const useIsDark = () => {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));

  useEffect(() => {
    const observer = new MutationObserver(() =>
      setDark(document.documentElement.classList.contains("dark"))
    );
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return dark;
};

const ChartWidget = ({ widget, rows, settings, color, icon, valueField, labelField }) => {
  const isDark = useIsDark();
  const type = CHARTS[widget.variant] ? widget.variant : "bar";
  const ChartComponent = CHARTS[type];
  const isRound = type === "pie" || type === "doughnut";
  const format = settings.format || "number";

  const data = useMemo(() => {
    const points = rows.slice(0, MAX_POINTS);
    const labels = points.map((row, i) =>
      labelField && row?.[labelField] !== undefined && row?.[labelField] !== null
        ? String(row[labelField])
        : `#${i + 1}`
    );
    const values = points.map((row) => toNumber(row?.[valueField]) ?? 0);

    const peak = Math.max(...values, 0);
    let dataset;

    if (isRound) {
      dataset = {
        data: values,
        backgroundColor: values.map((_, i) => SLICE_COLORS[i % SLICE_COLORS.length]),
        hoverOffset: 6,
        borderWidth: 2,
        borderColor: isDark ? "#0f172a" : "#ffffff",
        borderRadius: 4,
      };
    } else if (type === "line") {
      dataset = {
        data: values,
        borderColor: color.main,
        borderWidth: 2.5,
        // Fade the area under the line from the widget color to clear
        backgroundColor: (context) => {
          const { ctx, chartArea } = context.chart;
          if (!chartArea) return withAlpha(color.main, 0.15);
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, withAlpha(color.main, 0.3));
          gradient.addColorStop(1, withAlpha(color.main, 0));
          return gradient;
        },
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointBackgroundColor: isDark ? "#0f172a" : "#ffffff",
        pointBorderColor: color.main,
        pointBorderWidth: 2,
        pointHoverRadius: 6,
      };
    } else {
      // The highest bar is solid; the rest are lighter so the peak stands out
      dataset = {
        data: values,
        backgroundColor: values.map((v) =>
          v === peak && peak > 0 ? color.main : withAlpha(color.main, 0.45)
        ),
        hoverBackgroundColor: color.main,
        borderRadius: 8,
        borderSkipped: false,
        maxBarThickness: 44,
      };
    }

    return { labels, datasets: [{ label: widget.title, ...dataset }] };
  }, [rows, labelField, valueField, isRound, type, color, widget.title, isDark]);

  const options = useMemo(() => {
    const text = isDark ? "#94a3b8" : "#64748b";
    const grid = isDark ? "rgba(148, 163, 184, 0.15)" : "rgba(100, 116, 139, 0.12)";

    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 300 },
      cutout: type === "doughnut" ? "65%" : undefined,
      plugins: {
        legend: {
          display: isRound,
          position: "bottom",
          labels: { color: text, boxWidth: 10, boxHeight: 10, usePointStyle: true },
        },
        tooltip: {
          backgroundColor: isDark ? "#1e293b" : "#111827",
          padding: 10,
          cornerRadius: 8,
          displayColors: false,
          titleFont: { weight: "600" },
          callbacks: {
            label: (ctx) => {
              const v = typeof ctx.parsed === "number" ? ctx.parsed : ctx.parsed?.y;
              return ` ${ctx.label}: ${formatValue(v, format)}`;
            },
          },
        },
      },
      scales: isRound
        ? undefined
        : {
            x: {
              grid: { display: false },
              ticks: { color: text, maxRotation: 0, autoSkip: true },
              border: { display: false },
            },
            y: {
              beginAtZero: true,
              grid: { color: grid },
              ticks: { color: text, callback: (v) => formatValue(v, format, { compact: true }) },
              border: { display: false },
            },
          },
    };
  }, [isDark, isRound, type, format]);

  return (
    <WidgetCard title={widget.title} icon={icon} color={color}>
      <div className="relative h-full w-full min-h-0">
        <ChartComponent data={data} options={options} />
      </div>
    </WidgetCard>
  );
};

export default ChartWidget;