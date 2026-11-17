import React, { useState, useEffect, useMemo } from "react";
import FloatingInput from "../../../../../components/Forms/FloatingInput";
import FloatingSelect from "../../../../../components/Forms/FloatingSelect";
import Table from "../../../../../components/Tables/index";
import Drawer from "../../../../../components/Modals/AntdDrawer/index";
import ToggleStatusButton from "../../../../../components/Buttons/ToggleStatus";
import { DrawerActions } from "../../../../../components/Buttons/DrawerActions";
import { FaKey, FaRandom, FaCopy } from "react-icons/fa";
import {
  showErrorToast,
  showSuccessToast,
  showWarningToast,
  showActionToast,
} from "../../../../../components/ActionsCenter/Alerts/Sileo";
import ClientAccountAPI from "../../../../../api/private/subscription/clientAccountAPI";
import ClientUserAPI from "../../../../../api/private/subscription/clientUserAPI";

// Extracts the backend message regardless of how the API wrapper throws
const getErrorMessage = (error, fallback) => {
  if (typeof error === "string" && error.trim()) return error;
  const data = error?.response?.data ?? error?.data ?? error;
  if (typeof data === "string" && data.trim()) return data;
  return data?.msg || data?.message || data?.error || fallback;
};

const btnSecondary =
  "px-4 py-2 rounded-md flex items-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm transition-colors dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-gray-100 disabled:opacity-50";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ROLE_OPTIONS = [
  { value: "OWNER", label: "OWNER · manages the subscription" },
  { value: "BILLING", label: "BILLING · billing and payments only" },
];

// Same rule as the backend: 8+ chars, at least one letter and one number
const passwordProblem = (pw) => {
  if (!pw) return "Password is required.";
  if (pw.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) return "Password must have at least one letter and one number.";
  return null;
};

// Readable temporary password, e.g. "Kx7mPq2wTd"
const generatePassword = () => {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const all = letters + digits;
  const pick = (set) => set[crypto.getRandomValues(new Uint32Array(1))[0] % set.length];
  const chars = [pick(letters), pick(digits), ...Array.from({ length: 8 }, () => pick(all))];
  return chars.sort(() => crypto.getRandomValues(new Uint32Array(1))[0] - 2 ** 31).join("");
};

const copyText = async (value) => {
  try {
    await navigator.clipboard.writeText(value);
    showSuccessToast("Copied to clipboard");
  } catch {
    showWarningToast("Warning", "Couldn't copy. Select and copy it manually.");
  }
};

const EMPTY_FORM = { fullname: "", email: "", role: "OWNER", password: "", status: "ACTIVE" };

// Defined outside the page so the input keeps focus while typing
const PasswordField = ({ id, label, value, onChange }) => (
  <div className="flex gap-2 items-end">
    <div className="flex-1">
      <FloatingInput id={id} label={label} value={value} onChange={onChange} />
    </div>
    <button type="button" title="Generate" onClick={() => onChange({ target: { value: generatePassword() } })} className={btnSecondary}>
      <FaRandom />
    </button>
    <button type="button" title="Copy" onClick={() => copyText(value)} disabled={!value} className={btnSecondary}>
      <FaCopy />
    </button>
  </div>
);

const Section = ({ title, children }) => (
  <div className="bg-slate-500/5 p-3 rounded-xl border border-gray-100 dark:border-slate-800 space-y-4">
    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">{title}</label>
    {children}
  </div>
);

