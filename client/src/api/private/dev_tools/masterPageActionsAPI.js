import axiosInstance from "../../axiosInstance";

const MasterPageActionsAPI = {
  loadPageActions: async (pageId, status) => {
    try {
      const response = await axiosInstance.get(
        "/master_page_actions/load-master_page_actions",
        { params: { page_id: pageId, status } }
      );
      return response.data.data;
    } catch (error) {
      console.error("Error loading Page Actions:", error);
      throw error;
    }
  },

  getPageAction: async (id) => {
    try {
      const response = await axiosInstance.get(
        "/master_page_actions/get-master_page_actions/" + id
      );
      return response.data.data;
    } catch (error) {
      console.error("Error loading Page Action:", error);
      throw error;
    }
  },

  // Sync: listed actions become ACTIVE, unlisted become INACTIVE
  syncPageActions: async (pageId, actionIds) => {
    try {
      const response = await axiosInstance.post(
        "/master_page_actions/add-master_page_actions",
        {
          pageId,
          actionIds,
        }
      );
      return response.data;
    } catch (error) {
      console.error("Error saving Page Actions:", error);
      throw error;
    }
  },

  editPageAction: async (id, status) => {
    try {
      const response = await axiosInstance.put(
        `/master_page_actions/edit-master_page_actions/${id}`,
        {
          status,
        }
      );
      return response.data;
    } catch (error) {
      console.error("Error editing Page Action:", error);
      throw error;
    }
  },
};

export default MasterPageActionsAPI;