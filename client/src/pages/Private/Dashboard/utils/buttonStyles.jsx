// Shared button looks, following the app's theme variables
// (--main-color / --main-text-color / --main-hover-color), so the same file
// fits every system's brand color.
const base =
  "rounded-md flex items-center justify-center gap-2 text-sm transition-colors disabled:cursor-not-allowed";

export const btnPrimary = `${base} px-5 py-2 font-medium bg-[var(--main-color)] text-[var(--main-text-color)] hover:bg-[var(--main-hover-color)] disabled:bg-gray-300 disabled:text-gray-500`;

export const btnSecondary = `${base} px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-gray-100 disabled:opacity-50`;

// Destructive actions stay red in every system
export const btnDanger = `${base} px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 dark:bg-red-900/20 dark:hover:bg-red-900/30 dark:border-red-900/40 dark:text-red-400 disabled:opacity-50`;