import React from "react";
import { FaCheck } from "react-icons/fa";
import { money } from "../../config/brand";

// Readable lines for LIMIT features
const LIMIT_NOUN = {
  MAX_USERS: "users",
  MAX_BRANCHES: "branches",
  MAX_WAREHOUSES: "warehouses",
  MAX_POS_TERMINALS: "POS terminals",
};

export const featureLine = (f) => {
  if (f.type !== "LIMIT") return f.name;
  const noun = LIMIT_NOUN[f.code] || f.name.replace(/^max\s+/i, "");
  if (f.limit === null) return `Unlimited ${noun}`;
  const one = { branches: "branch", users: "user", warehouses: "warehouse", "POS terminals": "POS terminal" }[noun] || noun;
  return f.limit === 1 ? `1 ${one}` : `Up to ${f.limit} ${noun}`;
};

// Sorts LIMIT lines first so plans compare at a glance
const sortFeatures = (features) =>
  [...(features || [])].sort((a, b) => (a.type === b.type ? 0 : a.type === "LIMIT" ? -1 : 1));

export const CycleToggle = ({ cycle, onChange }) => (
  <div className="inline-flex items-center rounded-full border border-gray-200 dark:border-slate-700 p-1 bg-white dark:bg-slate-900">
    {["MONTHLY", "YEARLY"].map((c) => (
      <button
        key={c}
        type="button"
        onClick={() => onChange(c)}
        className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
          cycle === c ? "bg-[#E00000] text-white font-medium" : "text-gray-600 dark:text-gray-300"
        }`}
      >
        {c === "MONTHLY" ? "Monthly" : "Yearly"}
        {c === "YEARLY" && <span className="ml-1 text-[11px] opacity-80">save more</span>}
      </button>
    ))}
  </div>
);

// plans: from ClientPortalAPI.loadPlans()
// renderAction(plan) → the button(s) for each card
// highlightCode: plan code to mark as "Most popular"
const PricingCards = ({ plans, cycle, renderAction, currentPlanId, highlightCode }) => {
  if (!plans?.length) {
    return <div className="py-12 text-center text-gray-400">Plans will be available soon.</div>;
  }

  return (
    <div className={`grid gap-6 ${plans.length >= 3 ? "lg:grid-cols-3" : "md:grid-cols-2"} max-w-6xl mx-auto`}>
      {plans.map((plan) => {
        const yearly = cycle === "YEARLY";
        const price = yearly ? plan.price_yearly : plan.price_monthly;
        const fullYear = Number(plan.price_monthly) * 12;
        const saving = yearly && fullYear > Number(plan.price_yearly) ? fullYear - Number(plan.price_yearly) : 0;
        const highlighted = plan.code === highlightCode;
        const isCurrent = currentPlanId && String(currentPlanId) === String(plan.id);

        return (
          <div
            key={plan.id}
            className={`relative rounded-2xl border p-6 flex flex-col gap-5 bg-white dark:bg-slate-900 transition-shadow ${
              highlighted
                ? "border-[#E00000] shadow-xl ring-1 ring-[#E00000]"
                : "border-gray-200 dark:border-slate-800 shadow-sm hover:shadow-md"
            }`}
          >
            {highlighted && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-semibold bg-[#E00000] text-white">
                Most popular
              </span>
            )}

            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">{plan.name}</h3>
                {isCurrent && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">
                    Current plan
                  </span>
                )}
              </div>
              {plan.description && <p className="text-sm text-gray-500 mt-1">{plan.description}</p>}
            </div>

            <div>
              <div className="flex items-end gap-1">
                <span className="text-4xl font-bold">{money(price)}</span>
                <span className="text-gray-500 mb-1">/{yearly ? "year" : "month"}</span>
              </div>
              <div className="text-xs text-gray-500 mt-1 h-4">
                {saving > 0 ? `Save ${money(saving)} a year` : yearly ? "" : "Billed monthly"}
              </div>
              {plan.trial_days > 0 && (
                <div className="mt-2 inline-block text-xs px-2 py-0.5 rounded-full bg-[#E00000]/10 text-[#E00000] font-medium">
                  {plan.trial_days}-day free trial
                </div>
              )}
            </div>

            <ul className="space-y-2 flex-1">
              {sortFeatures(plan.features).map((f) => (
                <li key={f.code} className="flex items-start gap-2 text-sm">
                  <FaCheck className="mt-1 shrink-0 text-[#E00000]" size={12} />
                  <span>{featureLine(f)}</span>
                </li>
              ))}
            </ul>

            <div className="pt-2">{renderAction(plan)}</div>
          </div>
        );
      })}
    </div>
  );
};

export default PricingCards;
