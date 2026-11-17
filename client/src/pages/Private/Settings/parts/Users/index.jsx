import React, { useState, useEffect } from "react";
import FloatingInput from "../../../../../components/Forms/FloatingInput";
import FloatingSelect from "../../../../../components/Forms/FloatingSelect";
import Table from "../../../../../components/Tables/index";
import Drawer from "../../../../../components/Modals/AntdDrawer";
import ToggleStatusButton from "../../../../../components/Buttons/ToggleStatus";
import { TbXboxXFilled } from "react-icons/tb";
import { LuSaveAll } from "react-icons/lu";
import {
  showErrorToast,
  showSuccessToast,
  showWarningToast,
} from "../../../../../components/ActionsCenter/Alerts/Sileo";
import UsersAPI from "../../../../../api/private/maintenance/usersAPI";

// Developer accounts (master_users), separate from employee user accounts
const Users = () => {
  const headers = ["Username", "Access", "Status", "Created By", "Actions"];
  const keys = ["username", "access_name", "status", "create_by", "actions"];

  const [users, setUsers] = useState([]);
  const [accessOptions, setAccessOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // form state
  const [accessId, setAccessId] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("ACTIVE");

  const isEditing = editingId !== null;

  useEffect(() => {
    fetchUsers();
    fetchAccessOptions();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const data = await UsersAPI.loadUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      showErrorToast("Error", "Failed to load users");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAccessOptions = async () => {
    try {
      const data = await UsersAPI.loadAccessOptions();
      setAccessOptions(Array.isArray(data) ? data : []);
    } catch {
      showErrorToast("Error", "Failed to load access roles");
    }
  };

  const resetForm = () => {
    setEditingId(null);
    // Default to the first system role (they're listed first)
    const firstSystem = accessOptions.find((a) => a.is_system);
    setAccessId(firstSystem ? String(firstSystem.id) : "");
    setUsername("");
    setPassword("");
    setStatus("ACTIVE");
  };

  const openAddDrawer = () => {
    resetForm();
    fetchAccessOptions();
    setIsDrawerOpen(true);
  };

  const handleEditClick = async (row) => {
    try {
      const data = await UsersAPI.getUsers(row.id);
      const user = Array.isArray(data) ? data[0] : null;
      if (!user) return showWarningToast("Warning", "User not found");

      setEditingId(user.id);
      setAccessId(String(user.access_id ?? ""));
      setUsername(user.username || "");
      setPassword("");
      setStatus(user.status || "ACTIVE");
      fetchAccessOptions();
      setIsDrawerOpen(true);
    } catch {
      showErrorToast("Error", "Failed to load user data");
    }
  };

  const closeDrawer = () => {
    if (isSaving) return;
    setIsDrawerOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const name = username.trim();

    if (!accessId || !name || (!isEditing && !password)) {
      return showWarningToast("Warning", "Please fill in all required fields");
    }

    setIsSaving(true);
    try {
      if (isEditing) {
        await UsersAPI.editUsers(editingId, accessId, name, password, status);
        showSuccessToast("Success", "User updated successfully");
      } else {
        await UsersAPI.addUsers(accessId, name, password);
        showSuccessToast("Success", "User added successfully");
      }
      setIsDrawerOpen(false);
      fetchUsers();
    } catch (error) {
      console.error(error);
      const httpStatus = error?.response?.status;
      const backendMsg = error?.response?.data?.msg || error?.response?.data?.message;
      const fallback = isEditing ? "Failed to update user" : "Failed to add user";

      // 4xx are validation problems the user can fix; anything else is an error
      if (httpStatus && httpStatus < 500 && typeof backendMsg === "string") {
        showWarningToast("Warning", backendMsg);
      } else {
        showErrorToast("Error", typeof backendMsg === "string" && backendMsg ? backendMsg : fallback);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDropdownClick = ({ key }) => {
    if (key === "add-new") openAddDrawer();
  };

  const tableData = users.map((user) => ({
    id: user.id,
    username: user.username || "—",
    access_name: user.access_name || "N/A",
    status: user.status,
    create_by: user.create_by || "-",
    actions: "",
  }));

  // System roles are marked so they're easy to tell apart
  const roleOptions = accessOptions.map((a) => ({
    value: String(a.id),
    label: a.is_system ? `${a.name} (system)` : a.name,
  }));

  return (
    <div className="p-5">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-lg font-semibold">Developer Users</h2>
          <p className="text-sm text-gray-500">Developer and admin logins, separate from employee user accounts</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl shadow">
        <Table
          headers={headers}
          data={tableData}
          keys={keys}
          withEdit={true}
          isLoading={isLoading}
          dropdownItems={[{ key: "add-new", label: "Add New User" }]}
          onItemClick={handleDropdownClick}
          onEditClick={handleEditClick}
        />
      </div>

      <Drawer
        isOpen={isDrawerOpen}
        onClose={closeDrawer}
        title={isEditing ? "Edit User" : "Add New User"}
        width={420}
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <FloatingSelect
            id="access_id"
            label="Access Role"
            value={accessId}
            onChange={(e) => setAccessId(e.target.value)}
            options={roleOptions}
          />
          {accessOptions.length === 0 && (
            <p className="text-xs text-amber-700 dark:text-amber-400 -mt-2">No active roles yet.</p>
          )}

          <FloatingInput
            id="username"
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <FloatingInput
            id="password"
            label={isEditing ? "New Password (Optional)" : "Password"}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {isEditing && (
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Status</label>
              <ToggleStatusButton
                value={status === "ACTIVE"}
                onChange={(val) => setStatus(val ? "ACTIVE" : "INACTIVE")}
                statusOptions={[
                  { label: "ACTIVE", value: true },
                  { label: "INACTIVE", value: false },
                ]}
              />
            </div>
          )}

          <div className="flex justify-between space-x-4 mt-6 pt-4 border-t">
            <button
              type="button"
              onClick={closeDrawer}
              disabled={isSaving}
              className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 flex items-center space-x-2 disabled:opacity-50"
            >
              <TbXboxXFilled />
              <span>Cancel</span>
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 rounded-md flex items-center space-x-2 disabled:opacity-60"
              style={{
                backgroundColor: "var(--main-color)",
                color: "var(--main-text-color)",
              }}
            >
              <LuSaveAll />
              <span>{isSaving ? "Saving..." : `${isEditing ? "Update" : "Add"} User`}</span>
            </button>
          </div>
        </form>
      </Drawer>
    </div>
  );
};

export default Users;