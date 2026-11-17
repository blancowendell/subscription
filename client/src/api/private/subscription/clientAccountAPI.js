import axiosInstance from "../../axiosInstance";

const BASE = "/client_account";

// account = { tenantCode, companyName, tin, address, businessType, contactPerson, contactEmail, contactPhone, status }
const toBody = (account) => ({
  tenantCode: account.tenantCode,
  companyName: account.companyName,
  tin: account.tin,
  address: account.address,
  businessType: account.businessType,
  contactPerson: account.contactPerson,
  contactEmail: account.contactEmail,
  contactPhone: account.contactPhone,
});

const ClientAccountAPI = {
  loadClientAccounts: async () => {
    try {
      const response = await axiosInstance.get(`${BASE}/load-client-account`);
      return response.data.data;
    } catch (error) {
      console.error("Error loading client accounts:", error);
      throw error;
    }
  },

  getClientAccount: async (accountId) => {
    try {
      const response = await axiosInstance.get(`${BASE}/get-client-account/${accountId}`);
      return response.data.data;
    } catch (error) {
      console.error("Error loading client account:", error);
      throw error;
    }
  },

  // Returns { code, available, reason }
  checkTenantCode: async (code) => {
    try {
      const response = await axiosInstance.get(
        `${BASE}/check-tenant-code/${encodeURIComponent(code)}`
      );
      return response.data.data?.[0] || null;
    } catch (error) {
      console.error("Error checking tenant code:", error);
      throw error;
    }
  },

  addClientAccount: async (account) => {
    try {
      const response = await axiosInstance.post(`${BASE}/add-client-account`, toBody(account));
      return response.data;
    } catch (error) {
      console.error("Error adding client account:", error);
      throw error;
    }
  },

  updateClientAccount: async (accountId, account) => {
    try {
      const response = await axiosInstance.put(`${BASE}/update-client-account/${accountId}`, {
        ...toBody(account),
        accountStatus: account.status,
      });
      return response.data;
    } catch (error) {
      console.error("Error updating client account:", error);
      throw error;
    }
  },
};

export default ClientAccountAPI;
