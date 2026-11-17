import React from "react";
import { TbLayoutDashboard } from "react-icons/tb";
import heroBackground from "../../../../../assets/images/brand.png";
import DashboardTabs from "../Tabs";
import DateFilter from "./parts/DateFilter";
import { btnPrimary } from "../../utils/buttonStyles";

// Subtitle for each day, Sunday first (matches Date.getDay()).
// Monday to Saturday spell the word below; each first letter takes its accent color.
// To customize: replace the mottos so their first letters spell your own word.
const DAILY_MOTTOS = [
  { text: "Rest Day" },
  { text: "Start Strong", letterClass: "text-[#E53935]" },
  { text: "Aim Higher", letterClass: "text-[#FB8C00]" },
  { text: "Make It Count", letterClass: "text-[#F5B400]" },
  { text: "Progress over Perfection", letterClass: "text-[#43A047]" },
  { text: "Learn Something New", letterClass: "text-[#1E6FD9]" },
  { text: "End the Week Well", letterClass: "text-[#8E24AA]" },
];

const WEEK_LETTERS = DAILY_MOTTOS.slice(1); // Monday to Saturday

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

const todayLabel = () =>
  new Intl.DateTimeFormat("en-PH", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date());

// The word across the week: today's letter lights up in its accent color, the rest stay muted.
// On Sunday every letter stays muted.
const WeekWord = ({ day }) => (
  <div className="flex items-baseline gap-[3px] font-black text-2xl leading-none tracking-tight select-none" aria-hidden="true">
    {WEEK_LETTERS.map((m, i) => {
      const active = i + 1 === day;
      return (
        <span
          key={m.text}
          title={m.text}
          className={`transition-colors ${
            active ? m.letterClass : "text-gray-300 dark:text-slate-700"
          } ${active ? "scale-110" : ""} inline-block`}
        >
          {m.text.charAt(0)}
        </span>
      );
    })}
  </div>
);

const DailyMotto = () => {
  const day = new Date().getDay();
  const { text } = DAILY_MOTTOS[day];

  return (
    <div className="mt-4 flex items-center gap-3">
      <WeekWord day={day} />
      <span className="h-5 w-px bg-gray-300 dark:bg-slate-700" />
      <p className="text-sm md:text-base font-semibold text-gray-700 dark:text-gray-200">{text}</p>
    </div>
  );
};

// Greeting and date range on top; the user's dashboard tabs and "Customize" along the bottom edge
const Hero = ({
  fullname,
  isNarrow,
  disabled,
  onCustomize,
  showTabs,
  dashboards,
  activeId,
  onSelectTab,
  onNewTab,
  creating,
  range,
  onRangeChange,
}) => (
  <section className="relative isolate w-full mb-6 overflow-hidden rounded-3xl border border-gray-200/80 dark:border-slate-800 bg-white dark:bg-slate-950">
    {/* Background: brand image fading in from the right, plus a soft theme-color glow */}
    <div aria-hidden="true" className="absolute inset-0 -z-10 pointer-events-none">
      <img
        src={heroBackground}
        alt=""
        className="absolute right-0 top-0 h-full w-full md:w-3/4 object-cover opacity-50 dark:opacity-25"
        style={{
          maskImage: "linear-gradient(to left, black 10%, transparent 85%)",
          WebkitMaskImage: "linear-gradient(to left, black 10%, transparent 85%)",
        }}
      />
      <div
        className="absolute -left-24 -top-24 h-72 w-72 rounded-full blur-3xl opacity-60 dark:opacity-40"
        style={{ background: "color-mix(in srgb, var(--main-color) 35%, transparent)" }}
      />
    </div>

    <div className="grid gap-6 px-5 md:px-8 pt-7 pb-6 lg:grid-cols-[1fr_auto] lg:items-end">
      <div className="min-w-0">
        <time className="text-sm font-medium text-gray-500 dark:text-gray-400">{todayLabel()}</time>
        <h1 className="mt-2 leading-tight">
          <span className="block text-base md:text-lg font-semibold text-gray-500 dark:text-gray-400">
            {getGreeting()},
          </span>
          <span className="block truncate text-3xl md:text-[40px] font-black tracking-tight text-gray-900 dark:text-white">
            {fullname}
          </span>
        </h1>
        <DailyMotto />
        {isNarrow && (
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            Open on a computer to customize your dashboard.
          </p>
        )}
      </div>

      {range && onRangeChange && (
        <div className="w-full lg:w-[360px] shrink-0 rounded-2xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md p-3 ring-1 ring-gray-200/80 dark:ring-slate-700/70">
          <DateFilter range={range} onChange={onRangeChange} />
        </div>
      )}
    </div>

    {(showTabs || !isNarrow) && (
      <div className="flex items-end justify-between gap-3 px-4 md:px-6 border-t border-gray-200/70 dark:border-slate-800 bg-white/60 dark:bg-slate-950/60 backdrop-blur-md">
        {showTabs ? (
          <DashboardTabs
            dashboards={dashboards}
            activeId={activeId}
            onSelect={onSelectTab}
            onNew={onNewTab}
            creating={creating}
            disabled={isNarrow && dashboards.length === 0}
          />
        ) : (
          <div />
        )}

        {!isNarrow && (
          <button
            type="button"
            onClick={onCustomize}
            disabled={disabled}
            className={`${btnPrimary} shrink-0 mb-2`}
          >
            <TbLayoutDashboard size={16} /> Customize dashboard
          </button>
        )}
      </div>
    )}
  </section>
);

export default Hero;