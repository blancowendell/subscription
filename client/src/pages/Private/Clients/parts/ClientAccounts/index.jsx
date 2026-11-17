import React, { useState, useEffect, useRef } from "react";
import FloatingInput from "../../../../../components/Forms/FloatingInput";
import FloatingSelect from "../../../../../components/Forms/FloatingSelect";
import Table from "../../../../../components/Tables/index";
import Drawer from "../../../../../components/Modals/AntdDrawer/index";
import { DrawerActions } from "../../../../../components/Buttons/DrawerActions";
import { FaCheckCircle, FaTimesCircle, FaSpinner } from "react-icons/fa";
import {
  showErrorToast,
  showSuccessToast,
  showWarningToast,
} from "../../../../../components/ActionsCenter/Alerts/Sileo";
import ClientAccountAPI from "../../../../../api/private/subscription/clientAccountAPI";

// Extracts the backend message regardless of how the API wrapper throws
const getErrorMessage = (error, fallback) => {
  if (typeof error === "string" && error.trim()) return error;
  const data = error?.response?.data ?? error?.data ?? error;
  if (typeof data === "string" && data.trim()) return data;
  return data?.msg || data?.message || data?.error || fallback;
};

const BUSINESS_TYPES = ["RETAIL", "TRADING", "RESTAURANT", "MANUFACTURING", "SERVICES", "OTHER"];
const BUSINESS_TYPE_OPTIONS = BUSINESS_TYPES.map((t) => ({ value: t, label: t }));
const STATUS_OPTIONS = [
  { value: "PENDING", label: "PENDING · waiting for email verification" },
  { value: "ACTIVE", label: "ACTIVE" },
  { value: "BLOCKED", label: "BLOCKED · can't log in or subscribe" },
];

const CODE_PATTERN = /^[A-Z][A-Z0-9]*$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EMPTY_FORM = {
  tenantCode: "",
  companyName: "",
  tin: "",
  address: "",
  businessType: "",
  contactPerson: "",
  contactEmail: "",
  contactPhone: "",
  status: "ACTIVE",
};

const Section = ({ title, children }) => (
  <div className="bg-slate-500/5 p-3 rounded-xl border border-gray-100 dark:border-slate-800 space-y-4">
    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">{title}</label>
    {children}
  </div>
);

