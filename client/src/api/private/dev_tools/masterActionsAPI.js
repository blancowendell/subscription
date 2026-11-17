import axiosInstance from "../../axiosInstance";

const MasterActionsAPI = {
  loadActions: async (status) => {
    try {
      const response = await axiosInstance.get(
        "/master_actions/load-master_actions",
        { params: { status } }
      );
      return response.data.data;
    } catch (error) {
      console.error("Error loading Actions:", error);
      throw error;
    }
  },

  getAction: async (id) => {
    try {
      const response = await axiosInstance.get(
        "/master_actions/get-master_actions/" + id
      );
      return response.data.data;
    } catch (error) {
      console.error("Error loading Action:", error);
      throw error;
    }
  },

  addAction: async (code, name, sortOrder) => {
    try {
      const response = await axiosInstance.post(
        "/master_actions/add-master_actions",
        {
          code,
          name,
          sortOrder,
        }
      );
      return response.data;
    } catch (error) {
      console.error("Error adding Action:", error);
      throw error;
    }
  },

  editAction: async (id, name, sortOrder, status) => {
    try {
      const response = await axiosInstance.put(
        `/master_actions/edit-master_actions/${id}`,
        {
          name,
          sortOrder,
          status,
        }
      );
      return response.data;
    } catch (error) {
      console.error("Error editing Action:", error);
      throw error;
    }
  },
};

export default MasterActionsAPI;