import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FaEnvelopeOpenText } from "react-icons/fa";
import FloatingInput from "../../../components/Forms/FloatingInput";
import FloatingSelect from "../../../components/Forms/FloatingSelect";
import AuthShell, { btnPrimary, btnSecondary } from "../../../components/Client/AuthShell";
import { showErrorToast, showSuccessToast, showWarningToast } from "../../../components/ActionsCenter/Alerts/Sileo";
import ClientAuthAPI from "../../../api/client/clientAuthAPI";
import ClientPortalAPI from "../../../api/client/clientPortalAPI";
import { getClientError } from "../../../api/client/clientAxios";
import { savePendingPlan } from "../../../api/client/clientAuthContext";
import { money } from "../../../config/brand";

const BUSINESS_TYPE_OPTIONS = [
  { value: "RETAIL", label: "Retail store" },
  { value: "RESTAURANT", label: "Restaurant / food" },
  { value: "TRADING", label: "Trading / wholesale" },
  { value: "MANUFACTURING", label: "Manufacturing" },
  { value: "SERVICES", label: "Services" },
  { value: "OTHER", label: "Other" },
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_PATTERN = /^[A-Z][A-Z0-9]{2,19}$/;

// "Juan's Bakery Inc." → "JUANSBAKERY"
const suggestCode = (name) =>
  String(name || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .replace(/^[0-9]+/, "")
    .slice(0, 12);

const passwordProblem = (pw) => {
  if (pw.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) return "Password must have at least one letter and one number.";
  return null;
};

const ClientSignUp = () => {
  const [params] = useSearchParams();
  const planId = params.get("plan");
  const cycle = params.get("cycle") === "YEARLY" ? "YEARLY" : "MONTHLY";
  const wantsTrial = params.get("trial") === "1";

  const [plans, setPlans] = useState([]);
  const [form, setForm] = useState({
    fullname: "",
    email: "",
    phone: "",
    companyName: "",
    tenantCode: "",
    businessType: "",
    password: "",
    confirm: "",
  });
  const [codeTouched, setCodeTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [doneEmail, setDoneEmail] = useState(null);
  const [isResending, setIsResending] = useState(false);

  const setField = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  useEffect(() => {
    ClientPortalAPI.loadPlans()
      .then((data) => setPlans(Array.isArray(data) ? data : []))
      .catch(() => setPlans([]));
  }, []);

  const plan = useMemo(() => plans.find((p) => String(p.id) === String(planId)), [plans, planId]);
  const isTrial = wantsTrial && Number(plan?.trial_days) > 0;

  // Company code follows the company name until the user edits it
  const handleCompanyName = (e) => {
    const companyName = e.target.value;
    setForm((f) => ({ ...f, companyName, tenantCode: codeTouched ? f.tenantCode : suggestCode(companyName) }));
  };

  const handleCode = (e) => {
    setCodeTouched(true);
    setForm((f) => ({ ...f, tenantCode: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20) }));
  };

  const validate = () => {
    if (!form.fullname.trim()) return "Your name is required.";
    if (!EMAIL_PATTERN.test(form.email.trim())) return "Enter a valid email.";
    if (!form.companyName.trim()) return "Company name is required.";
    if (!CODE_PATTERN.test(form.tenantCode)) return "Company code: 3–20 letters/numbers, starting with a letter.";
    if (!form.businessType) return "Select your type of business.";
    const pw = passwordProblem(form.password);
    if (pw) return pw;
    if (form.password !== form.confirm) return "Passwords don't match.";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const invalid = validate();
    if (invalid) return showWarningToast("Warning", invalid);

    setIsSubmitting(true);
    try {
      const response = await ClientAuthAPI.signUp({
        fullname: form.fullname.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        companyName: form.companyName.trim(),
        tenantCode: form.tenantCode,
        businessType: form.businessType,
        password: form.password,
      });

      if (plan) {
        savePendingPlan({ planId: plan.id, planName: plan.name, billingCycle: cycle, isTrial });
      }

      // Account was created even if the email failed; the warning tells them to resend
      if (response?.msg && response.msg !== "success" && !response?.data) {
        showWarningToast("Almost there", response.msg);
      }
      setDoneEmail(form.email.trim().toLowerCase());
    } catch (error) {
      showErrorToast("Sign up failed", getClientError(error, "Couldn't create your account."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      await ClientAuthAPI.resendVerification(doneEmail);
      showSuccessToast("Sent", "Check your inbox (and spam folder).");
    } catch (error) {
      showErrorToast("Error", getClientError(error, "Couldn't resend the email."));
    } finally {
      setIsResending(false);
    }
  };

  if (doneEmail) {
    return (
      <AuthShell title="Check your email" footer={<Link to="/client-login" className="text-[#E00000] hover:underline">Go to login</Link>}>
        <div className="text-center space-y-4">
          <FaEnvelopeOpenText size={44} className="mx-auto text-[#E00000]" />
          <p className="text-sm text-gray-600 dark:text-gray-300">
            We sent a verification link to <strong>{doneEmail}</strong>. Open it to activate your account, then log in.
          </p>
          {plan && (
            <p className="text-sm text-gray-500">
              Your <strong>{plan.name}</strong> {isTrial ? "free trial" : "plan"} will be ready to start after your first login.
            </p>
          )}
          <button type="button" onClick={handleResend} disabled={isResending} className={`${btnSecondary} mx-auto`}>
            {isResending ? "Sending..." : "Resend email"}
          </button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Set up your company. It takes a minute."
      wide
      footer={
        <>
          Already have an account?{" "}
          <Link to="/client-login" className="text-[#E00000] hover:underline">
            Log in
          </Link>
        </>
      }
    >
      {plan && (
        <div className="mb-6 rounded-xl border border-[#E00000]/30 bg-[#E00000]/5 px-4 py-3 flex items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-gray-500">Selected plan</div>
            <div className="font-semibold">
              {plan.name} · {isTrial ? `${plan.trial_days}-day free trial` : cycle === "YEARLY" ? "Yearly" : "Monthly"}
            </div>
            <div className="text-xs text-gray-500">
              Then {money(cycle === "YEARLY" ? plan.price_yearly : plan.price_monthly)}/{cycle === "YEARLY" ? "year" : "month"}
            </div>
          </div>
          <Link to="/#pricing" className="text-sm text-[#E00000] hover:underline shrink-0">
            Change
          </Link>
        </div>
      )}

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid sm:grid-cols-2 gap-4">
          <FloatingInput id="suFullname" label="Your full name" value={form.fullname} onChange={setField("fullname")} />
          <FloatingInput id="suEmail" label="Work email" value={form.email} onChange={setField("email")} />
        </div>

        <FloatingInput id="suCompany" label="Company name" value={form.companyName} onChange={handleCompanyName} />

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <FloatingInput id="suCode" label="Company code" value={form.tenantCode} onChange={handleCode} />
            <p className="mt-1 text-[11px] text-gray-500">Your login ID for the system. Can't be changed later.</p>
          </div>
          <FloatingSelect
            id="suBusinessType"
            label="Type of business"
            value={form.businessType}
            onChange={setField("businessType")}
            options={BUSINESS_TYPE_OPTIONS}
          />
        </div>

        <FloatingInput id="suPhone" label="Phone (optional)" value={form.phone} onChange={setField("phone")} />

        <div className="grid sm:grid-cols-2 gap-4">
          <FloatingInput id="suPassword" label="Password" type="password" value={form.password} onChange={setField("password")} />
          <FloatingInput id="suConfirm" label="Confirm password" type="password" value={form.confirm} onChange={setField("confirm")} />
        </div>
        <p className="text-[11px] text-gray-500 -mt-2">At least 8 characters, with a letter and a number.</p>

        <button type="submit" disabled={isSubmitting} className={btnPrimary}>
          {isSubmitting ? "Creating account..." : "Create account"}
        </button>
      </form>
    </AuthShell>
  );
};

export default ClientSignUp;
