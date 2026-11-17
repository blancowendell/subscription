import axiosInstance from "../../axiosInstance";

const BASE = "/master_feature";

// feature = { code, name, module, type, description, sortOrder, status }
const toBody = (feature) => ({
  featureCode: feature.code,
  featureName: feature.name,
  featureModule: feature.module,
  featureType: feature.type,
  featureDescription: feature.description,
  sortOrder: feature.sortOrder,
});

const FeatureAPI = {
  loadFeatures: async () => {
    try {
      const response = await axiosInstance.get(`${BASE}/load-feature`);
      return response.data.data;
    } catch (error) {
      console.error("Error loading features:", error);
      throw error;
    }
  },

  getFeature: async (featureId) => {
    try {
      const response = await axiosInstance.get(`${BASE}/get-feature/${featureId}`);
      return response.data.data;
    } catch (error) {
      console.error("Error loading feature:", error);
      throw error;
    }
  },

  addFeature: async (feature) => {
    try {
      const response = await axiosInstance.post(`${BASE}/add-feature`, toBody(feature));
      return response.data;
    } catch (error) {
      console.error("Error adding feature:", error);
      throw error;
    }
  },

  updateFeature: async (featureId, feature) => {
    try {
      const response = await axiosInstance.put(`${BASE}/update-feature/${featureId}`, {
        ...toBody(feature),
        featureStatus: feature.status,
      });
      return response.data;
    } catch (error) {
      console.error("Error updating feature:", error);
      throw error;
    }
  },
};

export default FeatureAPI;
