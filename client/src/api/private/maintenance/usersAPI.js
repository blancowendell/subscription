import axiosInstance from "../../axiosInstance";

const BASE = "/maintenance_users";

const UsersAPI = {
  loadUsers: async () => {
    try {
      const response = await axiosInstance.get(`${BASE}/load-maintenance-users`);
      return response.data.data;
    } catch (error) {
      console.error("Error loading users:", error);
      throw error;
    }
  },

  // Active roles for the Access dropdown (system roles included)
  loadAccessOptions: async () => {
    try {
      const response = await axiosInstance.get(`${BASE}/load-maintenance-users-access`);
      return response.data.data;
    } catch (error) {
      console.error("Error loading access roles:", error);
      throw error;
    }
  },

  getUsers: async (userId) => {
    try {
      const response = await axiosInstance.get(`${BASE}/get-maintenance-users/${userId}`);
      return response.data.data;
    } catch (error) {
      console.error("Error loading user:", error);
      throw error;
    }
  },

  addUsers: async (access_id, username, password) => {
    try {
      const response = await axiosInstance.post(`${BASE}/add-maintenance-users`, {
        access_id,
        username,
        password,
      });
      return response.data;
    } catch (error) {
      console.error("Error adding user:", error);
      throw error;
    }
  },

  // Leave password blank to keep the current one
  editUsers: async (id, access_id, username, password, status) => {
    try {
      const response = await axiosInstance.put(`${BASE}/edit-maintenance-users/${id}`, {
        access_id,
        username,
        password,
        status,
      });
      return response.data;
    } catch (error) {
      console.error("Error updating user:", error);
      throw error;
    }
  },
};

export default UsersAPI;