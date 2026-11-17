import React, { useMemo } from "react";
import { Line, Bar, Pie, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler
);

const percentagePlugin = {
  id: "percentagePlugin",
  afterDraw(chart) {
    const isDarkMode = document.documentElement.classList.contains("dark");
    const { ctx } = chart;
    const dataset = chart.data.datasets[0];
    const total = dataset.data.reduce((a, b) => a + b, 0);
    if (!total) return;

    chart.getDatasetMeta(0).data.forEach((element, index) => {
      const value = dataset.data[index];
      if (!value) return;

      const percent = ((value / total) * 100).toFixed(1) + "%";
      const { x, y } = element.tooltipPosition();

      ctx.save();
      // Set text color based on theme
      ctx.fillStyle = isDarkMode ? "#ffffff" : "#1e293b";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(percent, x, y);
      ctx.restore();
    });
  },
};

const generateRandomColor = () => {
  const hue = Math.floor(Math.random() * 360);
  return {
    border: `hsl(${hue}, 70%, 50%)`,
    fill: `hsla(${hue}, 70%, 50%, 0.15)`,
    solid: `hsl(${hue}, 70%, 50%)`,
  };
};

const ChartPlaceholder = ({
  height = 200,
  title = "",
  data = [],
  chartType = "line",
  trendLabel = "",
}) => {
  const isDarkMode = document.documentElement.classList.contains("dark");
  const isCircular = chartType === "pie" || chartType === "doughnut";

  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-md p-4 transition-colors">
        <div
          className="flex items-center justify-center text-gray-400 dark:text-gray-600"
          style={{ height }}
        >
          No data available
        </div>
      </div>
    );
  }

  const randomColor = useMemo(
    () => (!isCircular ? generateRandomColor() : null),
    [isCircular]
  );

  let percent = 0;
  let isUptrend = true;

  if (!isCircular && data.length >= 2) {
    const prev = parseFloat(data[data.length - 2]?.value);
    const curr = parseFloat(data[data.length - 1]?.value);

    if (!Number.isNaN(prev) && !Number.isNaN(curr)) {
      const diff = curr - prev;
      isUptrend = diff >= 0;

      if (prev === 0 && curr > 0) {
        percent = 100;
      } else if (prev !== 0) {
        percent = Math.abs(((diff / prev) * 100).toFixed(1));
      }
    }
  }

  const chartData = isCircular
    ? {
        labels: data.map((d) => d.name),
        datasets: [
          {
            data: data.map((d) => parseFloat(d.value) || 0),
            backgroundColor: [
              "rgba(34,197,94,0.85)",
              "rgba(59,130,246,0.85)",
              "rgba(239,68,68,0.85)",
              "rgba(234,179,8,0.85)",
              "rgba(168,85,247,0.85)",
            ],
            borderWidth: isDarkMode ? 2 : 0,
            borderColor: isDarkMode ? "#0f172a" : "#ffffff",
          },
        ],
      }
    : {
        labels: data.map((d) => d.name),
        datasets: [
          {
            data: data.map((d) => parseFloat(d.value) || 0),
            borderColor: randomColor.border,
            backgroundColor:
              chartType === "bar"
                ? randomColor.solid
                : randomColor.fill,
            fill: chartType === "area",
            tension: 0.4,
            pointRadius: 3,
            pointBackgroundColor: randomColor.border,
          },
        ],
      };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: isCircular ? {} : {
      y: {
        grid: {
          color: isDarkMode ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)",
        },
        ticks: {
          color: isDarkMode ? "#94a3b8" : "#64748b",
        }
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: isDarkMode ? "#94a3b8" : "#64748b",
        }
      }
    },
    plugins: {
      legend: {
        display: isCircular,
        position: "bottom",
        labels: {
          color: isDarkMode ? "#cbd5e1" : "#334155",
        }
      },
      tooltip: {
        backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
        titleColor: isDarkMode ? "#f8fafc" : "#1e293b",
        bodyColor: isDarkMode ? "#cbd5e1" : "#475569",
        borderColor: isDarkMode ? "#334155" : "#e2e8f0",
        borderWidth: 1,
      }
    },
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md p-4 transition-colors">
      {title && (
        <div className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
          {title}
        </div>
      )}

      {!isCircular && trendLabel && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {trendLabel}
          </span>

          <span
            className={`text-xs font-semibold ${
              percent === 0
                ? "text-gray-500"
                : isUptrend
                ? "text-green-600 dark:text-green-400"
                : "text-red-600 dark:text-red-400"
            }`}
          >
            {percent === 0 ? "— 0%" : isUptrend ? "▲" : "▼"} {percent}%
          </span>
        </div>
      )}

      <div style={{ height }}>
        {chartType === "bar" && <Bar data={chartData} options={options} />}
        {chartType === "line" && <Line data={chartData} options={options} />}
        {chartType === "area" && <Line data={chartData} options={options} />}
        {chartType === "pie" && (
          <Pie data={chartData} options={options} plugins={[percentagePlugin]} />
        )}
        {chartType === "doughnut" && (
          <Doughnut
            data={chartData}
            options={options}
            plugins={[percentagePlugin]}
          />
        )}
      </div>
    </div>
  );
};

export default ChartPlaceholder;