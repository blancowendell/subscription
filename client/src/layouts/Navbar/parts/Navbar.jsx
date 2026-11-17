import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FaUserCircle, FaSun, FaMoon } from "react-icons/fa";
import { FiLogOut, FiLock } from "react-icons/fi";
import { useAuth } from "../../../api/public/auth/parts/authContext";

// master_users sign in at /admin, employee_users at /
export const loginPageFor = (session) =>
  session?.user_source === "MASTER" ? "/admin" : "/";

const Navbar = ({ isOpen, isMobile, toggleSidebar, theme, toggleTheme }) => {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const { session, logout } = useAuth();

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    const loginPage = loginPageFor(session);
    // Lets RequireAuth send an expired session to the same login page
    localStorage.setItem("lastLoginPage", loginPage);
    await logout();
    window.location.href = loginPage;
  };

  return (
    <div
      className={`fixed top-0 right-0 z-30 py-3 px-4 shadow-md transition-all duration-300 ease-in-out
        bg-white dark:bg-slate-900 border-b border-[rgba(0,0,0,0.1)] dark:border-slate-700
        ${
          isMobile || windowWidth <= 1200
            ? isOpen
              ? "w-full ml-0"
              : "w-[calc(100%-5rem)] ml-20"
            : isOpen
              ? "w-[calc(100%-19rem)] ml-[19rem] rounded-lg m-2"
              : "w-[calc(100%-6rem)] ml-20 rounded-lg m-2"
        }
      `}
    >
      <div className="flex items-center justify-between">
        <div className="flex flex-row gap-4 items-center">
          <button
            onClick={toggleSidebar}
            className="text-[var(--main-color)] px-4 md:py-0 py-2 font-extrabold hover:rounded-lg"
          >
            ☰
          </button>
          <span className="dark:text-white font-medium">
            {session?.access_type || "Loading..."}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-gray-600 dark:text-yellow-400"
            title="Toggle Dark Mode"
          >
            {theme === "dark" ? <FaSun size={20} /> : <FaMoon size={20} />}
          </button>

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="rounded-full focus:outline-none"
            >
              <FaUserCircle size={32} className="text-gray-600 dark:text-gray-400" />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-md shadow-lg py-2 z-50 border border-gray-300 dark:border-slate-700">
                <div className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 border-b border-gray-300 dark:border-slate-700 font-medium flex items-center gap-2">
                  <FaUserCircle />
                  {session?.fullname || "Loading..."}
                </div>

                <button
                  onClick={() => navigate("/index/security")}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700"
                >
                  <FiLock className="mr-2" />
                  Security
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700"
                >
                  <FiLogOut className="mr-2" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Navbar;