import React, { useState } from "react";
import { Link } from "react-router-dom";
import FloatingInput from "../../../components/Forms/FloatingInput";
import AuthShell, { btnPrimary } from "../../../components/Client/AuthShell";
import { showErrorToast, showWarningToast } from "../../../components/ActionsCenter/Alerts/Sileo";
import ClientAuthAPI from "../../../api/client/clientAuthAPI";
import { getClientError } from "../../../api/client/clientAxios";

const ClientForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return showWarningToast("Warning", "Enter your email.");

    setIsSubmitting(true);
    try {
      await ClientAuthAPI.forgotPassword(email.trim().toLowerCase());
      setSent(true);
    } catch (error) {
      showErrorToast("Error", getClientError(error, "Couldn't send the reset email."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Reset your password"
      subtitle={sent ? null : "We'll email you a link to set a new password."}
      footer={
        <Link to="/client-login" className="text-[#E00000] hover:underline">
          Back to login
        </Link>
      }
    >
      {sent ? (
        <p className="text-sm text-gray-600 dark:text-gray-300">
          If <strong>{email.trim().toLowerCase()}</strong> is registered, a reset link is on its way. It expires in 1 hour.
        </p>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit}>
          <FloatingInput id="fpEmail" label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button type="submit" disabled={isSubmitting} className={btnPrimary}>
            {isSubmitting ? "Sending..." : "Send reset link"}
          </button>
        </form>
      )}
    </AuthShell>
  );
};

export default ClientForgotPassword;
