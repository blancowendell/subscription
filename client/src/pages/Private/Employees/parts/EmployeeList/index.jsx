import React, { useState, useEffect } from "react";
import FloatingInput from "../../../../../components/Forms/FloatingInput";
import FloatingSelect from "../../../../../components/Forms/FloatingSelect";
import Table from "../../../../../components/Tables/index";
import Drawer from "../../../../../components/Modals/AntdDrawer/index";
import { FaCheck, FaTimesCircle, FaSave } from "react-icons/fa";
import {
  showErrorToast,
  showSuccessToast,
  showWarningToast,
} from "../../../../../components/ActionsCenter/Alerts/Sileo";
import EmployeeAPI from "../../../../../api/private/master/employeeAPI";
import SequenceAPI from "../../../../../api/private/maintenance/sequenceAPI";
import CompanyAPI from "../../../../../api/private/master/companyAPI";
import ToggleStatusButton from "../../../../../components/Buttons/ToggleStatus";
import { DrawerActions } from "../../../../../components/Buttons/DrawerActions";

// Shared Template Components
import ExcelTemplateDownload from "../../../../../components/Forms/ExcelTemplateDownload";
import UploadExcel from "../../../../../components/Forms/UploadExcel";

const btnPrimary =
  "px-5 py-2 rounded-md flex items-center gap-2 bg-main hover:bg-main-hover text-[var(--main-text-color)] text-sm font-medium transition-colors disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed";
const btnSecondary =
  "px-4 py-2 rounded-md flex items-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm transition-colors dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-gray-100 disabled:opacity-50";

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.response?.data?.msg || fallback;

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

