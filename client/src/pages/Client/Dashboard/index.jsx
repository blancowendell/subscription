import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaRocket,
  FaCheckCircle,
  FaSpinner,
  FaExclamationTriangle,
  FaPauseCircle,
  FaExternalLinkAlt,
  FaKey,
  FaCheck,
} from "react-icons/fa";
import { showErrorToast, showSuccessToast, showActionToast } from "../../../components/ActionsCenter/Alerts/Sileo";
import ClientPortalAPI from "../../../api/client/clientPortalAPI";
import { getClientError } from "../../../api/client/clientAxios";
import { useClientAuth, readPendingPlan, clearPendingPlan } from "../../../api/client/clientAuthContext";
import { featureLine } from "../../../components/Client/PricingCards";
import { BRAND, money } from "../../../config/brand";

const btnPrimary =
  "px-5 py-2.5 rounded-md inline-flex items-center justify-center gap-2 bg-[#E00000] hover:bg-[#B80000] text-white text-sm font-medium transition-colors disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed";
const btnSecondary =
  "px-4 py-2 rounded-md inline-flex items-center justify-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm transition-colors dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-gray-100 disabled:opacity-50";

const STATUS_STYLE = {
  TRIAL: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
  ACTIVE: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  SUSPENDED: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  EXPIRED: "bg-gray-200 text-gray-700 dark:bg-slate-700 dark:text-gray-300",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  PENDING: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
};

const ERP_STATE = {
  READY: { icon: FaCheckCircle, tone: "text-green-600", title: "Your system is ready", text: "Log in with your company code and email." },
  UPDATING: { icon: FaSpinner, spin: true, tone: "text-[#E00000]", title: "Setting things up", text: "We're preparing your system. This usually takes a minute or two." },
  NEEDS_ATTENTION: { icon: FaExclamationTriangle, tone: "text-amber-600", title: "Setup is taking longer than usual", text: "Our team has been notified and will sort it out. No action needed from you." },
  SUSPENDED: { icon: FaPauseCircle, tone: "text-amber-600", title: "Your system is paused", text: "Renew or reactivate your subscription to continue." },
  NOT_SET_UP: { icon: FaRocket, tone: "text-gray-400", title: "Not set up yet", text: "Your system is created once your subscription starts." },
};

const daysBetween = (from, to) => Math.round((new Date(`${to}T00:00:00Z`) - new Date(`${from}T00:00:00Z`)) / 86400000);