// Live availability check for the tenant code (debounced)
const useTenantCodeCheck = (code, enabled) => {
  const [state, setState] = useState({ checking: false, available: null, reason: null });
  const lastRequest = useRef(0);

  useEffect(() => {
    if (!enabled || !code) {
      setState({ checking: false, available: null, reason: null });
      return;
    }
    if (code.length < 3 || !CODE_PATTERN.test(code)) {
      setState({
        checking: false,
        available: false,
        reason: "3–20 characters, starts with a letter, letters and numbers only.",
      });
      return;
    }

    const requestId = ++lastRequest.current;
    setState((s) => ({ ...s, checking: true }));

    const timer = setTimeout(async () => {
      try {
        const result = await ClientAccountAPI.checkTenantCode(code);
        if (requestId !== lastRequest.current) return;
        setState({ checking: false, available: !!result?.available, reason: result?.reason || null });
      } catch {
        if (requestId !== lastRequest.current) return;
        setState({ checking: false, available: null, reason: null });
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [code, enabled]);

  return state;
};

const ClientAccounts = () => {
  const headers = ["Tenant Code", "Company", "Business Type", "Contact", "Email", "Status", "Actions"];
  const keys = ["tenant_code", "company_name", "business_type", "contact_person", "contact_email", "status", "actions"];
  const tableOptions = { withEdit: true };

  const [accounts, setAccounts] = useState([]);
  const [isTableLoading, setIsTableLoading] = useState(true);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setField = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const codeCheck = useTenantCodeCheck(form.tenantCode, isDrawerOpen && !editingAccount);

  /* =======================
     INITIAL LOAD & FETCHERS
  ======================= */
  const fetchAccounts = async () => {
    setIsTableLoading(true);
    try {
      const data = await ClientAccountAPI.loadClientAccounts();
      setAccounts(Array.isArray(data) ? data : []);
    } catch (error) {
      showErrorToast("Error", getErrorMessage(error, "Failed to load client accounts."));
    } finally {
      setIsTableLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setEditingAccount(null);
    setForm(EMPTY_FORM);
  };

  /* =======================
     API HANDLERS
  ======================= */
  const validate = () => {
    if (!editingAccount) {
      if (!form.tenantCode) return "Tenant code is required.";
      if (codeCheck.available === false) return codeCheck.reason || "Tenant code is not available.";
    }
    if (!form.companyName.trim()) return "Company name is required.";
    if (form.tin.trim() && !/^[0-9-]+$/.test(form.tin.trim())) return "TIN can only use numbers and dashes.";
    if (!form.businessType) return "Select a business type.";
    if (!form.contactPerson.trim()) return "Contact person is required.";
    if (!EMAIL_PATTERN.test(form.contactEmail.trim())) return "Contact email is not valid.";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const invalid = validate();
    if (invalid) {
      showWarningToast("Warning", invalid);
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingAccount) {
        await ClientAccountAPI.updateClientAccount(editingAccount.id, form);
      } else {
        await ClientAccountAPI.addClientAccount(form);
      }

      showSuccessToast(editingAccount ? "Client account updated successfully!" : "Client account added successfully!");
      fetchAccounts();
      closeDrawer();
    } catch (error) {
      console.error(error);
      const message = getErrorMessage(error, "Failed to save client account.");
      if (message === "exist") {
        showWarningToast("Warning", "That tenant code is already taken.");
      } else {
        showErrorToast("Error", message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = async (row) => {
    try {
      const [account] = await ClientAccountAPI.getClientAccount(row.id);
      if (!account) return;
      setEditingAccount(account);
      setForm({
        tenantCode: account.tenant_code || "",
        companyName: account.company_name || "",
        tin: account.tin || "",
        address: account.address || "",
        businessType: account.business_type || "",
        contactPerson: account.contact_person || "",
        contactEmail: account.contact_email || "",
        contactPhone: account.contact_phone || "",
        status: account.status || "ACTIVE",
      });
      setIsDrawerOpen(true);
    } catch (error) {
      showErrorToast("Error", getErrorMessage(error, "Failed to load client account details."));
    }
  };

  const handleDropdownClick = ({ key }) => {
    if (key === "add-new") {
      setEditingAccount(null);
      setForm(EMPTY_FORM);
      setIsDrawerOpen(true);
    }
  };

  const dropdownItems = [{ key: "add-new", label: "Add New Client" }];

  const data = accounts.map((a) => ({
    id: a.id,
    tenant_code: a.tenant_code,
    company_name: a.company_name,
    business_type: a.business_type,
    contact_person: a.contact_person,
    contact_email: a.contact_email,
    status: a.status,
    actions: "",
  }));

  const CodeHint = () => {
    if (!form.tenantCode) {
      return (
        <p className="mt-1 text-[11px] text-gray-500">
          Becomes the ERP company code and database name (tenant_{"<code>"}). Can't be changed later.
        </p>
      );
    }
    if (codeCheck.checking) {
      return (
        <p className="mt-1 text-[11px] text-gray-500 flex items-center gap-1">
          <FaSpinner className="animate-spin" /> Checking…
        </p>
      );
    }
    if (codeCheck.available === true) {
      return (
        <p className="mt-1 text-[11px] text-green-600 flex items-center gap-1">
          <FaCheckCircle /> Available
        </p>
      );
    }
    if (codeCheck.available === false) {
      return (
        <p className="mt-1 text-[11px] text-red-600 flex items-center gap-1">
          <FaTimesCircle /> {codeCheck.reason || "Not available"}
        </p>
      );
    }
    return null;
  };

  return (
    <div className="p-5 space-y-3">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold">Client Accounts</h2>
          <p className="text-sm text-gray-500">Customer companies; each one becomes a tenant in the ERP</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl shadow">
        <Table
          headers={headers}
          data={data}
          keys={keys}
          {...tableOptions}
          dropdownItems={dropdownItems}
          onItemClick={handleDropdownClick}
          onEditClick={handleEditClick}
          isLoading={isTableLoading}
        />
      </div>

      <Drawer
        isOpen={isDrawerOpen}
        onClose={closeDrawer}
        title={editingAccount ? `Edit Client · ${editingAccount.tenant_code}` : "Add New Client"}
        width={520}
      >
        <form className="space-y-4 h-full flex flex-col" onSubmit={handleSubmit}>
          <Section title="Company">
            {editingAccount ? (
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Tenant Code</label>
                <div className="px-3 py-2.5 rounded-md border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-gray-200 font-medium">
                  {editingAccount.tenant_code}
                </div>
                <p className="mt-1 text-[11px] text-gray-500">Locked: it's the ERP company code and database name.</p>
              </div>
            ) : (
              <div>
                <FloatingInput
                  id="tenantCode"
                  label="Tenant Code (e.g. ACME)"
                  value={form.tenantCode}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, tenantCode: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20) }))
                  }
                />
                <CodeHint />
              </div>
            )}

            <FloatingInput id="companyName" label="Company Name" value={form.companyName} onChange={setField("companyName")} />

            <div className="grid grid-cols-2 gap-4">
              <FloatingSelect
                id="businessType"
                label="Business Type"
                value={form.businessType}
                onChange={setField("businessType")}
                options={BUSINESS_TYPE_OPTIONS}
              />
              <FloatingInput id="tin" label="TIN (optional)" value={form.tin} onChange={setField("tin")} />
            </div>

            <FloatingInput id="address" label="Address (optional)" value={form.address} onChange={setField("address")} />
          </Section>

          <Section title="Contact">
            <FloatingInput
              id="contactPerson"
              label="Contact Person"
              value={form.contactPerson}
              onChange={setField("contactPerson")}
            />
            <div className="grid grid-cols-2 gap-4">
              <FloatingInput
                id="contactEmail"
                label="Contact Email"
                value={form.contactEmail}
                onChange={setField("contactEmail")}
              />
              <FloatingInput
                id="contactPhone"
                label="Phone (optional)"
                value={form.contactPhone}
                onChange={setField("contactPhone")}
              />
            </div>
            {!editingAccount && (
              <p className="text-[11px] text-gray-500 -mt-2">
                This is the company contact only. Add portal logins under Client Users.
              </p>
            )}
          </Section>

          {editingAccount && (
            <Section title="Account Status">
              <FloatingSelect
                id="accountStatus"
                label="Status"
                value={form.status}
                onChange={setField("status")}
                options={STATUS_OPTIONS}
              />
              <p className="text-[11px] text-gray-500 -mt-2">
                Blocking stops portal logins. It doesn't suspend the ERP; suspend the subscription for that.
              </p>
            </Section>
          )}

          <div className="pt-6 mt-auto">
            <DrawerActions onCancel={closeDrawer} isEditing={!!editingAccount} isLoading={isSubmitting} />
          </div>
        </form>
      </Drawer>
    </div>
  );
};

export default ClientAccounts;
