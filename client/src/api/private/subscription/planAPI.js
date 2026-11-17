import axiosInstance from "../../axiosInstance";

const BASE = "/master_plan";

// plan = { code, name, description, priceMonthly, priceYearly, trialDays, graceDays, sortOrder, isPublic, status }
const toBody = (plan) => ({
  planCode: plan.code,
  planName: plan.name,
  planDescription: plan.description,
  priceMonthly: plan.priceMonthly,
  priceYearly: plan.priceYearly,
  trialDays: plan.trialDays,
  graceDays: plan.graceDays,
  sortOrder: plan.sortOrder,
  isPublic: plan.isPublic,
});

const PlanAPI = {
  loadPlans: async () => {
    try {
      const response = await axiosInstance.get(`${BASE}/load-plan`);
      return response.data.data;
    } catch (error) {
      console.error("Error loading plans:", error);
      throw error;
    }
  },

  getPlan: async (planId) => {
    try {
      const response = await axiosInstance.get(`${BASE}/get-plan/${planId}`);
      return response.data.data;
    } catch (error) {
      console.error("Error loading plan:", error);
      throw error;
    }
  },

  addPlan: async (plan) => {
    try {
      const response = await axiosInstance.post(`${BASE}/add-plan`, toBody(plan));
      return response.data;
    } catch (error) {
      console.error("Error adding plan:", error);
      throw error;
    }
  },

  updatePlan: async (planId, plan) => {
    try {
      const response = await axiosInstance.put(`${BASE}/update-plan/${planId}`, {
        ...toBody(plan),
        planStatus: plan.status,
      });
      return response.data;
    } catch (error) {
      console.error("Error updating plan:", error);
      throw error;
    }
  },
};

export default PlanAPI;
