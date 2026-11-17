import React, { useState, useEffect, useMemo } from "react";
import FloatingInput from "../../../../../components/Forms/FloatingInput";
import FloatingSelect from "../../../../../components/Forms/FloatingSelect";
import Table from "../../../../../components/Tables/index";
import Drawer from "../../../../../components/Modals/AntdDrawer/index";
import ToggleStatusButton from "../../../../../components/Buttons/ToggleStatus";
import { DrawerActions } from "../../../../../components/Buttons/DrawerActions";
import { FaCheck, FaTimesCircle, FaSave, FaInfoCircle } from "react-icons/fa";

// Shared Template Components
import ExcelTemplateDownload from "../../../../../components/Forms/ExcelTemplateDownload";
import UploadExcel from "../../../../../components/Forms/UploadExcel";

// Alerts
import {
  showErrorToast,
  showSuccessToast,
  showWarningToast,
  showActionToast,
} from "../../../../../components/ActionsCenter/Alerts/Sileo";

// APIs
import EmployeeUsersAPI from "../../../../../api/private/master/employeeUserAPI";
import AccessAPI from "../../../../../api/private/access/accessAPI";
import CompanyAPI from "../../../../../api/private/master/companyAPI";
import WarehouseAPI from "../../../../../api/private/master/warehouseListAPI";
import EmployeeAPI from "../../../../../api/private/master/employeeAPI";

// Extracts the backend message regardless of how the API wrapper throws
const getErrorMessage = (error, fallback) => {
  if (typeof error === "string" && error.trim()) return error;
  const data = error?.response?.data ?? error?.data ?? error;
  if (typeof data === "string" && data.trim()) return data;
  return data?.msg || data?.message || data?.error || fallback;
};

const isActive = (row) => !row?.status || row.status === "ACTIVE";

const btnPrimary =
  "px-5 py-2 rounded-md flex items-center gap-2 bg-main hover:bg-main-hover text-[var(--main-text-color)] text-sm font-medium transition-colors disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed";
const btnSecondary =
  "px-4 py-2 rounded-md flex items-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm transition-colors dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-gray-100 disabled:opacity-50";

