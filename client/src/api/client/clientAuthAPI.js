import clientAxios from "./clientAxios";

const BASE = "/client_auth";

const ClientAuthAPI = {
  // { tenantCode, companyName, tin, address, businessType, fullname, email, phone, password }
  signUp: async (form) => {
    const response = await clientAxios.post(`${BASE}/sign-up`, form);
    return response.data;
  },

  verifyEmail: async (token) => {
    const response = await clientAxios.post(`${BASE}/verify-email`, { token });
    return response.data;
  },

  resendVerification: async (email) => {
    const response = await clientAxios.post(`${BASE}/resend-verification`, { email });
    return response.data;
  },

  login: async (email, password) => {
    const response = await clientAxios.post(`${BASE}/login`, { email, password });
    return response.data.data;
  },

  logout: async () => {
    const response = await clientAxios.post(`${BASE}/logout`);
    return response.data;
  },

  // Returns the client session user, or null when not logged in
  session: async () => {
    try {
      const response = await clientAxios.get(`${BASE}/session`);
      return response.data?.user || null;
    } catch (error) {
      if (error?.response?.status === 401) return null;
      throw error;
    }
  },

  forgotPassword: async (email) => {
    const response = await clientAxios.post(`${BASE}/forgot-password`, { email });
    return response.data;
  },

  resetPassword: async (token, password) => {
    const response = await clientAxios.post(`${BASE}/reset-password`, { token, password });
    return response.data;
  },

  changePassword: async (currentPassword, newPassword) => {
    const response = await clientAxios.post(`${BASE}/change-password`, { currentPassword, newPassword });
    return response.data;
  },
};

export default ClientAuthAPI;
