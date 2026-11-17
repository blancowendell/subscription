import axiosInstance from "../../axiosInstance";

const MasterAccessRightsAPI = {
  // { role, accessId, isSystem, permissions: ["credit_memos.view", ...] } for the logged-in user
  getMyPermissions: async () => {
    try {
      const response = await axiosInstance.get(
        "/master_access_rights/my-permissions"
      );
      return response.data.data;
    } catch (error) {
      console.error("Error loading My Permissions:", error);
      throw error;
    }
  },

  // Returns { access, pages } — the full checkbox matrix for one role
  loadAccessRights: async (accessId) => {
    try {
      const response = await axiosInstance.get(
        "/master_access_rights/load-master_access_rights",
        { params: { access_id: accessId } }
      );
      return response.data.data;
    } catch (error) {
      console.error("Error loading Access Rights:", error);
      throw error;
    }
  },

  getAccessRight: async (id) => {
    try {
      const response = await axiosInstance.get(
        "/master_access_rights/get-master_access_rights/" + id
      );
      return response.data.data;
    } catch (error) {
      console.error("Error loading Access Right:", error);
      throw error;
    }
  },

  // rights: [{ pageActionId, isAllowed }]
  saveAccessRights: async (accessId, rights) => {
    try {
      const response = await axiosInstance.post(
        "/master_access_rights/add-master_access_rights",
        {
          accessId,
          rights,
        }
      );
      return response.data;
    } catch (error) {
      console.error("Error saving Access Rights:", error);
      throw error;
    }
  },

  editAccessRight: async (id, isAllowed) => {
    try {
      const response = await axiosInstance.put(
        `/master_access_rights/edit-master_access_rights/${id}`,
        {
          isAllowed,
        }
      );
      return response.data;
    } catch (error) {
      console.error("Error editing Access Right:", error);
      throw error;
    }
  },
};

export default MasterAccessRightsAPI;