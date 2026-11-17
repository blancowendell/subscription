import axiosInstance from '../../axiosInstance';

const EmployeeAPI = {
  loadEmployees: async () => {
    try {
      const response = await axiosInstance.get('/master_employee/load-employees');
      return response.data.data;
    } catch (error) {
      console.error("Error loading employees:", error);
      throw error;
    }
  },

  loadEmployeesPaginated: async (page = 1, limit = 10, search = "") => {
    try {
      const response = await axiosInstance.get('/master_employee/load-employees-paginated', {
        params: { page, limit, search },
      });
      return response.data;
    } catch (error) {
      console.error("Error loading employees:", error);
      throw error;
    }
  },

  addEmployee: async (firstname, lastname, email, sequenceId, companyId) => {
    try {
      const response = await axiosInstance.post('/master_employee/add-employee', {
        firstname,
        lastname,
        email,
        sequenceId,
        companyId,
      });
      return response.data;
    } catch (error) {
      console.error("Error adding employee:", error);
      throw error;
    }
  },

  getEmployee: async (employeeId) => {
    try {
      const response = await axiosInstance.get(`/master_employee/get-employee/${employeeId}`);
      return response.data.data;
    } catch (error) {
      console.error("Error fetching employee:", error);
      throw error;
    }
  },

  updateEmployee: async (employeeId, firstname, lastname, email, status) => {
    try {
      const response = await axiosInstance.put(`/master_employee/update-employee/${employeeId}`, {
        firstname,
        lastname,
        email,
        status,
      });
      return response.data;
    } catch (error) {
      console.error("Error updating employee:", error);
      throw error;
    }
  },

  importEmployeesExcel: async (formData) => {
    try {
      const response = await axiosInstance.post('/master_employee/import-employees-excel', formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    } catch (error) {
      console.error("Error importing employees:", error);
      throw error;
    }
  },
};

export default EmployeeAPI;