const EmployeeList = () => {
  const headers = ["Employee ID", "Full Name", "Email", "Company", "Actions"];
  const keys = ["itemId", "name", "email", "company", "actions"];
  const tableOptions = { withImage: true, withEdit: true };

  // --- SERVER-SIDE PAGINATION STATES ---
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [isTableLoading, setIsTableLoading] = useState(true);

  // --- DATA STATES ---
  const [employees, setEmployees] = useState([]);
  const [sequences, setSequences] = useState([]);
  const [sequencesLoaded, setSequencesLoaded] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [companiesLoaded, setCompaniesLoaded] = useState(false);

  // UI Control States
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState("FORM");
  const [editingEmployee, setEditingEmployee] = useState(null);

  // Form Fields States
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [email, setEmail] = useState("");
  const [sequenceId, setSequenceId] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [status, setStatus] = useState("ACTIVE");

  // Bulk Upload Specific States
  const [uploadFile, setUploadFile] = useState(null);
  const [importSequenceId, setImportSequenceId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasDownloaded, setHasDownloaded] = useState(false);

  // Excel Schema Configuration
  const templateHeaders = ["First Name", "Last Name", "Email Address"];

  const activeCompanies = companies.filter((c) => c.status === "ACTIVE");
  const defaultCompanyId = activeCompanies.length === 1 ? String(activeCompanies[0].id) : "";

  // Import readiness
  const importMissing = [
    !companyId && "company",
    !importSequenceId && "sequence",
    !uploadFile && "completed file",
  ].filter(Boolean);
  const importReady = importMissing.length === 0 && !isSubmitting;
  const importHint = importMissing.length
    ? `Select the ${importMissing.length === 1 ? importMissing[0] : `${importMissing.slice(0, -1).join(", ")} and ${importMissing[importMissing.length - 1]}`} to enable import.`
    : null;

  const sequenceOptions = sequences.map((seq) => ({
    value: String(seq.id),
    label: `${seq.name} (next: ${seq.preview})`,
  }));

  const companyOptions = activeCompanies.map((c) => ({
    value: String(c.id),
    label: c.name,
  }));

  const companyName = (id) => companies.find((c) => String(c.id) === String(id))?.name || "N/A";

  const noSequences = sequencesLoaded && sequences.length === 0;
  const noCompanies = companiesLoaded && activeCompanies.length === 0;

  /* =======================
     INITIAL LOAD & FETCHERS
  ======================= */
  // Active sequences only; refreshed each time the drawer opens so the "next" value is current
  const loadSequences = async () => {
    try {
      const sequenceData = await SequenceAPI.loadListSequence();
      setSequences(Array.isArray(sequenceData) ? sequenceData : []);
    } catch (error) {
      setSequences([]);
      showErrorToast("Error", getErrorMessage(error, "Failed to load sequences."));
    } finally {
      setSequencesLoaded(true);
    }
  };

  const loadCompanies = async () => {
    try {
      const companyData = await CompanyAPI.loadMasterCompany();
      setCompanies(Array.isArray(companyData) ? companyData : []);
    } catch (error) {
      setCompanies([]);
      showErrorToast("Error", getErrorMessage(error, "Failed to load companies."));
    } finally {
      setCompaniesLoaded(true);
    }
  };

  const fetchEmployees = async (page = 1, search = searchQuery) => {
    setIsTableLoading(true);
    try {
      const response = await EmployeeAPI.loadEmployeesPaginated(page, 10, search);
      setEmployees(response?.data || []);
      setTotalPages(response?.pagination?.totalPages || 1);
      setCurrentPage(page);
    } catch (error) {
      showErrorToast("Error", getErrorMessage(error, "Failed to load employees"));
    } finally {
      setIsTableLoading(false);
    }
  };

  useEffect(() => {
    loadSequences();
    loadCompanies();
    fetchEmployees(1);
  }, []);

  useEffect(() => {
    if (editingEmployee) {
      setFirstname(editingEmployee.first_name || "");
      setLastname(editingEmployee.last_name || "");
      setEmail(editingEmployee.email || "");
      setCompanyId(editingEmployee.company_id ? String(editingEmployee.company_id) : "");
      setStatus(editingEmployee.status || "ACTIVE");
    }
  }, [editingEmployee]);

  const resetForm = () => {
    setFirstname("");
    setLastname("");
    setEmail("");
    setSequenceId("");
    setCompanyId(defaultCompanyId);
    setStatus("ACTIVE");
    setUploadFile(null);
    setImportSequenceId("");
    setHasDownloaded(false);
  };

  const openDrawer = (mode = "FORM") => {
    setDrawerMode(mode);
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setEditingEmployee(null);
    resetForm();
  };

  /* =======================
     API HANDLERS
  ======================= */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!firstname.trim() || !lastname.trim() || !email.trim()) {
      showWarningToast("Warning", "First name, last name, and email are required.");
      return;
    }
    if (!editingEmployee && !companyId) {
      showWarningToast("Warning", "Select a company.");
      return;
    }
    if (!editingEmployee && !sequenceId) {
      showWarningToast("Warning", "Select an employee ID sequence.");
      return;
    }

    setIsSubmitting(true);
    try {
      let response;
      if (editingEmployee) {
        response = await EmployeeAPI.updateEmployee(editingEmployee.id, firstname, lastname, email, status);
      } else {
        response = await EmployeeAPI.addEmployee(firstname, lastname, email, sequenceId, companyId);
      }

      if (response?.msg === "exist") {
        showWarningToast("Warning", "Employee already exists!");
        return;
      }

      showSuccessToast(editingEmployee ? "Employee updated successfully!" : "Employee added successfully!");

      fetchEmployees(currentPage);
      loadSequences();
      closeDrawer();
    } catch (error) {
      console.error(error);
      showErrorToast("Error", getErrorMessage(error, "Failed to save employee record."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImportSubmit = async (e) => {
    e.preventDefault();
    if (!importReady) {
      showWarningToast("Warning", importHint || "Complete the import settings first.");
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("sequenceId", importSequenceId);
      formData.append("companyId", companyId);

      const response = await EmployeeAPI.importEmployeesExcel(formData);

      showSuccessToast(response?.data?.message || response?.message || "Spreadsheet batch imported successfully!");
      fetchEmployees(1);
      loadSequences();
      closeDrawer();
    } catch (error) {
      console.error(error);
      if (error.response && Array.isArray(error.response.data)) {
        error.response.data.forEach((warn) => {
          showErrorToast("Error", `Row ${warn.row}: ${warn.message}`);
        });
      } else {
        showErrorToast("Error", getErrorMessage(error, "Excel batch processing failure."));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = async (row) => {
    try {
      const [detailedEmployee] = await EmployeeAPI.getEmployee(row.id);
      setEditingEmployee(detailedEmployee);
      openDrawer("FORM");
    } catch (error) {
      showErrorToast("Error", getErrorMessage(error, "Failed to load employee details."));
    }
  };

  const handleDropdownClick = ({ key }) => {
    if (key === "add-new" || key === "bulk-import") {
      setEditingEmployee(null);
      resetForm();
      loadSequences();
      openDrawer(key === "add-new" ? "FORM" : "IMPORT");
    }
  };

  const dropdownItems = [
    { key: "add-new", label: "Add New Employee" },
    { key: "bulk-import", label: "Bulk Import Spreadsheet" },
  ];

  const data = employees.map((emp) => ({
    id: emp.id,
    itemId: emp.id,
    name: `${emp.first_name || ""} ${emp.last_name || ""}`.trim(),
    email: emp.email,
    company: companyName(emp.company_id),
    actions: "",
  }));

  return (
    <div className="p-5 space-y-3">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold">Employees</h2>
          <p className="text-sm text-gray-500">Master data for staff management</p>
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
          serverSide={true}
          serverTotalPages={totalPages}
          currentPage={currentPage}
          onPageChange={(newPage) => fetchEmployees(newPage)}
          onExternalSearch={(term) => {
            setSearchQuery(term);
            fetchEmployees(1, term);
          }}
        />
      </div>

      <Drawer
        isOpen={isDrawerOpen}
        onClose={closeDrawer}
        title={drawerMode === "IMPORT" ? "Bulk Import Employees" : editingEmployee ? "Edit Employee" : "Add New Employee"}
        width={420}
      >
        {drawerMode === "FORM" ? (
          <form className="space-y-4 h-full flex flex-col" onSubmit={handleSubmit}>
            <FloatingInput id="firstname" label="First Name" value={firstname} onChange={(e) => setFirstname(e.target.value)} />
            <FloatingInput id="lastname" label="Last Name" value={lastname} onChange={(e) => setLastname(e.target.value)} />
            <FloatingInput id="email" label="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} />

            {editingEmployee ? (
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Company</label>
                <div className="px-3 py-2.5 rounded-md border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-gray-200">
                  {companyName(companyId)}
                </div>
              </div>
            ) : (
              <>
                <FloatingSelect
                  id="companyId"
                  label="Company"
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  options={companyOptions}
                />
                {noCompanies && <Note>No active companies yet. Create one under Master → Companies first.</Note>}

                <FloatingSelect
                  id="sequenceId"
                  label="Employee ID Sequence"
                  value={sequenceId}
                  onChange={(e) => setSequenceId(e.target.value)}
                  options={sequenceOptions}
                />
                {noSequences && <Note>No active sequences yet. Create one under Maintenance → Sequences first.</Note>}
              </>
            )}

            {editingEmployee && (
              <div className="bg-slate-500/5 p-3 rounded-xl border border-gray-100 dark:border-slate-800">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Account Status</label>
                <ToggleStatusButton
                  value={status === "ACTIVE" || status === true}
                  onChange={(val) => setStatus(val ? "ACTIVE" : "INACTIVE")}
                  statusOptions={[
                    { label: "ACTIVE", value: true },
                    { label: "INACTIVE", value: false },
                  ]}
                />
                <p className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
                  Applies to every user account linked to this employee.
                </p>
              </div>
            )}

            <div className="pt-6 mt-auto">
              <DrawerActions onCancel={closeDrawer} isEditing={!!editingEmployee} isLoading={isSubmitting} />
            </div>
          </form>
        ) : (
          <form className="flex flex-col gap-4 h-full" onSubmit={handleImportSubmit}>
            {/* Step 1 */}
            <div className={stepCardClass(!uploadFile)}>
              <div className="flex items-center gap-2">
                <StepBadge n={1} done={hasDownloaded || !!uploadFile} active={!uploadFile} />
                <span className="text-sm font-semibold">Download the template</span>
              </div>
              <p className="text-[13px] text-gray-500 m-0">
                Fill in First Name, Last Name, and Email Address. Don't rename or reorder the columns.
              </p>
              <div onClickCapture={() => setHasDownloaded(true)}>
                <ExcelTemplateDownload headers={templateHeaders} templateName="Employee_Bulk_Import_Layout" />
              </div>
            </div>

            {/* Step 2 */}
            <div className={stepCardClass(!!uploadFile)}>
              <div className="flex items-center gap-2">
                <StepBadge n={2} done={false} active={!!uploadFile} />
                <span className="text-sm font-semibold">Upload your completed file</span>
              </div>
              <p className="text-[13px] text-gray-500 m-0">
                Every employee in the file joins the selected company and gets an ID from the selected sequence.
              </p>

              <FloatingSelect
                id="importCompanyId"
                label="Company"
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                options={companyOptions}
              />
              {noCompanies && <Note>No active companies yet. Create one under Master → Companies first.</Note>}

              <FloatingSelect
                id="importSequenceId"
                label="Employee ID Sequence"
                value={importSequenceId}
                onChange={(e) => setImportSequenceId(e.target.value)}
                options={sequenceOptions}
              />
              {noSequences && <Note>No active sequences yet. Create one under Maintenance → Sequences first.</Note>}

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
                  {isSubmitting ? "Importing..." : "Import employees"}
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

export default EmployeeList;