const StepBadge = ({ n, done, active }) => (
  <span
    className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold shrink-0 ${
      done
        ? "bg-green-600 text-white"
        : active
          ? "bg-main text-[var(--main-text-color)]"
          : "bg-gray-200 text-gray-500 dark:bg-slate-700 dark:text-gray-400"
    }`}
  >
    {done ? <FaCheck size={10} /> : n}
  </span>
);

const stepCardClass = (active) =>
  `rounded-xl p-4 flex flex-col gap-3 border transition-colors ${
    active ? "border-main/40 bg-main/5" : "border-gray-200 dark:border-slate-800"
  }`;

const Note = ({ children }) => (
  <p className="text-xs text-amber-700 dark:text-amber-400 -mt-2">{children}</p>
);

const EmployeeUsers = () => {
  const headers = ["Full Name", "Access", "Company", "Warehouse", "Actions"];
  const keys = ["fullname", "access_name", "company_name", "warehouse_name", "actions"];
  const tableOptions = { withEdit: true };

  // --- SERVER-SIDE PAGINATION STATES ---
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [isTableLoading, setIsTableLoading] = useState(true);

  // --- DATA STATES ---
  const [users, setUsers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [accesses, setAccesses] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [lookupsLoaded, setLookupsLoaded] = useState(false);

  // UI Control States
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState("FORM"); // "FORM" or "IMPORT"
  const [editingUser, setEditingUser] = useState(null);

  // Form states
  const [username, setUsername] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [accessId, setAccessId] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Bulk Upload Specific States
  const [uploadFile, setUploadFile] = useState(null);
  const [hasDownloaded, setHasDownloaded] = useState(false);

  const [isResettingAll, setIsResettingAll] = useState(false);

  // Excel Schema Configuration
  const templateHeaders = ["EMPLOYEE ID", "FIRST NAME", "LAST NAME", "EMAIL"];

  const activeCompanies = useMemo(() => companies.filter(isActive), [companies]);
  const defaultCompanyId = activeCompanies.length === 1 ? String(activeCompanies[0].id) : "";

  // Only the selected company's active warehouses
  const companyWarehouses = useMemo(
    () => warehouses.filter((w) => isActive(w) && String(w.company_id) === String(companyId)),
    [warehouses, companyId],
  );

  const employeeOptions = employees.map((emp) => ({
    value: String(emp.id),
    label: `${emp.first_name} ${emp.last_name} (${emp.id})`,
  }));
  const accessOptions = accesses.map((a) => ({ value: String(a.id), label: a.name }));
  const companyOptions = activeCompanies.map((c) => ({ value: String(c.id), label: c.name }));
  const warehouseOptions = companyWarehouses.map((w) => ({ value: String(w.id), label: w.name }));

  // Import readiness
  const missingSettings = [!accessId && "access role", !companyId && "company", !warehouseId && "warehouse"].filter(
    Boolean,
  );

  const settingsDone = missingSettings.length === 0;
  const step1Done = hasDownloaded || !!uploadFile;
  const activeStep = !step1Done ? 1 : !settingsDone ? 2 : !uploadFile ? 3 : 0;
  const importReady = settingsDone && !!uploadFile && !isSubmitting;

  const importHint = (() => {
    const missing = [...missingSettings];
    if (!uploadFile) missing.push("completed file");
    if (missing.length === 0) return null;
    const list =
      missing.length === 1 ? missing[0] : `${missing.slice(0, -1).join(", ")} and ${missing[missing.length - 1]}`;
    return `Select the ${list} to enable import.`;
  })();

  /* =======================
     INITIAL LOAD & FETCHERS
  ======================= */
  // Each list loads on its own, so one failing endpoint doesn't leave the others empty.
  // System roles are already filtered out by the backend.
  const loadLookups = async () => {
    const [companyRes, warehouseRes, employeeRes, accessRes] = await Promise.allSettled([
      CompanyAPI.loadMasterCompany(),
      WarehouseAPI.loadMasterWarehouse(),
      EmployeeAPI.loadEmployees(),
      AccessAPI.loadAccess(),
    ]);

    const take = (result, label) => {
      if (result.status === "fulfilled") return Array.isArray(result.value) ? result.value : [];
      showErrorToast("Error", getErrorMessage(result.reason, `Failed to load ${label}.`));
      return [];
    };

    setCompanies(take(companyRes, "companies"));
    setWarehouses(take(warehouseRes, "warehouses"));
    setEmployees(take(employeeRes, "employees"));
    setAccesses(take(accessRes, "roles").filter(isActive));
    setLookupsLoaded(true);
  };

  const fetchUsers = async (page = 1, search = searchQuery) => {
    setIsTableLoading(true);
    try {
      const response = await EmployeeUsersAPI.loadEmployeeUsersPaginated(page, 10, search);
      setUsers(response?.data || []);
      setTotalPages(response?.pagination?.totalPages || 1);
      setCurrentPage(page);
    } catch (error) {
      showErrorToast("Error", getErrorMessage(error, "Failed to load user accounts."));
    } finally {
      setIsTableLoading(false);
    }
  };

  useEffect(() => {
    loadLookups();
    fetchUsers(1);
  }, []);

  // Picking an employee fills in their company
  const handleEmployeeChange = (value) => {
    setEmployeeId(value);
    const emp = employees.find((e) => String(e.id) === String(value));
    if (emp?.company_id && String(emp.company_id) !== String(companyId)) {
      setCompanyId(String(emp.company_id));
      setWarehouseId("");
    }
  };

  const handleCompanyChange = (value) => {
    setCompanyId(value);
    setWarehouseId("");
  };

  /* =======================
     CONFIRMED API EXECUTIONS
  ======================= */
  const executeResetAllCredentials = async () => {
    setIsResettingAll(true);
    try {
      const response = await EmployeeUsersAPI.resetAllCredentials();
      const result = response?.data || response || {};
      showSuccessToast("Reset Completed", `${result.success || 0} sent, ${result.skipped || 0} skipped.`);
      if (result.errors && result.errors.length > 0) {
        result.errors.forEach((err) => showErrorToast("Reset Alert", err));
      }
      fetchUsers(currentPage);
    } catch (error) {
      showErrorToast("Error", getErrorMessage(error, "Failed to reset credentials."));
    } finally {
      setIsResettingAll(false);
    }
  };

  const handleResetAllCredentials = () => {
    showActionToast({
      title: "Reset All Credentials?",
      description: "This will generate a new password for every active user and email it to them. Continue?",
      button: {
        title: "Reset All",
        onClick: () => executeResetAllCredentials(),
      },
    });
  };

  const executeSubmit = async () => {
    setIsSubmitting(true);
    try {
      if (editingUser) {
        await EmployeeUsersAPI.editEmployeeUsers(
          editingUser.id,
          accessId,
          companyId,
          warehouseId,
          username,
          password,
          status,
        );
        showSuccessToast("Success", "User account updated successfully.");
      } else {
        await EmployeeUsersAPI.addEmployeeUsers(employeeId, accessId, companyId, warehouseId, username, password);
        showSuccessToast("Success", "User account created successfully.");
      }
      fetchUsers(currentPage);
      closeDrawer();
    } catch (error) {
      console.error(error);
      showErrorToast("Error", getErrorMessage(error, "Failed to save the user account."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!employeeId || !username || (!editingUser && !password) || !accessId || !companyId || !warehouseId) {
      return showWarningToast("Warning", "Please fill in all required fields.");
    }

    showActionToast({
      title: editingUser ? "Update User Account?" : "Create User Account?",
      description: `Are you sure you want to ${editingUser ? "update" : "create"} the account for ${username}?`,
      button: {
        title: "Confirm",
        onClick: () => executeSubmit(),
      },
    });
  };

  const executeImportSubmit = async () => {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("access_id", accessId);
      formData.append("company_id", companyId);
      formData.append("warehouse_id", warehouseId);

      const response = await EmployeeUsersAPI.importEmployeeUsers(formData);

      showSuccessToast("Import Completed", response?.message || "Spreadsheet batch imported successfully!");

      if (response?.errors && response.errors.length > 0) {
        response.errors.forEach((err) => showErrorToast("Import Alert", err));
      }

      fetchUsers(1);
      loadLookups();
      closeDrawer();
    } catch (error) {
      console.error(error);
      showErrorToast("Error", getErrorMessage(error, "Excel batch processing failure."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImportSubmit = (e) => {
    e.preventDefault();
    if (!uploadFile) {
      return showWarningToast("Warning", "Please select a valid Excel file first.");
    }
    if (!settingsDone) {
      return showWarningToast("Warning", "Please complete the account settings in Step 2.");
    }

    showActionToast({
      title: "Import User Accounts?",
      description: "This will create user accounts for every row in the file using the selected settings. Continue?",
      button: {
        title: "Import",
        onClick: () => executeImportSubmit(),
      },
    });
  };

  const handleEditClick = async (row) => {
    try {
      const data = await EmployeeUsersAPI.getEmployeeUsers(row.id);
      if (data && data.length > 0) {
        const user = data[0];
        setEditingUser(user);
        setEmployeeId(String(user.employee_id));
        setUsername(user.username);
        setPassword("");
        setCompanyId(String(user.company_id));
        setWarehouseId(String(user.warehouse_id));
        setStatus(user.status);
        setAccessId(String(user.access_id));

        setDrawerMode("FORM");
        setIsDrawerOpen(true);
      }
    } catch (error) {
      showErrorToast("Error", getErrorMessage(error, "Failed to load the user account."));
    }
  };

  const resetForm = () => {
    setEmployeeId("");
    setUsername("");
    setPassword("");
    setAccessId("");
    setCompanyId(defaultCompanyId);
    setWarehouseId("");
    setStatus("ACTIVE");
    setUploadFile(null);
    setHasDownloaded(false);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setEditingUser(null);
    resetForm();
  };

  const handleDropdownClick = ({ key }) => {
    if (key === "add-new" || key === "bulk-import") {
      setEditingUser(null);
      resetForm();
      loadLookups();
      setDrawerMode(key === "add-new" ? "FORM" : "IMPORT");
      setIsDrawerOpen(true);
    } else if (key === "reset-all-credentials") {
      handleResetAllCredentials();
    }
  };

  const dropdownItems = [
    { key: "add-new", label: "Add New User" },
    { key: "bulk-import", label: "Bulk Import Spreadsheet" },
    {
      key: "reset-all-credentials",
      label: isResettingAll ? "Resetting..." : "Reset All Credentials",
    },
  ];

  const tableData = users.map((user) => ({
    id: user.id,
    fullname: user.fullname,
    access_name: user.ma_name || "N/A",
    company_name: user.mc_name || "N/A",
    warehouse_name: user.mw_name || "N/A",
    status: user.status,
    actions: "",
  }));

  const editingEmployeeName = (() => {
    const emp = employees.find((e) => String(e.id) === String(employeeId));
    return emp ? `${emp.first_name} ${emp.last_name}` : editingUser?.fullname || "Unknown Employee";
  })();

  // Empty-list hints, shown only once loading has finished
  const missingNotes = {
    employees: lookupsLoaded && employees.length === 0 && "No employees yet. Add one under Master → Employees first.",
    roles: lookupsLoaded && accesses.length === 0 && "No roles yet. Create one under Access first.",
    companies: lookupsLoaded && activeCompanies.length === 0 && "No active companies yet.",
    warehouses:
      lookupsLoaded &&
      companyId &&
      companyWarehouses.length === 0 &&
      "This company has no active warehouses. Add one under Master → Warehouses first.",
  };

  const settingsFields = (
    <>
      <FloatingSelect
        label="Access Role"
        value={accessId}
        onChange={(e) => setAccessId(e.target.value)}
        options={accessOptions}
      />
      {missingNotes.roles && <Note>{missingNotes.roles}</Note>}

      <FloatingSelect
        label="Company"
        value={companyId}
        onChange={(e) => handleCompanyChange(e.target.value)}
        options={companyOptions}
      />
      {missingNotes.companies && <Note>{missingNotes.companies}</Note>}

      <FloatingSelect
        label="Warehouse"
        value={warehouseId}
        onChange={(e) => setWarehouseId(e.target.value)}
        options={warehouseOptions}
        disabled={!companyId}
      />
      {missingNotes.warehouses && <Note>{missingNotes.warehouses}</Note>}
    </>
  );

  return (
    <div className="p-5 space-y-3">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold">User Accounts</h2>
          <p className="text-sm text-gray-500">Login accounts for employees, by role, company and warehouse</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl shadow">
        <Table
          headers={headers}
          data={tableData}
          keys={keys}
          {...tableOptions}
          dropdownItems={dropdownItems}
          onItemClick={handleDropdownClick}
          onEditClick={handleEditClick}
          isLoading={isTableLoading}
          serverSide={true}
          serverTotalPages={totalPages}
          currentPage={currentPage}
          onPageChange={(newPage) => fetchUsers(newPage)}
          onExternalSearch={(term) => {
            setSearchQuery(term);
            fetchUsers(1, term);
          }}
        />
      </div>

      <Drawer
        isOpen={isDrawerOpen}
        onClose={closeDrawer}
        title={
          drawerMode === "IMPORT" ? "Bulk Import User Accounts" : editingUser ? "Edit User Account" : "Create User Account"
        }
        width={drawerMode === "IMPORT" ? 500 : 600}
      >
        {drawerMode === "FORM" ? (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              {editingUser ? (
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Employee</label>
                  <div className="px-3 py-2.5 rounded-md border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-gray-200 font-medium">
                    {editingEmployeeName}
                  </div>
                </div>
              ) : (
                <>
                  <FloatingSelect
                    label="Select Employee"
                    value={employeeId}
                    onChange={(e) => handleEmployeeChange(e.target.value)}
                    options={employeeOptions}
                  />
                  {missingNotes.employees && <Note>{missingNotes.employees}</Note>}
                </>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FloatingInput label="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
              <FloatingInput
                label={editingUser ? "New Password (Optional)" : "Password"}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {settingsFields}

            {editingUser && (
              <div className="py-2">
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Account Status</label>
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

            <div className="pt-4 mt-auto">
              <DrawerActions onCancel={closeDrawer} isEditing={!!editingUser} isLoading={isSubmitting} />
            </div>
          </form>
        ) : (
          <form className="flex flex-col gap-4 h-full" onSubmit={handleImportSubmit}>
            {/* Step 1 — Download */}
            <div className={stepCardClass(activeStep === 1)}>
              <div className="flex items-center gap-2">
                <StepBadge n={1} done={step1Done} active={activeStep === 1} />
                <span className="text-sm font-semibold">Download the template</span>
              </div>
              <p className="text-[13px] text-gray-500 m-0">
                Fill in Employee ID, First Name, Last Name, and Email. Don't rename or reorder the columns.
              </p>
              <div onClickCapture={() => setHasDownloaded(true)}>
                <ExcelTemplateDownload headers={templateHeaders} templateName="Employee_User_Bulk_Import" />
              </div>
            </div>

            {/* Step 2 — Account settings */}
            <div className={stepCardClass(activeStep === 2)}>
              <div className="flex items-center gap-2">
                <StepBadge n={2} done={settingsDone} active={activeStep === 2} />
                <span className="text-sm font-semibold">Choose account settings</span>
              </div>
              <div className="flex gap-2 rounded-lg bg-main/10 text-gray-700 dark:text-gray-200 text-[13px] px-3 py-2">
                <FaInfoCircle className="mt-0.5 shrink-0 text-main" />
                These settings apply to every user in the file. Employees not found by ID are created under the
                selected company. Passwords are auto-generated (Last Name + Access ID).
              </div>

              {settingsFields}
            </div>

            {/* Step 3 — Upload */}
            <div className={stepCardClass(activeStep === 3)}>
              <div className="flex items-center gap-2">
                <StepBadge n={3} done={!!uploadFile} active={activeStep === 3} />
                <span className="text-sm font-semibold">Upload your completed file</span>
              </div>
              <p className="text-[13px] text-gray-500 m-0">Select the template you filled in, then click Import.</p>
              <UploadExcel label="" file={uploadFile} setFile={setUploadFile} isLoading={isSubmitting} />
            </div>

            {/* Footer */}
            <div className="mt-auto pt-4 border-t border-gray-200 dark:border-slate-800 flex flex-col gap-2">
              <div className="flex justify-between gap-3">
                <button type="button" onClick={closeDrawer} disabled={isSubmitting} className={btnSecondary}>
                  <FaTimesCircle /> Cancel
                </button>
                <button type="submit" disabled={!importReady} className={btnPrimary}>
                  <FaSave />
                  {isSubmitting ? "Importing..." : "Import users"}
                </button>
              </div>
              {importHint && <p className="text-xs text-gray-500 text-right m-0">{importHint}</p>}
            </div>
          </form>
        )}
      </Drawer>
    </div>
  );
};

export default EmployeeUsers;