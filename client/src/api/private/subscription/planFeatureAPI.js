import axiosInstance from "../../axiosInstance";

const BASE = "/master_plan_feature";

const PlanFeatureAPI = {
  loadPlanFeatures: async (planId) => {
    try {
      const response = await axiosInstance.get(`${BASE}/load-plan-feature/${planId}`);
      return response.data.data;
    } catch (error) {
      console.error("Error loading plan features:", error);
      throw error;
    }
  },

  // features = [{ featureId, limitValue }]  (limitValue blank = unlimited, LIMIT features only)
  savePlanFeatures: async (planId, features) => {
    try {
      const response = await axiosInstance.put(`${BASE}/save-plan-feature/${planId}`, {
        features,
      });
      return response.data;
    } catch (error) {
      console.error("Error saving plan features:", error);
      throw error;
    }
  },
};

export default PlanFeatureAPI;
