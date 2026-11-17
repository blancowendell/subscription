import axiosInstance from "../../axiosInstance";

const BASE = "/system_settings";

const SystemSettingsAPI = {
  loadSystemSettings: async () => {
    try {
      const response = await axiosInstance.get(`${BASE}/load-system_settings`);
      return response.data.data;
    } catch (error) {
      console.error("Error loading system settings:", error);
      throw error;
    }
  },

  getSystemSetting: async (settingId) => {
    try {
      const response = await axiosInstance.get(`${BASE}/get-system_settings/${settingId}`);
      return response.data.data;
    } catch (error) {
      console.error("Error fetching system setting:", error);
      throw error;
    }
  },

  // Key is stored uppercase (e.g. FIFO_ENABLED). type: 'BOOLEAN' | 'STRING' | 'NUMBER'
  addSystemSetting: async (key, value, type = "BOOLEAN", description = null) => {
    try {
      const response = await axiosInstance.post(`${BASE}/add-system_settings`, {
        key,
        value,
        type,
        description,
      });
      return response.data;
    } catch (error) {
      console.error("Error adding system setting:", error);
      throw error;
    }
  },

  // Change the value and/or description. Pass null for anything you don't want to change.
  updateSystemSetting: async (settingId, value = null, description = null) => {
    try {
      const body = {};
      if (value !== null && value !== undefined && value !== "") body.value = value;
      if (description !== null && description !== undefined) body.description = description;

      const response = await axiosInstance.put(`${BASE}/edit-system_settings/${settingId}`, body);
      return response.data;
    } catch (error) {
      console.error("Error updating system setting:", error);
      throw error;
    }
  },

  // For BOOLEAN settings: send true/false, stored as "1"/"0".
  toggleSystemSetting: async (settingId, enabled) => {
    try {
      const response = await axiosInstance.put(`${BASE}/edit-system_settings/${settingId}`, {
        value: enabled ? "1" : "0",
      });
      return response.data;
    } catch (error) {
      console.error("Error toggling system setting:", error);
      throw error;
    }
  },
};

export default SystemSettingsAPI;