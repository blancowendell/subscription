import React from "react";
import { FaPen } from "react-icons/fa";
import { TbShieldCheck } from "react-icons/tb";

const RoleCard = ({ role, onEdit }) => {
  const active = role.status === "ACTIVE";

  return (
    <button
      type="button"
      onClick={() => onEdit(role)}
      className={`group relative text-left w-full rounded-2xl border bg-white dark:bg-slate-900 p-4 shadow-sm hover:shadow-md transition-all ${
        active
          ? "border-gray-200 dark:border-slate-800 hover:border-main"
          : "border-dashed border-gray-300 dark:border-slate-700 opacity-75"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
            active ? "bg-main/10 text-main" : "bg-gray-100 text-gray-400 dark:bg-slate-800"
          }`}
        >
          <TbShieldCheck size={20} />
        </span>

        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-800 dark:text-gray-100 truncate" title={role.name}>
            {role.name}
          </p>
        </div>

        <FaPen
          size={12}
          className="shrink-0 mt-1 text-gray-300 group-hover:text-main transition-colors"
        />
      </div>

      <div className="mt-4 flex items-center justify-between text-xs">
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-medium ${
            active
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
              : "bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-gray-400"
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-gray-400"}`} />
          {active ? "Active" : "Inactive"}
        </span>
        <span className="text-gray-400">ID {role.id}</span>
      </div>
    </button>
  );
};

export default RoleCard;