const Card = ({ title, children, right }) => (
  <div className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
    {(title || right) && (
      <div className="flex items-center justify-between mb-4">
        {title && <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">{title}</h2>}
        {right}
      </div>
    )}
    {children}
  </div>
);

const Dashboard = () => {
  const { client, isOwner } = useClientAuth();
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingPlan, setPendingPlan] = useState(readPendingPlan());
  const [isStarting, setIsStarting] = useState(false);

  const load = async () => {
    try {
      const [sub, hist] = await Promise.all([
        ClientPortalAPI.getMySubscription(),
        ClientPortalAPI.getMySubscriptionHistory(),
      ]);
      setData(sub);
      setHistory(Array.isArray(hist) ? hist.slice(0, 8) : []);
    } catch (error) {
      showErrorToast("Error", getClientError(error, "Couldn't load your subscription."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // While the ERP is being set up, check again every 10 seconds
  useEffect(() => {
    if (data?.erp?.state !== "UPDATING") return undefined;
    const timer = setInterval(load, 10000);
    return () => clearInterval(timer);
  }, [data?.erp?.state]);

  const sub = data?.subscription;
  const isLive = sub && ["TRIAL", "ACTIVE", "SUSPENDED", "PENDING"].includes(sub.status);

  // Plan picked on the landing page, offered once after the first login
  const showPendingPlan = pendingPlan && isOwner && !loading && !isLive;
  const pendingIsTrial = pendingPlan?.isTrial && !data?.trial_used;

  const startPendingPlan = async () => {
    setIsStarting(true);
    try {
      const result = await ClientPortalAPI.subscribe(pendingPlan.planId, pendingPlan.billingCycle, pendingIsTrial);
      clearPendingPlan();
      setPendingPlan(null);
      showSuccessToast(
        result?.status === "TRIAL" ? "Your trial has started!" : "Request sent",
        result?.status === "TRIAL"
          ? "We're setting up your system now."
          : `We'll activate it once your payment of ${money(result?.amount_due)} is confirmed.`
      );
      load();
    } catch (error) {
      showErrorToast("Error", getClientError(error, "Couldn't start your plan."));
    } finally {
      setIsStarting(false);
    }
  };

  const dismissPendingPlan = () => {
    clearPendingPlan();
    setPendingPlan(null);
  };

  const handleCancelPending = () =>
    showActionToast({
      title: "Withdraw request?",
      description: "Your pending subscription request will be cancelled.",
      button: {
        title: "Withdraw",
        onClick: async () => {
          try {
            await ClientPortalAPI.cancelPending();
            showSuccessToast("Request withdrawn.");
            load();
          } catch (error) {
            showErrorToast("Error", getClientError(error, "Couldn't withdraw the request."));
          }
        },
      },
    });

  if (loading) return <div className="py-20 text-center text-gray-400">Loading...</div>;

  const erp = data?.erp;
  const erpView = ERP_STATE[erp?.state] || ERP_STATE.NOT_SET_UP;
  const ErpIcon = erpView.icon;
  const daysLeft = sub && data?.today ? daysBetween(data.today, sub.end_date) : null;
  const inGrace = sub?.status === "ACTIVE" && daysLeft !== null && daysLeft < 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Hi, {client?.fullname?.split(" ")[0]}</h1>
        <p className="text-sm text-gray-500">
          {client?.company_name} · Company code <strong>{client?.tenant_code}</strong>
        </p>
      </div>

      {client?.is_update_password && (
        <div className="rounded-xl bg-amber-500/10 text-amber-800 dark:text-amber-300 px-4 py-3 flex items-center justify-between gap-4">
          <span className="flex items-center gap-2 text-sm">
            <FaKey /> You're using a temporary password. Please set your own.
          </span>
          <Link to="/portal/account" className="text-sm font-medium underline shrink-0">
            Change password
          </Link>
        </div>
      )}

      {/* Plan carried over from sign-up */}
      {showPendingPlan && (
        <div className="rounded-2xl border-2 border-[#E00000] bg-[#E00000]/5 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-[#E00000] font-semibold">Ready when you are</div>
            <div className="text-xl font-semibold mt-1">
              {pendingIsTrial ? `Start your ${pendingPlan.planName} free trial` : `Subscribe to ${pendingPlan.planName}`}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {pendingIsTrial
                ? "Your system is created as soon as you start. No payment needed."
                : `Billed ${pendingPlan.billingCycle === "YEARLY" ? "yearly" : "monthly"}. We'll activate it once payment is confirmed.`}
            </p>
          </div>
          <div className="flex gap-3 shrink-0">
            <button type="button" onClick={dismissPendingPlan} className={btnSecondary}>
              Not now
            </button>
            <button type="button" onClick={startPendingPlan} disabled={isStarting} className={btnPrimary}>
              <FaRocket /> {isStarting ? "Starting..." : pendingIsTrial ? "Start free trial" : "Send request"}
            </button>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Subscription */}
        <div className="lg:col-span-2">
          <Card
            title="Subscription"
            right={sub && <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLE[sub.status]}`}>{sub.status}</span>}
          >
            {!sub ? (
              <div className="text-center py-6 space-y-4">
                <p className="text-gray-500">You don't have a subscription yet.</p>
                {isOwner && (
                  <Link to="/portal/plans" className={btnPrimary}>
                    Choose a plan
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <div className="text-2xl font-bold">{sub.plan_name}</div>
                    <div className="text-sm text-gray-500">
                      {sub.is_trial
                        ? "Free trial"
                        : `${money(sub.price)} / ${sub.billing_cycle === "YEARLY" ? "year" : "month"}`}
                    </div>
                  </div>
                  {["TRIAL", "ACTIVE"].includes(sub.status) && daysLeft !== null && (
                    <div className="text-right">
                      <div className={`text-3xl font-bold ${daysLeft <= 7 ? "text-amber-600" : ""}`}>
                        {inGrace ? 0 : daysLeft + 1}
                      </div>
                      <div className="text-xs text-gray-500">days left</div>
                    </div>
                  )}
                </div>

                <div className="grid sm:grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500 text-xs">Started</div>
                    <div className="font-medium">{sub.start_date}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs">{sub.is_trial ? "Trial ends" : "Renews / ends"}</div>
                    <div className="font-medium">{sub.end_date}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs">Reference</div>
                    <div className="font-medium">{sub.ref}</div>
                  </div>
                </div>

                {sub.status === "PENDING" && (
                  <div className="rounded-lg bg-purple-500/10 text-purple-800 dark:text-purple-300 text-sm px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <span>
                      Waiting for payment of <strong>{money(sub.price)}</strong>. Send it to us and mention reference{" "}
                      <strong>{sub.ref}</strong>. Questions? {BRAND.supportEmail}
                    </span>
                    {isOwner && (
                      <button type="button" onClick={handleCancelPending} className="text-sm underline shrink-0">
                        Withdraw request
                      </button>
                    )}
                  </div>
                )}
                {sub.is_trial && sub.status === "TRIAL" && daysLeft !== null && daysLeft <= 3 && (
                  <div className="rounded-lg bg-amber-500/10 text-amber-800 dark:text-amber-300 text-sm px-4 py-3">
                    Your trial ends soon. Contact {BRAND.supportEmail} to continue on a paid plan.
                  </div>
                )}
                {inGrace && (
                  <div className="rounded-lg bg-amber-500/10 text-amber-800 dark:text-amber-300 text-sm px-4 py-3">
                    Your plan ended on {sub.end_date}. Your system keeps running until {sub.grace_end_date}. Renew to avoid a pause.
                  </div>
                )}
                {["EXPIRED", "CANCELLED"].includes(sub.status) && isOwner && (
                  <Link to="/portal/plans" className={btnPrimary}>
                    Choose a plan
                  </Link>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* ERP status */}
        <Card title="Your system">
          <div className="space-y-3">
            <ErpIcon size={32} className={`${erpView.tone} ${erpView.spin ? "animate-spin" : ""}`} />
            <div className="font-semibold">{erpView.title}</div>
            <p className="text-sm text-gray-500">{erpView.text}</p>
            {erp?.state === "READY" && erp?.login_url && (
              <a href={erp.login_url} target="_blank" rel="noreferrer" className={btnPrimary}>
                Open my system <FaExternalLinkAlt size={11} />
              </a>
            )}
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Features */}
        <div className="lg:col-span-2">
          <Card title="What's included">
            {data?.features?.length ? (
              <ul className="grid sm:grid-cols-2 gap-2">
                {data.features.map((f) => (
                  <li key={f.code} className="flex items-center gap-2 text-sm">
                    <FaCheck size={11} className="text-[#E00000] shrink-0" /> {featureLine(f)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">Your plan's features show here once you subscribe.</p>
            )}
          </Card>
        </div>

        {/* Activity */}
        <Card title="Recent activity">
          {history.length === 0 ? (
            <p className="text-sm text-gray-500">Nothing yet.</p>
          ) : (
            <ol className="space-y-3">
              {history.map((h) => (
                <li key={h.id} className="border-l-2 border-[#E00000]/40 pl-3">
                  <div className="text-sm font-medium">
                    {h.action.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}
                    {h.to_plan_code && h.from_plan_code && h.to_plan_code !== h.from_plan_code
                      ? ` to ${h.to_plan_code}`
                      : ""}
                  </div>
                  <div className="text-[11px] text-gray-500">{String(h.create_date || "").slice(0, 10)}</div>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
