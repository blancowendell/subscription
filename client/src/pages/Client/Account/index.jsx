import React, { useEffect, useState } from "react";
import FloatingInput from "../../../components/Forms/FloatingInput";
import { showErrorToast, showSuccessToast, showWarningToast } from "../../../components/ActionsCenter/Alerts/Sileo";
import ClientPortalAPI from "../../../api/client/clientPortalAPI";
import ClientAuthAPI from "../../../api/client/clientAuthAPI";
import { getClientError } from "../../../api/client/clientAxios";
import { useClientAuth } from "../../../api/client/clientAuthContext";

const btnPrimary =
  "px-5 py-2.5 rounded-md inline-flex items-center justify-center gap-2 bg-[#E00000] hover:bg-[#B80000] text-white text-sm font-medium transition-colors disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const Card = ({ title, subtitle, children }) => (
  <div className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
    <h2 className="text-lg font-semibold">{title}</h2>
    {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
    <div className="mt-5">{children}</div>
  </div>
);

const ReadOnly = ({ label, value }) => (
  <div>
    <div className="text-xs text-gray-500">{label}</div>
    <div className="font-medium">{value || "—"}</div>
  </div>
);

const ClientAccount = () => {
  const { client, isOwner, updateClient } = useClientAuth();

  const [account, setAccount] = useState(null);
  const [form, setForm] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [isChanging, setIsChanging] = useState(false);

  const setField = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  useEffect(() => {
    ClientPortalAPI.getMyAccount()
      .then((a) => {
        setAccount(a);
        setForm({
          companyName: a.company_name || "",
          tin: a.tin || "",
          address: a.address || "",
          contactPerson: a.contact_person || "",
          contactEmail: a.contact_email || "",
          contactPhone: a.contact_phone || "",
        });
      })
      .catch((error) => showErrorToast("Error", getClientError(error, "Couldn't load your account.")));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.companyName.trim()) return showWarningToast("Warning", "Company name is required.");
    if (form.tin.trim() && !/^[0-9-]+$/.test(form.tin.trim()))
      return showWarningToast("Warning", "TIN can only use numbers and dashes.");
    if (!form.contactPerson.trim()) return showWarningToast("Warning", "Contact person is required.");
    if (!EMAIL_PATTERN.test(form.contactEmail.trim())) return showWarningToast("Warning", "Contact email is not valid.");

    setIsSaving(true);
    try {
      await ClientPortalAPI.updateMyAccount(form);
      updateClient({ company_name: form.companyName.trim() });
      showSuccessToast("Company details saved.");
    } catch (error) {
      showErrorToast("Error", getClientError(error, "Couldn't save your details."));
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!pw.current) return showWarningToast("Warning", "Enter your current password.");
    if (pw.next.length < 8) return showWarningToast("Warning", "New password must be at least 8 characters.");
    if (!/[A-Za-z]/.test(pw.next) || !/[0-9]/.test(pw.next))
      return showWarningToast("Warning", "New password must have at least one letter and one number.");
    if (pw.next !== pw.confirm) return showWarningToast("Warning", "New passwords don't match.");

    setIsChanging(true);
    try {
      await ClientAuthAPI.changePassword(pw.current, pw.next);
      updateClient({ is_update_password: false });
      setPw({ current: "", next: "", confirm: "" });
      showSuccessToast("Password changed.");
    } catch (error) {
      showErrorToast("Error", getClientError(error, "Couldn't change your password."));
    } finally {
      setIsChanging(false);
    }
  };

  if (!account || !form) return <div className="py-20 text-center text-gray-400">Loading...</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-semibold">Account</h1>

      <Card title="Company" subtitle={isOwner ? "Shown on your invoices and system." : "Only the account owner can edit these."}>
        <div className="grid sm:grid-cols-2 gap-4 mb-5">
          <ReadOnly label="Company code" value={account.tenant_code} />
          <ReadOnly label="Type of business" value={account.business_type} />
        </div>

        {isOwner ? (
          <form className="space-y-4" onSubmit={handleSave}>
            <FloatingInput id="acCompany" label="Company name" value={form.companyName} onChange={setField("companyName")} />
            <div className="grid sm:grid-cols-2 gap-4">
              <FloatingInput id="acTin" label="TIN (optional)" value={form.tin} onChange={setField("tin")} />
              <FloatingInput id="acPhone" label="Phone (optional)" value={form.contactPhone} onChange={setField("contactPhone")} />
            </div>
            <FloatingInput id="acAddress" label="Address (optional)" value={form.address} onChange={setField("address")} />
            <div className="grid sm:grid-cols-2 gap-4">
              <FloatingInput
                id="acContact"
                label="Contact person"
                value={form.contactPerson}
                onChange={setField("contactPerson")}
              />
              <FloatingInput
                id="acContactEmail"
                label="Contact email"
                value={form.contactEmail}
                onChange={setField("contactEmail")}
              />
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={isSaving} className={btnPrimary}>
                {isSaving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            <ReadOnly label="Company name" value={account.company_name} />
            <ReadOnly label="TIN" value={account.tin} />
            <ReadOnly label="Address" value={account.address} />
            <ReadOnly label="Phone" value={account.contact_phone} />
            <ReadOnly label="Contact person" value={account.contact_person} />
            <ReadOnly label="Contact email" value={account.contact_email} />
          </div>
        )}
      </Card>

      <Card title="Your login" subtitle={`${client?.fullname} · ${client?.email} · ${client?.role}`}>
        {client?.is_update_password && (
          <p className="text-sm text-amber-700 dark:text-amber-400 mb-4">
            You're using a temporary password. Please set your own below.
          </p>
        )}
        <form className="space-y-4" onSubmit={handleChangePassword}>
          <FloatingInput
            id="pwCurrent"
            label="Current password"
            type="password"
            value={pw.current}
            onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))}
          />
          <div className="grid sm:grid-cols-2 gap-4">
            <FloatingInput
              id="pwNext"
              label="New password"
              type="password"
              value={pw.next}
              onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))}
            />
            <FloatingInput
              id="pwConfirm"
              label="Confirm new password"
              type="password"
              value={pw.confirm}
              onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))}
            />
          </div>
          <div className="flex justify-between items-center">
            <p className="text-[11px] text-gray-500">At least 8 characters, with a letter and a number.</p>
            <button type="submit" disabled={isChanging} className={btnPrimary}>
              {isChanging ? "Changing..." : "Change password"}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default ClientAccount;
