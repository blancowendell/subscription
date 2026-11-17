import clientAxios from "./clientAxios";

const BASE = "/client_portal";

const ClientPortalAPI = {
  // Public: plans with features for the pricing page
  loadPlans: async () => {
    const response = await clientAxios.get(`${BASE}/plans`);
    return response.data.data;
  },

  getMyAccount: async () => {
    const response = await clientAxios.get(`${BASE}/my-account`);
    return response.data.data;
  },

  // { companyName, tin, address, contactPerson, contactEmail, contactPhone }
  updateMyAccount: async (account) => {
    const response = await clientAxios.put(`${BASE}/update-account`, account);
    return response.data;
  },

  // { subscription, features, erp, trial_used, today }
  getMySubscription: async () => {
    const response = await clientAxios.get(`${BASE}/my-subscription`);
    return response.data.data;
  },

  getMySubscriptionHistory: async () => {
    const response = await clientAxios.get(`${BASE}/my-subscription-history`);
    return response.data.data;
  },

  subscribe: async (planId, billingCycle, isTrial) => {
    const response = await clientAxios.post(`${BASE}/subscribe`, { planId, billingCycle, isTrial });
    return response.data.data;
  },

  changeTrialPlan: async (planId) => {
    const response = await clientAxios.put(`${BASE}/change-trial-plan`, { planId });
    return response.data.data;
  },

  cancelPending: async () => {
    const response = await clientAxios.put(`${BASE}/cancel-pending`);
    return response.data;
  },

  loadUsers: async () => {
    const response = await clientAxios.get(`${BASE}/users`);
    return response.data.data;
  },

  inviteUser: async (fullname, email, role) => {
    const response = await clientAxios.post(`${BASE}/invite-user`, { fullname, email, role });
    return response.data;
  },

  updateUser: async (userId, role, status) => {
    const response = await clientAxios.put(`${BASE}/update-user/${userId}`, { role, status });
    return response.data;
  },
};

export default ClientPortalAPI;
