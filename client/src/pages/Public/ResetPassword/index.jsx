import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FaCheckCircle } from "react-icons/fa";
import FloatingInput from "../../../components/Forms/FloatingInput";
import AuthShell, { btnPrimary } from "../../../components/Client/AuthShell";
import { showErrorToast, showWarningToast } from "../../../components/ActionsCenter/Alerts/Sileo";
import ClientAuthAPI from "../../../api/client/clientAuthAPI";
import { getClientError } from "../../../api/client/clientAxios";

// Opened from the reset or invite email: /reset-password?token=...
const ResetPassword = () => {
  const [params] = useSearchParams();
  const token = params.get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 8) return showWarningToast("Warning", "Password must be at least 8 characters.");
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password))
      return showWarningToast("Warning", "Password must have at least one letter and one number.");
    if (password !== confirm) return showWarningToast("Warning", "Passwords don't match.");

    setIsSubmitting(true);
    try {
      await ClientAuthAPI.resetPassword(token, password);
      setDone(true);
    } catch (error) {
      showErrorToast("Error", getClientError(error, "This link is invalid or has expired."));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <AuthShell title="Link not valid">
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">This link is missing its token.</p>
        <Link to="/client-forgot-password" className={btnPrimary}>
          Request a new link
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={done ? "Password set" : "Set a new password"}>
      {done ? (
        <div className="text-center space-y-4">
          <FaCheckCircle size={44} className="mx-auto text-green-600" />
          <p className="text-sm text-gray-600 dark:text-gray-300">You can now log in with your new password.</p>
          <Link to="/client-login" className={btnPrimary}>
            Log in
          </Link>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit}>
          <FloatingInput
            id="rpPassword"
            label="New password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <FloatingInput
            id="rpConfirm"
            label="Confirm new password"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          <p className="text-[11px] text-gray-500 -mt-2">At least 8 characters, with a letter and a number.</p>
          <button type="submit" disabled={isSubmitting} className={btnPrimary}>
            {isSubmitting ? "Saving..." : "Set password"}
          </button>
          <p className="text-xs text-gray-500 text-center">
            Link expired?{" "}
            <Link to="/client-forgot-password" className="text-[#E00000] hover:underline">
              Request a new one
            </Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
};

export default ResetPassword;
