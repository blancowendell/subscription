import React, { useEffect, useMemo, useState } from "react";
import FloatingInput from "../../../../../components/Forms/FloatingInput";
import FloatingSelect from "../../../../../components/Forms/FloatingSelect";
import Table from "../../../../../components/Tables";
import Drawer from "../../../../../components/Modals/AntdDrawer";
import { TbXboxXFilled } from "react-icons/tb";
import { LuSaveAll } from "react-icons/lu";
import {
  showErrorToast,
  showSuccessToast,
  showWarningToast,
} from "../../../../../components/ActionsCenter/Alerts/Sileo";
import WarehouseAPI from "../../../../../api/private/master/warehouseListAPI";
import CompanyAPI from "../../../../../api/private/master/companyAPI";
import ToggleStatusButton from "../../../../../components/Buttons/ToggleStatus";
import { usePermissions } from "../../../../../api/public/auth/parts/permissionsContext";

const Warehouse = () => {
  const { can } = usePermissions();
  const canCreate = can("warehouses", "create");
  const canEdit = can("warehouses", "edit");

  const [warehouses, setWarehouses] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [id, setId] = useState(null);

  // form state
  const [warehouseName, setWarehouseName] = useState("");
  const [warehouseAddress, setWarehouseAddress] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [originalCompanyId, setOriginalCompanyId] = useState("");
  const [status, setStatus] = useState("ACTIVE");

  useEffect(() => {
    loadWarehouses();
    loadCompanies();
  }, []);

  const loadWarehouses = async () => {
    setIsLoading(true);
    try {
      const data = await WarehouseAPI.loadMasterWarehouse();
      setWarehouses(Array.isArray(data) ? data : []);
    } catch {
      showErrorToast("Error", "Failed to load warehouses");
    } finally {
      setIsLoading(false);
    }
  };

  const loadCompanies = async () => {
    try {
      const data = await CompanyAPI.loadMasterCompany();
      setCompanies(Array.isArray(data) ? data : []);
    } catch {
      showErrorToast("Error", "Failed to load companies");
    }
  };

  const activeCompanies = useMemo(() => companies.filter((c) => c.status === "ACTIVE"), [companies]);

  // Active companies, plus the warehouse's current company when editing (even if it's inactive)
  const companyOptions = useMemo(() => {
    const list = [...activeCompanies];
    if (isEditMode && originalCompanyId && !list.some((c) => String(c.id) === String(originalCompanyId))) {
      const current = companies.find((c) => String(c.id) === String(originalCompanyId));
      if (current) list.push(current);
    }
    return list.map((c) => ({
      value: String(c.id),
      label: c.status === "ACTIVE" ? c.name : `${c.name} (inactive)`,
    }));
  }, [activeCompanies, companies, isEditMode, originalCompanyId]);

  const openAddDrawer = () => {
    setIsEditMode(false);
    setId(null);
    setWarehouseName("");
    setWarehouseAddress("");
    setCompanyId(activeCompanies.length === 1 ? String(activeCompanies[0].id) : "");
    setOriginalCompanyId("");
    setStatus("ACTIVE");
    loadCompanies();
    setIsDrawerOpen(true);
  };

  const openEditDrawer = async (warehouseId) => {
    try {
      const data = await WarehouseAPI.getMasterWarehouse(warehouseId);
      if (data && data.length > 0) {
        const row = data[0];
        setIsEditMode(true);
        setId(row.id);
        setWarehouseName(row.name || "");
        setWarehouseAddress(row.location || "");
        setCompanyId(String(row.company_id ?? ""));
        setOriginalCompanyId(String(row.company_id ?? ""));
        setStatus(row.status || "ACTIVE");
        loadCompanies();
        setIsDrawerOpen(true);
      }
    } catch {
      showErrorToast("Error", "Failed to load warehouse details");
    }
  };

  const closeDrawer = () => {
    if (isSaving) return;
    setIsDrawerOpen(false);
  };

  const handleSave = async () => {
    const name = warehouseName.trim();
    const address = warehouseAddress.trim();

    if (!name || !companyId) {
      return showWarningToast("Warning", "Warehouse name and company are required");
    }

    setIsSaving(true);
    try {
      if (isEditMode) {
        await WarehouseAPI.editMasterWarehouse(id, name, address, companyId, status);
        showSuccessToast("Success", "Warehouse updated successfully");
      } else {
        await WarehouseAPI.addMasterWarehouse(name, address, companyId);
        showSuccessToast("Success", "Warehouse added successfully");
      }

      setIsDrawerOpen(false);
      loadWarehouses();
    } catch (error) {
      console.error(error);
      const httpStatus = error?.response?.status;
      const backendMsg = error?.response?.data?.msg || error?.response?.data?.message;
      const fallback = isEditMode ? "Failed to update warehouse" : "Failed to add warehouse";

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

  const headers = ["Warehouse Name", "Location", "Company", "Status", "Actions"];
  const keys = ["name", "location", "company_name", "status", "actions"];

  const tableData = warehouses.map((row) => ({
    id: row.id,
    name: row.name,
    location: row.location || "N/A",
    company_name: row.company_name || "N/A",
    status: row.status,
    actions: "",
  }));

  const dropdownItems = canCreate ? [{ key: "add-new", label: "Add New Warehouse" }] : [];

  const handleDropdownClick = ({ key }) => {
    if (key === "add-new" && canCreate) openAddDrawer();
  };

  const noActiveCompanies = companies.length > 0 && activeCompanies.length === 0;

  return (
    <div className="p-5">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Warehouses</h2>
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
        title={isEditMode ? "Edit Warehouse" : "Add Warehouse"}
        width={450}
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
        >
          <FloatingSelect
            id="companyId"
            label="Company"
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
            options={companyOptions}
          />
          {(companies.length === 0 || noActiveCompanies) && (
            <p className="text-xs text-amber-700 dark:text-amber-400 -mt-2">
              No active companies yet. Add one under the Company tab first.
            </p>
          )}

          <FloatingInput
            id="warehouseName"
            label="Warehouse Name"
            value={warehouseName}
            onChange={(e) => setWarehouseName(e.target.value)}
          />

          <FloatingInput
            id="warehouseAddress"
            label="Location (Optional)"
            value={warehouseAddress}
            onChange={(e) => setWarehouseAddress(e.target.value)}
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
              <span>{isSaving ? "Saving..." : `${isEditMode ? "Update" : "Save"} Warehouse`}</span>
            </button>
          </div>
        </form>
      </Drawer>
    </div>
  );
};

export default Warehouse;