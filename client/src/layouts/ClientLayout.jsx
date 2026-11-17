import React from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { FaSignOutAlt } from "react-icons/fa";
import { BRAND } from "../config/brand";
import { useClientAuth } from "../api/client/clientAuthContext";
import BrandLogo from "../components/Client/BrandLogo";

// Top bar + content area for every /portal page
const ClientLayout = () => {
  const navigate = useNavigate();
  const { client, isOwner, logout } = useClientAuth();

  const links = [
    { to: "/portal", label: "Overview", end: true },
    { to: "/portal/plans", label: "Plans" },
    { to: "/portal/account", label: "Account" },
    ...(isOwner ? [{ to: "/portal/users", label: "Users" }] : []),
  ];

  const handleLogout = async () => {
    await logout();
    navigate("/client-login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-gray-100">
      <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-6">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2" aria-label={BRAND.name}>
              <BrandLogo variant="mark" className="h-7" />
              <span className="text-lg font-bold tracking-tight">{BRAND.name}</span>
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              {links.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={l.end}
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-md text-sm transition-colors ${
                      isActive
                        ? "bg-[#E00000]/10 text-[#E00000] font-medium"
                        : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800"
                    }`
                  }
                >
                  {l.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right leading-tight">
              <div className="text-sm font-medium">{client?.company_name}</div>
              <div className="text-[11px] text-gray-500">
                {client?.fullname} · {client?.role}
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="p-2 rounded-md text-gray-500 hover:text-[#E00000] hover:bg-gray-100 dark:hover:bg-slate-800"
              title="Log out"
            >
              <FaSignOutAlt />
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        <nav className="md:hidden flex gap-1 px-4 pb-2 overflow-x-auto">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-md text-sm whitespace-nowrap ${
                  isActive ? "bg-[#E00000]/10 text-[#E00000] font-medium" : "text-gray-600 dark:text-gray-300"
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
};

export default ClientLayout;
