import axiosInstance from "../../axiosInstance";

const BASE = "/master_company";

const CompanyAPI = {
  loadMasterCompany: async () => {
    try {
      const response = await axiosInstance.get(`${BASE}/load-master_company`);
      return response.data.data;
    } catch (error) {
      console.error("Error loading companies:", error);
      throw error;
    }
  },

  getMasterCompany: async (companyId) => {
    try {
      const response = await axiosInstance.get(`${BASE}/get-master_company/${companyId}`);
      return response.data.data;
    } catch (error) {
      console.error("Error loading company:", error);
      throw error;
    }
  },

  addMasterCompany: async (companyName, companyAddress) => {
    try {
      const response = await axiosInstance.post(`${BASE}/add-master_company`, {
        companyName,
        companyAddress,
      });
      return response.data;
    } catch (error) {
      console.error("Error adding company:", error);
      throw error;
    }
  },

  editMasterCompany: async (id, companyName, companyAddress, status) => {
    try {
      const response = await axiosInstance.put(`${BASE}/edit-master_company/${id}`, {
        companyName,
        companyAddress,
        status,
      });
      return response.data;
    } catch (error) {
      console.error("Error editing company:", error);
      throw error;
    }
  },
};

export default CompanyAPI;