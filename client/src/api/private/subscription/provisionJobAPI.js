import axiosInstance from "../../axiosInstance";

const BASE = "/provision_job";

const ProvisionJobAPI = {
  // filters = { status, tenantCode } (both optional)
  loadJobs: async (filters = {}) => {
    try {
      const response = await axiosInstance.get(`${BASE}/load-provision-job`, {
        params: {
          status: filters.status || undefined,
          tenantCode: filters.tenantCode || undefined,
        },
      });
      return response.data.data;
    } catch (error) {
      console.error("Error loading provision jobs:", error);
      throw error;
    }
  },

  getJob: async (jobId) => {
    try {
      const response = await axiosInstance.get(`${BASE}/get-provision-job/${jobId}`);
      return response.data.data;
    } catch (error) {
      console.error("Error loading provision job:", error);
      throw error;
    }
  },

  retryJob: async (jobId) => {
    try {
      const response = await axiosInstance.put(`${BASE}/retry-provision-job/${jobId}`);
      return response.data;
    } catch (error) {
      console.error("Error retrying provision job:", error);
      throw error;
    }
  },

  cancelJob: async (jobId, remarks) => {
    try {
      const response = await axiosInstance.put(`${BASE}/cancel-provision-job/${jobId}`, {
        remarks,
      });
      return response.data;
    } catch (error) {
      console.error("Error cancelling provision job:", error);
      throw error;
    }
  },

  queueJob: async (subscriptionId, action) => {
    try {
      const response = await axiosInstance.post(`${BASE}/queue-provision-job`, {
        subscriptionId,
        action,
      });
      return response.data.data;
    } catch (error) {
      console.error("Error queueing provision job:", error);
      throw error;
    }
  },

  // Queues SYNC for every live subscription on the plan. Returns { queued, jobIds }
  syncPlan: async (planId) => {
    try {
      const response = await axiosInstance.post(`${BASE}/sync-plan/${planId}`);
      return response.data.data;
    } catch (error) {
      console.error("Error syncing plan:", error);
      throw error;
    }
  },

  runDue: async () => {
    try {
      const response = await axiosInstance.post(`${BASE}/run-due`);
      return response.data.data;
    } catch (error) {
      console.error("Error running due jobs:", error);
      throw error;
    }
  },

  runExpiry: async () => {
    try {
      const response = await axiosInstance.post(`${BASE}/run-expiry`);
      return response.data.data;
    } catch (error) {
      console.error("Error running expiry check:", error);
      throw error;
    }
  },
};

export default ProvisionJobAPI;
