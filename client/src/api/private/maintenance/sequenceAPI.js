import axiosInstance from "../../axiosInstance";

const BASE = "/maintenance_sequence";

const SequenceAPI = {
  // Every sequence, with its next value as `preview`
  loadSequence: async () => {
    try {
      const response = await axiosInstance.get(`${BASE}/load-sequence`);
      return response.data.data;
    } catch (error) {
      console.error("Error loading sequences:", error);
      throw error;
    }
  },

  // Active sequences only: [{ id, code, name, preview }], for dropdowns
  loadListSequence: async () => {
    try {
      const response = await axiosInstance.get(`${BASE}/load-list-sequence`);
      return response.data.data;
    } catch (error) {
      console.error("Error loading sequence list:", error);
      throw error;
    }
  },

  getSequence: async (id) => {
    try {
      const response = await axiosInstance.get(`${BASE}/get-sequence/${id}`);
      return response.data.data;
    } catch (error) {
      console.error("Error fetching sequence:", error);
      throw error;
    }
  },

  // payload: { code, name, prefix, separator, start_number, padding_length,
  //            include_year, year_format, include_month, include_day, reset_period }
  addSequence: async (payload) => {
    try {
      const response = await axiosInstance.post(`${BASE}/add-sequence`, payload);
      return response.data;
    } catch (error) {
      console.error("Error adding sequence:", error);
      throw error;
    }
  },

  // Same payload plus status; format fields are ignored once the sequence is in use
  editSequence: async (id, payload) => {
    try {
      const response = await axiosInstance.put(`${BASE}/edit-sequence/${id}`, payload);
      return response.data;
    } catch (error) {
      console.error("Error updating sequence:", error);
      throw error;
    }
  },
};

export default SequenceAPI;