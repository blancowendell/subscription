import axiosInstance from "../../axiosInstance";

// Roles & permissions of other systems, managed from SPARK_BOOKS.
// system: "inventory" | "operations"
const RemotePermissionsAPI = {
  loadRoles: async (system) => {
    try {
      const response = await axiosInstance.get(`/remote_permissions/${system}/roles`);
      return response.data.data;
    } catch (error) {
      console.error(`Error loading ${system} roles:`, error);
      throw error;
    }
  },

  // Returns { access, pages } — the full checkbox matrix for one role of that system
  loadAccessRights: async (system, accessId) => {
    try {
      const response = await axiosInstance.get(`/remote_permissions/${system}/access-rights`, {
        params: { access_id: accessId },
      });
      return response.data.data;
    } catch (error) {
      console.error(`Error loading ${system} access rights:`, error);
      throw error;
    }
  },

  // rights: [{ pageActionId, isAllowed }]
  saveAccessRights: async (system, accessId, rights) => {
    try {
      const response = await axiosInstance.post(`/remote_permissions/${system}/access-rights`, {
        accessId,
        rights,
      });
      return response.data;
    } catch (error) {
      console.error(`Error saving ${system} access rights:`, error);
      throw error;
    }
  },
};

export default RemotePermissionsAPI;