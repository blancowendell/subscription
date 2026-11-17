import axiosInstance from "../../axiosInstance";

const BASE = "/client_users";

const ClientUserAPI = {
  loadClientUsers: async (accountId) => {
    try {
      const response = await axiosInstance.get(`${BASE}/load-client-user/${accountId}`);
      return response.data.data;
    } catch (error) {
      console.error("Error loading client users:", error);
      throw error;
    }
  },

  getClientUser: async (userId) => {
    try {
      const response = await axiosInstance.get(`${BASE}/get-client-user/${userId}`);
      return response.data.data;
    } catch (error) {
      console.error("Error loading client user:", error);
      throw error;
    }
  },

  addClientUser: async (accountId, fullname, email, role, password) => {
    try {
      const response = await axiosInstance.post(`${BASE}/add-client-user`, {
        accountId,
        fullname,
        email,
        role,
        password,
      });
      return response.data;
    } catch (error) {
      console.error("Error adding client user:", error);
      throw error;
    }
  },

  updateClientUser: async (userId, fullname, email, role, userStatus) => {
    try {
      const response = await axiosInstance.put(`${BASE}/update-client-user/${userId}`, {
        fullname,
        email,
        role,
        userStatus,
      });
      return response.data;
    } catch (error) {
      console.error("Error updating client user:", error);
      throw error;
    }
  },

  resetClientUserPassword: async (userId, password) => {
    try {
      const response = await axiosInstance.put(`${BASE}/reset-client-user-password/${userId}`, {
        password,
      });
      return response.data;
    } catch (error) {
      console.error("Error resetting client user password:", error);
      throw error;
    }
  },
};

export default ClientUserAPI;
