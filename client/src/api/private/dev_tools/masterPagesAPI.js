import axiosInstance from "../../axiosInstance";

const MasterPagesAPI = {
  // filters: { portal_type, status, tree: 1 }
  loadPages: async (filters = {}) => {
    try {
      const response = await axiosInstance.get(
        "/master_pages/load-master_pages",
        { params: filters }
      );
      return response.data.data;
    } catch (error) {
      console.error("Error loading Pages:", error);
      throw error;
    }
  },

  getPage: async (id) => {
    try {
      const response = await axiosInstance.get(
        "/master_pages/get-master_pages/" + id
      );
      return response.data.data;
    } catch (error) {
      console.error("Error loading Page:", error);
      throw error;
    }
  },

  // page: { code, name, parentId, route, portalType, icon, sortOrder, actionIds }
  addPage: async (page) => {
    try {
      const response = await axiosInstance.post(
        "/master_pages/add-master_pages",
        {
          code: page.code,
          name: page.name,
          parentId: page.parentId,
          route: page.route,
          portalType: page.portalType,
          icon: page.icon,
          sortOrder: page.sortOrder,
          actionIds: page.actionIds || [],
        }
      );
      return response.data;
    } catch (error) {
      console.error("Error adding Page:", error);
      throw error;
    }
  },

  // page: { name, parentId, route, portalType, icon, sortOrder, status }
  editPage: async (id, page) => {
    try {
      const response = await axiosInstance.put(
        `/master_pages/edit-master_pages/${id}`,
        {
          name: page.name,
          parentId: page.parentId,
          route: page.route,
          portalType: page.portalType,
          icon: page.icon,
          sortOrder: page.sortOrder,
          status: page.status,
        }
      );
      return response.data;
    } catch (error) {
      console.error("Error editing Page:", error);
      throw error;
    }
  },

  // pages: tree from collectPages()
  syncPages: async (pages) => {
    try {
      const response = await axiosInstance.post(
        "/master_pages/sync-master_pages",
        { pages }
      );
      return response.data.data;
    } catch (error) {
      console.error("Error syncing Pages:", error);
      throw error;
    }
  },
};

export default MasterPagesAPI;