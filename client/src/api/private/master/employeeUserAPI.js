import axiosInstance from "../../axiosInstance";

const BASE = "/master_employee_users";

const EmployeeUsersAPI = {
  loadEmployeeUsers: async () => {
    try {
      const response = await axiosInstance.get(`${BASE}/load-master_employee_users`);
      return response.data.data;
    } catch (error) {
      console.error("Error loading user accounts:", error);
      throw error;
    }
  },

  loadEmployeeUsersPaginated: async (page = 1, limit = 10, search = "") => {
    try {
      const response = await axiosInstance.get(`${BASE}/load-master_employee_users_paginated`, {
        params: { page, limit, search },
      });
      return response.data;
    } catch (error) {
      console.error("Error loading user accounts:", error);
      throw error;
    }
  },

  addEmployeeUsers: async (employeeid, access_id, company_id, warehouse_id, username, password) => {
    try {
      const response = await axiosInstance.post(`${BASE}/add-master_employee_users`, {
        employeeid,
        access_id,
        company_id,
        warehouse_id,
        username,
        password,
      });
      return response.data;
    } catch (error) {
      console.error("Error adding user account:", error);
      throw error;
    }
  },

  getEmployeeUsers: async (user_id) => {
    try {
      const response = await axiosInstance.get(`${BASE}/get-master_employee_users/${user_id}`);
      return response.data.data;
    } catch (error) {
      console.error("Error fetching user account:", error);
      throw error;
    }
  },

  editEmployeeUsers: async (user_id, access_id, company_id, warehouse_id, username, password, status) => {
    try {
      const response = await axiosInstance.put(`${BASE}/edit-master_employee_users/${user_id}`, {
        access_id,
        company_id,
        warehouse_id,
        username,
        password,
        status,
      });
      return response.data;
    } catch (error) {
      console.error("Error updating user account:", error);
      throw error;
    }
  },

  importEmployeeUsers: async (formData) => {
    try {
      const response = await axiosInstance.post(`${BASE}/import-master_employee_users_excel`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    } catch (error) {
      console.error("Error importing user accounts:", error);
      throw error;
    }
  },

  sendCredentials: async (id) => {
    try {
      const response = await axiosInstance.post(`${BASE}/send-credentials/${id}`);
      return response.data;
    } catch (error) {
      console.error("Error sending credentials:", error);
      throw error;
    }
  },

  resetAllCredentials: async () => {
    try {
      const response = await axiosInstance.post(`${BASE}/reset-all-credentials`);
      return response.data;
    } catch (error) {
      console.error("Error resetting all credentials:", error);
      throw error;
    }
  },
};

export default EmployeeUsersAPI;