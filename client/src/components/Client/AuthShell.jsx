import React from "react";
import { Link } from "react-router-dom";
import { BRAND } from "../../config/brand";
import BrandLogo from "./BrandLogo";

// Shared frame for sign up, login, verify and password pages
const AuthShell = ({ title, subtitle, children, footer, wide = false }) => (
  <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-gray-100">
    <header className="px-6 py-4">
      <Link to="/" className="inline-flex items-center gap-2" aria-label={BRAND.name}>
        <BrandLogo variant="mark" className="h-8" />
        <span className="text-xl font-bold tracking-tight">{BRAND.name}</span>
      </Link>
    </header>

    <main className="flex-1 flex items-center justify-center px-4 pb-12">
      <div
        className={`w-full ${wide ? "max-w-2xl" : "max-w-md"} bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-800 p-8`}
      >
        <h1 className="text-2xl font-semibold">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
    </main>

    {footer && <div className="pb-8 text-center text-sm text-gray-500">{footer}</div>}
  </div>
);

export const btnPrimary =
  "w-full px-5 py-2.5 rounded-md flex items-center justify-center gap-2 bg-[#E00000] hover:bg-[#B80000] text-white text-sm font-medium transition-colors disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed";

export const btnSecondary =
  "px-4 py-2 rounded-md flex items-center justify-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm transition-colors dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-gray-100 disabled:opacity-50";

export default AuthShell;
