import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { FaUserPlus } from "react-icons/fa";
import FloatingInput from "../../../components/Forms/FloatingInput";
import FloatingSelect from "../../../components/Forms/FloatingSelect";
import {
  showErrorToast,
  showSuccessToast,
  showWarningToast,
  showActionToast,
} from "../../../components/ActionsCenter/Alerts/Sileo";
import ClientPortalAPI from "../../../api/client/clientPortalAPI";
import { getClientError } from "../../../api/client/clientAxios";
import { useClientAuth } from "../../../api/client/clientAuthContext";

const btnPrimary =
  "px-5 py-2.5 rounded-md inline-flex items-center justify-center gap-2 bg-[#E00000] hover:bg-[#B80000] text-white text-sm font-medium transition-colors disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLE_OPTIONS = [
  { value: "BILLING", label: "Billing · sees subscription and payments" },
  { value: "OWNER", label: "Owner · full control" },
];

const ClientUsersPage = () => {
  const { client, isOwner } = useClientAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState({ fullname: "", email: "", role: "BILLING" });
  const [isInviting, setIsInviting] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    try {
      const data = await ClientPortalAPI.loadUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      showErrorToast("Error", getClientError(error, "Couldn't load users."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOwner) load();
  }, [isOwner]);

  if (!isOwner) return <Navigate to="/portal" replace />;

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!invite.fullname.trim()) return showWarningToast("Warning", "Full name is required.");
    if (!EMAIL_PATTERN.test(invite.email.trim())) return showWarningToast("Warning", "Email is not valid.");

    setIsInviting(true);
    try {
      const response = await ClientPortalAPI.inviteUser(invite.fullname.trim(), invite.email.trim().toLowerCase(), invite.role);
      if (response?.msg && response.msg !== "success" && !response?.data) {
        showWarningToast("Added", response.msg);
      } else {
        showSuccessToast("Invite sent", `${invite.email.trim()} will get a link to set their password.`);
      }
      setInvite({ fullname: "", email: "", role: "BILLING" });
      load();
    } catch (error) {
      showErrorToast("Error", getClientError(error, "Couldn't invite the user."));
    } finally {
      setIsInviting(false);
    }
  };

  const updateUser = (user, patch, label) =>
    showActionToast({
      title: `${label}?`,
      description: `${label} for ${user.email}.`,
      button: {
        title: label,
        onClick: async () => {
          setBusyId(user.id);
          try {
            await ClientPortalAPI.updateUser(user.id, patch.role || user.role, patch.status || user.status);
            showSuccessToast("Saved.");
            load();
          } catch (error) {
            showErrorToast("Error", getClientError(error, "Couldn't update the user."));
          } finally {
            setBusyId(null);
          }
        },
      },
    });

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold">Users</h1>
        <p className="text-sm text-gray-500">People who can manage {client?.company_name}'s subscription.</p>
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
        <h2 className="text-lg font-semibold mb-4">Invite someone</h2>
        <form className="grid md:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end" onSubmit={handleInvite}>
          <FloatingInput
            id="invName"
            label="Full name"
            value={invite.fullname}
            onChange={(e) => setInvite((i) => ({ ...i, fullname: e.target.value }))}
          />
          <FloatingInput
            id="invEmail"
            label="Email"
            value={invite.email}
            onChange={(e) => setInvite((i) => ({ ...i, email: e.target.value }))}
          />
          <FloatingSelect
            id="invRole"
            label="Role"
            value={invite.role}
            onChange={(e) => setInvite((i) => ({ ...i, role: e.target.value }))}
            options={ROLE_OPTIONS}
          />
          <button type="submit" disabled={isInviting} className={btnPrimary}>
            <FaUserPlus /> {isInviting ? "Sending..." : "Invite"}
          </button>
        </form>
        <p className="text-[11px] text-gray-500 mt-2">They'll get an email link to set their own password (valid 72 hours).</p>
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-gray-400">Loading...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-slate-800/50 text-left text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Last login</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {users.map((u) => {
                const isMe = Number(u.id) === Number(client?.id);
                const busy = busyId === u.id;
                return (
                  <tr key={u.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium">
                        {u.fullname} {isMe && <span className="text-xs text-gray-400">(you)</span>}
                      </div>
                      <div className="text-xs text-gray-500">{u.email}</div>
                    </td>
                    <td className="px-4 py-3">{u.role}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          u.status === "ACTIVE"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                            : "bg-gray-200 text-gray-700 dark:bg-slate-700 dark:text-gray-300"
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {u.last_login_at ? String(u.last_login_at).slice(0, 16) : "Never"}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {isMe ? (
                        <span className="text-xs text-gray-400">—</span>
                      ) : (
                        <div className="inline-flex gap-3">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              updateUser(
                                u,
                                { role: u.role === "OWNER" ? "BILLING" : "OWNER" },
                                u.role === "OWNER" ? "Make billing" : "Make owner"
                              )
                            }
                            className="text-xs text-[#E00000] hover:underline disabled:opacity-50"
                          >
                            {u.role === "OWNER" ? "Make billing" : "Make owner"}
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              updateUser(
                                u,
                                { status: u.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" },
                                u.status === "ACTIVE" ? "Deactivate" : "Activate"
                              )
                            }
                            className={`text-xs hover:underline disabled:opacity-50 ${
                              u.status === "ACTIVE" ? "text-red-600" : "text-green-600"
                            }`}
                          >
                            {u.status === "ACTIVE" ? "Deactivate" : "Activate"}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ClientUsersPage;
