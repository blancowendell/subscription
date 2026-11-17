import React, { useEffect, useState } from "react";
import FloatingInput from "../../../../../components/Forms/FloatingInput";
import Table from "../../../../../components/Tables";
import Drawer from "../../../../../components/Modals/AntdDrawer";
import { TbXboxXFilled } from "react-icons/tb";
import { LuSaveAll } from "react-icons/lu";
import {
  showErrorToast,
  showSuccessToast,
  showWarningToast,
} from "../../../../../components/ActionsCenter/Alerts/Sileo";
import CompanyAPI from "../../../../../api/private/master/companyAPI";
import ToggleStatusButton from "../../../../../components/Buttons/ToggleStatus";
import { usePermissions } from "../../../../../api/public/auth/parts/permissionsContext";

const Company = () => {
  const { can } = usePermissions();
  const canCreate = can("company", "create");
  const canEdit = can("company", "edit");

  const [companies, setCompanies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [id, setId] = useState(null);

  // form state
  const [companyName, setCompanyName] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [status, setStatus] = useState("ACTIVE");

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    setIsLoading(true);
    try {
      const data = await CompanyAPI.loadMasterCompany();
      setCompanies(Array.isArray(data) ? data : []);
    } catch {
      showErrorToast("Error", "Failed to load companies");
    } finally {
      setIsLoading(false);
    }
  };

  const openAddDrawer = () => {
    setIsEditMode(false);
    setId(null);
    setCompanyName("");
    setCompanyAddress("");
    setStatus("ACTIVE");
    setIsDrawerOpen(true);
  };

  const openEditDrawer = async (companyId) => {
    try {
      const data = await CompanyAPI.getMasterCompany(companyId);
      if (data && data.length > 0) {
        const row = data[0];
        setIsEditMode(true);
        setId(row.id);
        setCompanyName(row.name || "");
        setCompanyAddress(row.address || "");
        setStatus(row.status || "ACTIVE");
        setIsDrawerOpen(true);
      }
    } catch {
      showErrorToast("Error", "Failed to load company details");
    }
  };

  const closeDrawer = () => {
    if (isSaving) return;
    setIsDrawerOpen(false);
  };

  const handleSave = async () => {
    const name = companyName.trim();
    const address = companyAddress.trim();

    if (!name || !address) {
      return showWarningToast("Warning", "Company name and address are required");
    }

    setIsSaving(true);
    try {
      if (isEditMode) {
        await CompanyAPI.editMasterCompany(id, name, address, status);
        showSuccessToast("Success", "Company updated successfully");
      } else {
        await CompanyAPI.addMasterCompany(name, address);
        showSuccessToast("Success", "Company added successfully");
      }

      setIsDrawerOpen(false);
      loadCompanies();
    } catch (error) {
      console.error(error);
      const httpStatus = error?.response?.status;
      const backendMsg = error?.response?.data?.msg || error?.response?.data?.message;
      const fallback = isEditMode ? "Failed to update company" : "Failed to add company";

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

  const headers = ["Company Name", "Address", "Status", "Actions"];
  const keys = ["name", "address", "status", "actions"];

  const tableData = companies.map((row) => ({
    id: row.id,
    name: row.name,
    address: row.address,
    status: row.status,
    actions: "",
  }));

  const dropdownItems = canCreate ? [{ key: "add-new", label: "Add New Company" }] : [];

  const handleDropdownClick = ({ key }) => {
    if (key === "add-new" && canCreate) openAddDrawer();
  };

  return (
    <div className="p-5">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Companies</h2>
      </div>
      <div className="overflow-x-auto rounded-xl shadow">
        <Table
          headers={headers}
          data={tableData}
          keys={keys}
          withEdit={canEdit}
          isLoading={isLoading}
          dropdownItems={dropdownItems}
          onItemClick={handleDropdownClick}
          onEditClick={(row) => openEditDrawer(row.id)}
        />
      </div>

      <Drawer
        isOpen={isDrawerOpen}
        onClose={closeDrawer}
        title={isEditMode ? "Edit Company" : "Add Company"}
        width={450}
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
        >
          <FloatingInput
            id="companyName"
            label="Company Name"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />

          <FloatingInput
            id="companyAddress"
            label="Company Address"
            value={companyAddress}
            onChange={(e) => setCompanyAddress(e.target.value)}
          />

          {isEditMode && (
            <div className="mb-4">
              <label className="block text-gray-700 dark:text-gray-300 mb-2">Status</label>
              <ToggleStatusButton
                value={status}
                onChange={(val) => setStatus(val)}
                statusOptions={[
                  { label: "ACTIVE", value: "ACTIVE" },
                  { label: "INACTIVE", value: "INACTIVE" },
                ]}
              />
            </div>
          )}

          <div className="flex justify-between space-x-4 mt-6 pt-4 border-t">
            <button
              type="button"
              onClick={closeDrawer}
              disabled={isSaving}
              className="px-4 py-2 bg-gray-300 rounded-md flex items-center space-x-2 disabled:opacity-50"
            >
              <TbXboxXFilled />
              <span>Cancel</span>
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 rounded-md flex items-center space-x-2 shadow-sm disabled:opacity-60"
              style={{
                backgroundColor: "var(--main-color)",
                color: "var(--main-text-color)",
              }}
            >
              <LuSaveAll />
              <span>{isSaving ? "Saving..." : `${isEditMode ? "Update" : "Save"} Company`}</span>
            </button>
          </div>
        </form>
      </Drawer>
    </div>
  );
};

export default Company;