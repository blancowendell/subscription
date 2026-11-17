import React, { useState, useEffect } from "react";
import FloatingInput from "../../../../../components/Forms/FloatingInput";
import ToggleStatusButton from "../../../../../components/Buttons/ToggleStatus";
import FloatingTextArea from "../../../../../components/Forms/FloatingTextArea";
import Table from "../../../../../components/Tables/index";
import Drawer from "../../../../../components/Modals/index";
import { TbXboxXFilled } from "react-icons/tb";
import { LuSaveAll } from "react-icons/lu";
import {
  showErrorToast,
  showSuccessToast,
  showWarningToast,
} from "../../../../../components/ActionsCenter/Alerts/Sileo";
import MaintenaceApi from "../../../../../api/private/dev_tools/presetAPI";

// One line per system after a sync
const describeSync = (r) => {
  const parts = [];
  if (r.added) parts.push(`${r.added} added: ${(r.addedNames || []).join(", ")}`);
  if (r.removed) parts.push(`${r.removed} removed: ${(r.removedNames || []).join(", ")}`);
  return parts.length ? parts.join(" · ") : "Already up to date";
};

const MaintenanceApi = () => {
  const headers = ["ID", "Title", "API URL", "Category", "Status", "Actions"];
  const keys = ["id", "name", "api_name", "category", "status", "actions"];
  const tableOptions = { withImage: false, withEdit: true, withDelete: false };

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [apis, setApi] = useState([]);
  const [editingApis, setEditingApis] = useState(null);
  const [syncing, setSyncing] = useState(false);

  const [title, setTitle] = useState("");
  const [apiUrl, setApiUrl] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("");

  const openDrawer = () => setIsDrawerOpen(true);

  useEffect(() => {
    fetchApis();
  }, []);

  useEffect(() => {
    if (editingApis) {
      setTitle(editingApis.name);
      setApiUrl(editingApis.api_name);
      setDescription(editingApis.api_description);
      setStatus(editingApis.status);
    }
  }, [editingApis]);

  const fetchApis = async () => {
    try {
      const data = await MaintenaceApi.loadPreSetApi();
      setApi(data || []);
    } catch (error) {
      showErrorToast("Failed to load APIs");
    }
  };

  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const results = await MaintenaceApi.syncApiList();
      (results || []).forEach((r) => {
        if (r.ok) showSuccessToast(r.system, describeSync(r));
        else showWarningToast(r.system, `Not synced: ${r.error}`);
      });
      await fetchApis();
    } catch (error) {
      console.error(error);
      showErrorToast("Failed to sync data sources");
    } finally {
      setSyncing(false);
    }
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setEditingApis(null);
    resetForm();
  };

  const resetForm = () => {
    setTitle("");
    setApiUrl("");
    setDescription("");
    setStatus("ACTIVE");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let response;
      if (editingApis) {
        response = await MaintenaceApi.editPresetApi(
          editingApis.id,
          title,
          apiUrl,
          description,
          status
        );
      } else {
        response = await MaintenaceApi.addPresetApi(title, apiUrl, description);
      }

      if (response?.msg === "exist") {
        const errorMessage = response?.data || "Api Exist Already Exists.";
        showWarningToast(errorMessage);
        return;
      }

      showSuccessToast(editingApis ? "API updated successfully!" : "API added successfully!");
      await fetchApis();
      closeDrawer();
    } catch (error) {
      console.error(error);
      showErrorToast("Failed to save API");
    }
  };

  const handleEditClick = async (row) => {
    try {
      const [detailedApis] = await MaintenaceApi.getPresetApi(row.id);
      setEditingApis(detailedApis);
      setIsDrawerOpen(true);
    } catch (error) {
      console.error(error);
      showErrorToast("Failed to load api data");
    }
  };

  const handleDropdownClick = ({ key }) => {
    if (key === "add-new") {
      openDrawer();
    } else if (key === "sync") {
      handleSync();
    }
  };

  const dropdownItems = [
    { key: "add-new", label: "Add New API" },
    { key: "sync", label: syncing ? "Syncing..." : "Sync Data Sources (all systems)" },
  ];

  const data = apis.map((api, index) => ({
    id: index + 1,
    name: api.prefix,
    api_name: api.api_name,
    category: api.category || "—",
    status: api.status,
    actions: "",
    ...api,
  }));

  const statusOptions = [
    { label: "✅ Active", value: "ACTIVE" },
    { label: "🚫 Inactive", value: "INACTIVE" },
  ];

  return (
    <div className="p-5">
      <div className="overflow-x-auto rounded-xl shadow h-200">
        <Table
          headers={headers}
          data={data}
          keys={keys}
          {...tableOptions}
          dropdownItems={dropdownItems}
          onItemClick={handleDropdownClick}
          onEditClick={handleEditClick}
        />
      </div>

      <Drawer
        isOpen={isDrawerOpen}
        onClose={closeDrawer}
        title={editingApis ? "Edit API" : "Add New API"}
        width={400}
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <FloatingInput
              id="title"
              label="API Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <FloatingInput
              id="apiurl"
              label="API URL"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
            />
          </div>

          <div>
            <FloatingTextArea
              id="description"
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
            />
          </div>

          {editingApis && (
            <div>
              <ToggleStatusButton options={statusOptions} value={status} onChange={setStatus} />
              <div className="mt-4 text-gray-700">Current Status: {status}</div>
            </div>
          )}

          <div className="flex justify-between space-x-4 mt-4">
            <button
              type="button"
              onClick={closeDrawer}
              className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 flex items-center space-x-2"
            >
              <TbXboxXFilled />
              <span>Cancel</span>
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-md flex items-center space-x-2"
              style={{
                backgroundColor: "var(--main-color)",
                color: "var(--main-text-color)",
              }}
            >
              <LuSaveAll />
              <span>{editingApis ? "Update" : "Add"} API</span>
            </button>
          </div>
        </form>
      </Drawer>
    </div>
  );
};

export default MaintenanceApi;