const ClientUsers = () => {
  const headers = ["Full Name", "Email", "Role", "Verified", "Last Login", "Status", "Actions"];
  const keys = ["fullname", "email", "role", "verified", "last_login", "status", "actions"];
  const tableOptions = { withEdit: true };

  const [accounts, setAccounts] = useState([]);
  const [accountsLoaded, setAccountsLoaded] = useState(false);
  const [accountId, setAccountId] = useState("");

  const [users, setUsers] = useState([]);
  const [isTableLoading, setIsTableLoading] = useState(false);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [resetPassword, setResetPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const setField = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const accountOptions = useMemo(
    () =>
      accounts.map((a) => ({
        value: String(a.id),
        label: `${a.tenant_code} · ${a.company_name}${a.status === "ACTIVE" ? "" : ` (${a.status})`}`,
      })),
    [accounts]
  );
  const selectedAccount = accounts.find((a) => String(a.id) === String(accountId));
  const accountBlocked = selectedAccount?.status === "BLOCKED";

  /* =======================
     INITIAL LOAD & FETCHERS
  ======================= */
  const loadAccounts = async () => {
    try {
      const data = await ClientAccountAPI.loadClientAccounts();
      setAccounts(Array.isArray(data) ? data : []);
    } catch (error) {
      setAccounts([]);
      showErrorToast("Error", getErrorMessage(error, "Failed to load client accounts."));
    } finally {
      setAccountsLoaded(true);
    }
  };

  const fetchUsers = async (id = accountId) => {
    if (!id) {
      setUsers([]);
      return;
    }
    setIsTableLoading(true);
    try {
      const data = await ClientUserAPI.loadClientUsers(id);
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      showErrorToast("Error", getErrorMessage(error, "Failed to load client users."));
    } finally {
      setIsTableLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const handleAccountChange = (value) => {
    setAccountId(value);
    fetchUsers(value);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setEditingUser(null);
    setForm(EMPTY_FORM);
    setResetPassword("");
  };

  /* =======================
     API HANDLERS
  ======================= */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.fullname.trim()) return showWarningToast("Warning", "Full name is required.");
    if (!EMAIL_PATTERN.test(form.email.trim())) return showWarningToast("Warning", "Email is not valid.");
    if (!editingUser) {
      const problem = passwordProblem(form.password);
      if (problem) return showWarningToast("Warning", problem);
    }

    setIsSubmitting(true);
    try {
      if (editingUser) {
        await ClientUserAPI.updateClientUser(editingUser.id, form.fullname, form.email, form.role, form.status);
        showSuccessToast("Client user updated successfully!");
      } else {
        await ClientUserAPI.addClientUser(accountId, form.fullname, form.email, form.role, form.password);
        showSuccessToast("Client user added. Share the temporary password; they'll change it on first login.");
      }
      fetchUsers();
      closeDrawer();
    } catch (error) {
      console.error(error);
      const message = getErrorMessage(error, "Failed to save client user.");
      if (message === "exist") {
        showWarningToast("Warning", "That email is already used by another client user.");
      } else {
        showErrorToast("Error", message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const executeResetPassword = async () => {
    setIsResetting(true);
    try {
      await ClientUserAPI.resetClientUserPassword(editingUser.id, resetPassword);
      showSuccessToast("Password reset. They'll be asked to change it on next login.");
      setResetPassword("");
    } catch (error) {
      showErrorToast("Error", getErrorMessage(error, "Failed to reset password."));
    } finally {
      setIsResetting(false);
    }
  };

  const handleResetPassword = () => {
    const problem = passwordProblem(resetPassword);
    if (problem) return showWarningToast("Warning", problem);

    showActionToast({
      title: "Reset password?",
      description: `Set a new temporary password for ${editingUser.email}?`,
      button: { title: "Reset", onClick: () => executeResetPassword() },
    });
  };

  const handleEditClick = async (row) => {
    try {
      const [user] = await ClientUserAPI.getClientUser(row.id);
      if (!user) return;
      setEditingUser(user);
      setForm({
        fullname: user.fullname || "",
        email: user.email || "",
        role: user.role || "OWNER",
        password: "",
        status: user.status || "ACTIVE",
      });
      setResetPassword("");
      setIsDrawerOpen(true);
    } catch (error) {
      showErrorToast("Error", getErrorMessage(error, "Failed to load client user details."));
    }
  };

  const handleDropdownClick = ({ key }) => {
    if (key === "add-new") {
      if (!accountId) return showWarningToast("Warning", "Select a client account first.");
      if (accountBlocked) return showWarningToast("Warning", "This client account is blocked.");
      setEditingUser(null);
      setForm({ ...EMPTY_FORM, password: generatePassword() });
      setIsDrawerOpen(true);
    }
  };

  const dropdownItems = [{ key: "add-new", label: "Add New User" }];

  const data = users.map((u) => ({
    id: u.id,
    fullname: u.fullname,
    email: u.email,
    role: u.role,
    verified: Number(u.is_verified) === 1 || u.is_verified === true ? "Yes" : "No",
    last_login: u.last_login_at ? String(u.last_login_at).replace("T", " ").slice(0, 16) : "Never",
    status: u.status,
    actions: "",
  }));

  return (
    <div className="p-5 space-y-3">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold">Client Users</h2>
          <p className="text-sm text-gray-500">Client portal logins for each company</p>
        </div>
      </div>

      <div className="max-w-md">
        <FloatingSelect
          id="clientUserAccount"
          label="Client Account"
          value={accountId}
          onChange={(e) => handleAccountChange(e.target.value)}
          options={accountOptions}
        />
        {accountsLoaded && accounts.length === 0 && (
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
            No client accounts yet. Add one under Client Accounts first.
          </p>
        )}
        {accountBlocked && (
          <p className="text-xs text-red-600 mt-1">This account is blocked. Its users can't log in.</p>
        )}
      </div>

      {!accountId ? (
        <div className="py-16 text-center text-gray-400">Select a client account to see its users.</div>
      ) : (
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
      )}

      <Drawer
        isOpen={isDrawerOpen}
        onClose={closeDrawer}
        title={editingUser ? `Edit User · ${editingUser.email}` : `Add User · ${selectedAccount?.tenant_code || ""}`}
        width={480}
      >
        <form className="space-y-4 h-full flex flex-col" onSubmit={handleSubmit}>
          <FloatingInput id="cuFullname" label="Full Name" value={form.fullname} onChange={setField("fullname")} />
          <FloatingInput id="cuEmail" label="Email (login)" value={form.email} onChange={setField("email")} />
          <FloatingSelect id="cuRole" label="Role" value={form.role} onChange={setField("role")} options={ROLE_OPTIONS} />

          {!editingUser && (
            <Section title="Temporary Password">
              <PasswordField
                id="cuPassword"
                label="Password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              />
              <p className="text-[11px] text-gray-500 -mt-2">
                Copy it before saving. The user must change it on first login.
              </p>
            </Section>
          )}

          {editingUser && (
            <>
              <Section title="Account Status">
                <ToggleStatusButton
                  value={form.status === "ACTIVE"}
                  onChange={(val) => setForm((f) => ({ ...f, status: val ? "ACTIVE" : "INACTIVE" }))}
                  statusOptions={[
                    { label: "ACTIVE", value: true },
                    { label: "INACTIVE", value: false },
                  ]}
                />
                <p className="text-[11px] text-gray-500 -mt-2">
                  Each account must keep at least one active OWNER.
                  {Number(editingUser.is_verified) !== 1 && " This user hasn't verified their email yet."}
                </p>
              </Section>

              <Section title="Reset Password">
                <PasswordField
                  id="cuResetPassword"
                  label="New temporary password"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={handleResetPassword}
                  disabled={!resetPassword || isResetting}
                  className={btnSecondary}
                >
                  <FaKey /> {isResetting ? "Resetting..." : "Reset password"}
                </button>
              </Section>
            </>
          )}

          <div className="pt-6 mt-auto">
            <DrawerActions onCancel={closeDrawer} isEditing={!!editingUser} isLoading={isSubmitting} />
          </div>
        </form>
      </Drawer>
    </div>
  );
};

export default ClientUsers;
