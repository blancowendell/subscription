import React, { useState } from "react";
import Brand from "../../../assets/images/brand.png";
import LogInCover from "../../../assets/images/login_cover.png";
import FloatingInput from "../../../components/Forms/FloatingInput";
import authAPI from "../../../api/public/auth/authAPI";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../api/public/auth/parts/authContext";
import { ROLE_DASHBOARDS } from "../../../layouts/Sidebar/parts/MenuConfig";
import {
  showErrorToast,
  showWarningToast,
} from "../../../components/ActionsCenter/Alerts/Sileo";

export default function LoginPage() {
  const navigate = useNavigate();
  const { setSession } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // authAPI.login returns the session response: { success, user }
      const data = await authAPI.login(username, password);
      const user = data.user;

      localStorage.setItem("APK", user?.token ?? "");
      localStorage.setItem("lastRole", user?.access_type ?? "");
      setSession({ ...user });

      // Same role -> dashboard map the sidebar uses
      const dashboard = ROLE_DASHBOARDS[user?.access_type];
      if (dashboard) {
        navigate(dashboard, { state: { justLoggedIn: true } });
      } else {
        navigate("/unauthorized");
      }
    } catch (err) {
      let msg = "Login failed";

      if (err && typeof err === "object" && "msg" in err) {
        msg = err.msg;
      } else if (typeof err === "string") {
        msg = err;
      } else if (err && err.message) {
        msg = err.message;
      }

      setError(msg);

      if (typeof msg === "string" && msg.toLowerCase().includes("incorrect")) {
        showWarningToast("Warning", msg);
      } else {
        showErrorToast("Error", msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex transition-colors duration-300">
      {/* Left Panel: Form */}
      <div className="flex flex-col justify-center items-center w-full lg:w-1/2 bg-gray-50 dark:bg-slate-950 p-8 lg:p-16 transition-colors">
        <div className="w-full max-w-sm flex flex-col items-center">
          {/* Brand Logo */}
          <img
            src={Brand}
            alt="Brand"
            className="w-48 mb-6 dark:brightness-125 transition-all"
          />

          <div className="text-center mb-10">
            <h2
              className="text-3xl font-black tracking-tight"
              style={{ color: "var(--main-color)" }}
            >
              Admin Login
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm font-medium">
              System Administration Access
            </p>
          </div>

          <form className="w-full" onSubmit={handleSubmit}>
            {/* Username */}
            <div className="mb-5">
              <FloatingInput
                id="username"
                label="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
              />
            </div>

            {/* Password */}
            <div className="mb-5">
              <FloatingInput
                id="password"
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800">
                <p className="text-red-600 dark:text-red-400 text-xs font-bold text-center">
                  {error}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-xl text-[var(--main-text-color)] font-bold text-sm tracking-widest uppercase transition-all shadow-lg active:scale-95 ${
                loading
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:opacity-90 hover:shadow-xl"
              }`}
              style={{
                backgroundColor: "var(--main-color)",
                boxShadow: `0 10px 15px -3px var(--main-color-transparent, rgba(0,0,0,0.1))`,
              }}
            >
              {loading ? "Authenticating..." : "Log In"}
            </button>

            <div className="mt-6 text-center">
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                Forgot your password?{" "}
                <a
                  href="/forgotpassword"
                  className="font-bold hover:underline transition-all"
                  style={{ color: "var(--main-color)" }}
                >
                  Click here!
                </a>
              </span>
            </div>
          </form>

          <p className="mt-12 text-[10px] text-gray-400 dark:text-gray-600 text-center font-bold uppercase tracking-tighter">
            Internal Use Only • Authorized Personnel Only
          </p>
        </div>
      </div>

      {/* Right Panel: Cover Image */}
      <div className="hidden lg:flex w-1/2 items-center justify-center p-10">
        <div className="relative w-full h-[90%] group">
          {/* Decorative Glow for Dark Mode */}
          <div className="absolute inset-0 bg-[var(--main-color)] opacity-20 blur-[100px] rounded-full hidden dark:block"></div>

          <div className="relative w-full h-full rounded-[40px] overflow-hidden shadow-2xl border-8 border-white dark:border-slate-900 transition-colors duration-500">
            <img
              src={LogInCover}
              alt="Login Cover"
              className="w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0 transition-all duration-700 scale-105 group-hover:scale-100"
            />
            {/* Overlay to darken image in dark mode */}
            <div className="absolute inset-0 bg-black/10 dark:bg-black/40 transition-colors duration-500"></div>
          </div>
        </div>
      </div>
    </div>
  );
}