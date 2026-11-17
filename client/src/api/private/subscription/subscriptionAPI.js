import axiosInstance from "../../axiosInstance";

const BASE = "/subscription";

// Actions return the whole body so the page can tell success ({ data: { jobId } })
// from "saved, but the ERP job couldn't be queued" (warning message, no data).
const SubscriptionAPI = {
  loadSubscriptions: async (status) => {
    try {
      const response = await axiosInstance.get(`${BASE}/load-subscription`, {
        params: { status: status || undefined },
      });
      return response.data.data;
    } catch (error) {
      console.error("Error loading subscriptions:", error);
      throw error;
    }
  },

  getSubscription: async (subscriptionId) => {
    try {
      const response = await axiosInstance.get(`${BASE}/get-subscription/${subscriptionId}`);
      return response.data.data;
    } catch (error) {
      console.error("Error loading subscription:", error);
      throw error;
    }
  },

  loadAccountSubscriptions: async (accountId) => {
    try {
      const response = await axiosInstance.get(`${BASE}/load-account-subscription/${accountId}`);
      return response.data.data;
    } catch (error) {
      console.error("Error loading account subscriptions:", error);
      throw error;
    }
  },

  loadHistory: async (subscriptionId) => {
    try {
      const response = await axiosInstance.get(`${BASE}/load-subscription-history/${subscriptionId}`);
      return response.data.data;
    } catch (error) {
      console.error("Error loading subscription history:", error);
      throw error;
    }
  },

  // { accountId, planId, billingCycle, startDate, isTrial, remarks }
  addSubscription: async (subscription) => {
    try {
      const response = await axiosInstance.post(`${BASE}/add-subscription`, subscription);
      return response.data;
    } catch (error) {
      console.error("Error adding subscription:", error);
      throw error;
    }
  },

  changePlan: async (subscriptionId, planId, billingCycle, remarks) => {
    try {
      const response = await axiosInstance.put(`${BASE}/change-plan/${subscriptionId}`, {
        planId,
        billingCycle,
        remarks,
      });
      return response.data;
    } catch (error) {
      console.error("Error changing plan:", error);
      throw error;
    }
  },

  renew: async (subscriptionId, remarks) => {
    try {
      const response = await axiosInstance.put(`${BASE}/renew-subscription/${subscriptionId}`, { remarks });
      return response.data;
    } catch (error) {
      console.error("Error renewing subscription:", error);
      throw error;
    }
  },

  extend: async (subscriptionId, days, remarks) => {
    try {
      const response = await axiosInstance.put(`${BASE}/extend-subscription/${subscriptionId}`, {
        days,
        remarks,
      });
      return response.data;
    } catch (error) {
      console.error("Error extending subscription:", error);
      throw error;
    }
  },

  suspend: async (subscriptionId, remarks) => {
    try {
      const response = await axiosInstance.put(`${BASE}/suspend-subscription/${subscriptionId}`, { remarks });
      return response.data;
    } catch (error) {
      console.error("Error suspending subscription:", error);
      throw error;
    }
  },

  reactivate: async (subscriptionId, remarks) => {
    try {
      const response = await axiosInstance.put(`${BASE}/reactivate-subscription/${subscriptionId}`, {
        remarks,
      });
      return response.data;
    } catch (error) {
      console.error("Error reactivating subscription:", error);
      throw error;
    }
  },

  cancel: async (subscriptionId, remarks) => {
    try {
      const response = await axiosInstance.put(`${BASE}/cancel-subscription/${subscriptionId}`, { remarks });
      return response.data;
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      throw error;
    }
  },
};

export default SubscriptionAPI;
