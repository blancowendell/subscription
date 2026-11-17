import axiosInstance from "../../axiosInstance";

// Which roles may use which dashboard data source (maintenance_api_access)
const BASE = "/maintenance_api_access";

const MaintenanceApiAccessAPI = {
  // { apis: [], roles: [], grants: [{ apiId, accessId }] }
  loadAccess: async () => {
    try {
      const response = await axiosInstance.get(`${BASE}/load-maintenance_api_access`);
      return response.data.data;
    } catch (error) {
      console.error("Error loading data source access:", error);
      throw error;
    }
  },

  // { api: {}, roles: [{ id, name, allowed }] }
  getAccess: async (apiId) => {
    try {
      const response = await axiosInstance.get(`${BASE}/get-maintenance_api_access/${apiId}`);
      return response.data.data;
    } catch (error) {
      console.error("Error loading data source access:", error);
      throw error;
    }
  },

  // Grants the listed roles; roles already granted stay
  addAccess: async (apiId, accessIds) => {
    try {
      const response = await axiosInstance.post(`${BASE}/add-maintenance_api_access`, {
        apiId,
        accessIds,
      });
      return response.data;
    } catch (error) {
      console.error("Error granting data source access:", error);
      throw error;
    }
  },

  // Sets exactly which roles may use this data source
  editAccess: async (apiId, accessIds) => {
    try {
      const response = await axiosInstance.put(`${BASE}/edit-maintenance_api_access/${apiId}`, {
        accessIds,
      });
      return response.data;
    } catch (error) {
      console.error("Error saving data source access:", error);
      throw error;
    }
  },
};

export default MaintenanceApiAccessAPI;