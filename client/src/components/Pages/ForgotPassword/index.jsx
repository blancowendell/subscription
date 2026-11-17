import React, { useState } from "react";
import Brand from "../../../assets/images/brand.png";
import FloatingInput from "../../../components/Forms/FloatingInput";
import ForgotPassCover from "../../../assets/images/forgot_password_cover.png";
import authAPI from "../../../api/public/auth/authAPI";
import { useNavigate } from "react-router-dom";
import {
  showErrorToast,
  showSuccessToast,
  showWarningToast,
} from "../../../components/ActionsCenter/Alerts/Sileo";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (!email) {
      showWarningToast("Please enter your email.");
      setLoading(false);
      return;
    }

    try {
      const response = await authAPI.forgotPassword(email);
      setMessage("Password reset link sent! Check your email.");
      showSuccessToast("Success", "Password reset link sent! Check your email.");
    } catch (err) {
      let msg = "Failed to send reset link.";

      if (err && typeof err === "object" && "msg" in err) {
        msg = err.msg;
      } else if (typeof err === "string") {
        msg = err;
      } else if (err && err.message) {
        msg = err.message;
      }

      setMessage(msg);
      showErrorToast("Error", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left side - Forgot Password Form */}
      <div className="flex flex-col justify-center items-center md:w-1/2 w-full bg-gray-100 p-8 sm:p-10">
        <img src={Brand} alt="Brand" className="w-40 mb-3" />

        <h2
          className="text-2xl md:text-3xl font-semibold mb-8 text-center"
          style={{ color: "var(--main-color)" }}
        >
          Forgot Password
        </h2>

        <form className="w-full max-w-sm" onSubmit={handleSubmit}>
          <div className="mb-6">
            <FloatingInput
              id="email"
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {message && <p className="text-green-500 mb-4">{message}</p>}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 rounded-md text-white transition ${
              loading ? "opacity-50 cursor-not-allowed" : ""
            }`}
            style={{ backgroundColor: "var(--main-color)" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor =
                "var(--main-hover-color)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "var(--main-color)")
            }
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>

          <div className="mt-4 text-center">
            <span className="text-sm text-gray-600">
              Remember your password?{" "}
              <a
                href="/"
                className="font-medium"
                style={{ color: "var(--main-color)" }}
              >
                Log in here
              </a>
            </span>
          </div>
        </form>
      </div>

      <div className="hidden lg:flex w-1/2 items-center justify-center p-10">
        <div className="relative w-full h-[90%] group">
          {/* Decorative Glow for Dark Mode */}
          <div className="absolute inset-0 bg-[var(--main-color)] opacity-20 blur-[100px] rounded-full hidden dark:block"></div>

          <div className="relative w-full h-full rounded-[40px] overflow-hidden shadow-2xl border-8 border-white dark:border-slate-900 transition-colors duration-500">
            <img
              src={ForgotPassCover}
              alt="Forgot Password Cover"
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
