import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import FloatingInput from "../../../components/Forms/FloatingInput";
import AuthShell, { btnPrimary } from "../../../components/Client/AuthShell";
import { showErrorToast, showSuccessToast, showWarningToast } from "../../../components/ActionsCenter/Alerts/Sileo";
import ClientAuthAPI from "../../../api/client/clientAuthAPI";
import { getClientError } from "../../../api/client/clientAxios";
import { useClientAuth } from "../../../api/client/clientAuthContext";

const ClientLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useClientAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [unverified, setUnverified] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) return showWarningToast("Warning", "Enter your email and password.");

    setIsSubmitting(true);
    setUnverified(false);
    try {
      await login(email.trim().toLowerCase(), password);
      navigate(location.state?.from || "/portal", { replace: true });
    } catch (error) {
      const message = getClientError(error, "Login failed.");
      if (error?.response?.status === 403 && /verify/i.test(message)) setUnverified(true);
      showErrorToast("Login failed", message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    try {
      await ClientAuthAPI.resendVerification(email.trim().toLowerCase());
      showSuccessToast("Sent", "Check your inbox for the verification link.");
    } catch (error) {
      showErrorToast("Error", getClientError(error, "Couldn't resend the email."));
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to manage your subscription."
      footer={
        <>
          New here?{" "}
          <Link to="/#pricing" className="text-[#E00000] hover:underline">
            Start a free trial
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <FloatingInput id="clEmail" label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <FloatingInput
          id="clPassword"
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div className="flex justify-end -mt-2">
          <Link to="/client-forgot-password" className="text-xs text-[#E00000] hover:underline">
            Forgot password?
          </Link>
        </div>

        {unverified && (
          <div className="rounded-lg bg-amber-500/10 text-amber-800 dark:text-amber-300 text-sm px-3 py-2">
            Your email isn't verified yet.{" "}
            <button type="button" onClick={handleResend} className="underline font-medium">
              Resend the link
            </button>
          </div>
        )}

        <button type="submit" disabled={isSubmitting} className={btnPrimary}>
          {isSubmitting ? "Logging in..." : "Log in"}
        </button>
      </form>
    </AuthShell>
  );
};

export default ClientLogin;
