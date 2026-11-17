import React, { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FaCheckCircle, FaTimesCircle, FaSpinner } from "react-icons/fa";
import AuthShell, { btnPrimary } from "../../../components/Client/AuthShell";
import ClientAuthAPI from "../../../api/client/clientAuthAPI";
import { getClientError } from "../../../api/client/clientAxios";

// Opened from the email link: /verify-email?token=...
const VerifyEmail = () => {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState({ status: "checking", message: "" });
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // tokens are single-use; don't verify twice in StrictMode
    ran.current = true;

    if (!token) {
      setState({ status: "error", message: "This link is missing its token." });
      return;
    }
    ClientAuthAPI.verifyEmail(token)
      .then(() => setState({ status: "ok", message: "" }))
      .catch((error) =>
        setState({ status: "error", message: getClientError(error, "This link is invalid or has expired.") })
      );
  }, [token]);

  return (
    <AuthShell title="Email verification">
      <div className="text-center space-y-4">
        {state.status === "checking" && (
          <>
            <FaSpinner size={40} className="mx-auto text-[#E00000] animate-spin" />
            <p className="text-sm text-gray-500">Verifying your email...</p>
          </>
        )}

        {state.status === "ok" && (
          <>
            <FaCheckCircle size={44} className="mx-auto text-green-600" />
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Your email is verified and your account is active. Log in to start your plan.
            </p>
            <Link to="/client-login" className={btnPrimary}>
              Log in
            </Link>
          </>
        )}

        {state.status === "error" && (
          <>
            <FaTimesCircle size={44} className="mx-auto text-red-600" />
            <p className="text-sm text-gray-600 dark:text-gray-300">{state.message}</p>
            <p className="text-xs text-gray-500">
              Already verified? Just log in. Otherwise, log in to request a new link.
            </p>
            <Link to="/client-login" className={btnPrimary}>
              Go to login
            </Link>
          </>
        )}
      </div>
    </AuthShell>
  );
};

export default VerifyEmail;
