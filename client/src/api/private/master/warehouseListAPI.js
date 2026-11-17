
import axiosInstance from "../../axiosInstance";
 
const BASE = "/master_warehouse";
 
const WarehouseAPI = {
  loadMasterWarehouse: async () => {
    try {
      const response = await axiosInstance.get(`${BASE}/load-master_warehouse`);
      return response.data.data;
    } catch (error) {
      console.error("Error loading warehouses:", error);
      throw error;
    }
  },
 
  getMasterWarehouse: async (warehouseId) => {
    try {
      const response = await axiosInstance.get(`${BASE}/get-master_warehouse/${warehouseId}`);
      return response.data.data;
    } catch (error) {
      console.error("Error loading warehouse:", error);
      throw error;
    }
  },
 
  addMasterWarehouse: async (warehouseName, warehouseAddress, companyId) => {
    try {
      const response = await axiosInstance.post(`${BASE}/add-master_warehouse`, {
        warehouseName,
        warehouseAddress,
        companyId,
      });
      return response.data;
    } catch (error) {
      console.error("Error adding warehouse:", error);
      throw error;
    }
  },
 
  editMasterWarehouse: async (id, warehouseName, warehouseAddress, companyId, status) => {
    try {
      const response = await axiosInstance.put(`${BASE}/edit-master_warehouse/${id}`, {
        warehouseName,
        warehouseAddress,
        companyId,
        status,
      });
      return response.data;
    } catch (error) {
      console.error("Error editing warehouse:", error);
      throw error;
    }
  },
};
 
export default WarehouseAPI;
 