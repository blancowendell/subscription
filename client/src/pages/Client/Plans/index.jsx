import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { showErrorToast, showSuccessToast, showActionToast } from "../../../components/ActionsCenter/Alerts/Sileo";
import ClientPortalAPI from "../../../api/client/clientPortalAPI";
import { getClientError } from "../../../api/client/clientAxios";
import { useClientAuth, clearPendingPlan } from "../../../api/client/clientAuthContext";
import PricingCards, { CycleToggle } from "../../../components/Client/PricingCards";
import { BRAND, money } from "../../../config/brand";

const btnPrimary =
  "w-full px-5 py-2.5 rounded-md bg-[#E00000] hover:bg-[#B80000] text-white text-sm font-medium transition-colors disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed";
const btnOutline =
  "w-full px-5 py-2.5 rounded-md border border-gray-300 dark:border-slate-700 hover:border-[#E00000] text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

const ClientPlans = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { isOwner } = useClientAuth();

  const [plans, setPlans] = useState([]);
  const [mine, setMine] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cycle, setCycle] = useState(params.get("cycle") === "YEARLY" ? "YEARLY" : "MONTHLY");
  const [busyPlanId, setBusyPlanId] = useState(null);

  const preselectedId = params.get("plan");

  const load = async () => {
    try {
      const [planData, subData] = await Promise.all([ClientPortalAPI.loadPlans(), ClientPortalAPI.getMySubscription()]);
      setPlans(Array.isArray(planData) ? planData : []);
      setMine(subData);
    } catch (error) {
      showErrorToast("Error", getClientError(error, "Couldn't load plans."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const sub = mine?.subscription;
  const status = sub?.status;
  const canStartNew = !sub || ["EXPIRED", "CANCELLED"].includes(status);
  const onTrial = status === "TRIAL";
  const highlightCode =
    plans.find((p) => String(p.id) === String(preselectedId))?.code || (plans.length >= 3 ? plans[1].code : null);

  const subscribe = (plan, isTrial) =>
    showActionToast({
      title: isTrial ? `Start ${plan.name} trial?` : `Subscribe to ${plan.name}?`,
      description: isTrial
        ? `${plan.trial_days} days free. Your system will be set up right away.`
        : `${money(cycle === "YEARLY" ? plan.price_yearly : plan.price_monthly)} per ${cycle === "YEARLY" ? "year" : "month"}. We'll activate it once payment is confirmed.`,
      button: {
        title: isTrial ? "Start trial" : "Send request",
        onClick: async () => {
          setBusyPlanId(plan.id);
          try {
            await ClientPortalAPI.subscribe(plan.id, cycle, isTrial);
            clearPendingPlan();
            showSuccessToast(isTrial ? "Your trial has started!" : "Request sent. See Overview for payment details.");
            navigate("/portal");
          } catch (error) {
            showErrorToast("Error", getClientError(error, "Couldn't subscribe."));
          } finally {
            setBusyPlanId(null);
          }
        },
      },
    });

  const switchTrialPlan = (plan) =>
    showActionToast({
      title: `Switch to ${plan.name}?`,
      description: "Your trial continues with the same end date. Your system is updated right away.",
      button: {
        title: "Switch",
        onClick: async () => {
          setBusyPlanId(plan.id);
          try {
            await ClientPortalAPI.changeTrialPlan(plan.id);
            showSuccessToast(`Switched to ${plan.name}.`);
            load();
          } catch (error) {
            showErrorToast("Error", getClientError(error, "Couldn't switch plans."));
          } finally {
            setBusyPlanId(null);
          }
        },
      },
    });

  const renderAction = (plan) => {
    const busy = busyPlanId === plan.id;
    const isCurrent = sub && String(sub.plan_id) === String(plan.id) && !canStartNew;

    if (!isOwner) {
      return <p className="text-xs text-center text-gray-500">Only the account owner can change plans.</p>;
    }
    if (isCurrent) {
      return (
        <button type="button" disabled className={btnOutline}>
          Your current plan
        </button>
      );
    }
    if (canStartNew) {
      const trialOk = plan.trial_days > 0 && !mine?.trial_used;
      return (
        <div className="space-y-2">
          {trialOk && (
            <button type="button" onClick={() => subscribe(plan, true)} disabled={busy} className={btnPrimary}>
              {busy ? "Starting..." : `Start ${plan.trial_days}-day free trial`}
            </button>
          )}
          <button
            type="button"
            onClick={() => subscribe(plan, false)}
            disabled={busy}
            className={trialOk ? btnOutline : btnPrimary}
          >
            {busy && !trialOk ? "Sending..." : "Subscribe"}
          </button>
        </div>
      );
    }
    if (onTrial) {
      return (
        <button type="button" onClick={() => switchTrialPlan(plan)} disabled={busy} className={btnOutline}>
          {busy ? "Switching..." : "Switch to this plan"}
        </button>
      );
    }
    return (
      <a href={`mailto:${BRAND.supportEmail}?subject=Plan change: ${plan.name}`} className={`${btnOutline} block text-center`}>
        Contact us to switch
      </a>
    );
  };

  if (loading) return <div className="py-20 text-center text-gray-400">Loading...</div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Plans</h1>
          <p className="text-sm text-gray-500">
            {canStartNew && "Pick a plan to get started."}
            {onTrial && "You're on a trial. You can switch plans freely until it ends."}
            {status === "PENDING" && "Your request is waiting for payment. Withdraw it on Overview to choose another plan."}
            {["ACTIVE", "SUSPENDED"].includes(status) && "To change a paid plan, contact us and we'll move you over."}
          </p>
        </div>
        {(canStartNew || onTrial) && <CycleToggle cycle={cycle} onChange={setCycle} />}
      </div>

      <PricingCards
        plans={plans}
        cycle={onTrial ? sub.billing_cycle : cycle}
        renderAction={renderAction}
        currentPlanId={!canStartNew ? sub?.plan_id : null}
        highlightCode={highlightCode}
      />
    </div>
  );
};

export default ClientPlans;
