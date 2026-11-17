export const isSystemRole = (role) =>
  role?.is_system === true || role?.is_system === 1 || role?.is_system === "1";

export const btnPrimary =
  "px-5 py-2 rounded-md flex items-center justify-center gap-2 bg-main hover:bg-main-hover text-[var(--main-text-color)] text-sm font-medium transition-colors disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed";

export const btnSecondary =
  "px-4 py-2 rounded-md flex items-center justify-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm transition-colors dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-gray-100 disabled:opacity-50";