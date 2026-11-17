import React from "react";
import { Link, useNavigate } from "react-router-dom";
import brokenLightning from "../../../assets/images/logo.jpg";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[var(--bg-primary)] px-4 py-12 text-[var(--text-base)] relative overflow-hidden">
      {/* Background Decorative Glow Effects */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[var(--main-color)] opacity-20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-blue-500 opacity-10 blur-3xl pointer-events-none" />

      {/* Main Glass Card */}
      <div className="relative z-10 max-w-lg w-full bg-white/70 backdrop-blur-md rounded-3xl p-8 sm:p-10 shadow-xl border border-white/40 flex flex-col items-center text-center">
        
        {/* Floating Graphic Container */}
        <div className="relative mb-6 group">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-amber-100/50 rounded-full blur-xl scale-95 group-hover:scale-105 transition-transform duration-500" />
          <img
            src={brokenLightning}
            alt="Page Not Found - Power Interrupted"
            className="relative h-64 sm:h-72 object-contain drop-shadow-md animate-pulse duration-1000"
          />
        </div>

        {/* Status Badge & Typography */}
        <span className="inline-block px-3.5 py-1 mb-3 rounded-full text-xs font-bold uppercase tracking-wider bg-[var(--main-accent-bg)] text-red-600 border border-red-200">
          Error 404
        </span>

        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2 text-gray-900">
          Power Interrupted
        </h1>

        <p className="text-sm sm:text-base text-[var(--menu-text)] mb-8 max-w-sm leading-relaxed">
          The page you are looking for has been disconnected, moved, or no longer exists.
        </p>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
          <button
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto px-6 py-3 rounded-xl border border-gray-300 bg-white text-gray-700 font-semibold shadow-sm hover:bg-gray-50 hover:border-gray-400 active:scale-95 transition-all duration-200"
          >
            Go Back
          </button>

          <Link
            to="/index"
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[var(--main-color)] text-[var(--main-text-color)] font-semibold shadow-md hover:opacity-90 active:scale-95 transition-all duration-200"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;