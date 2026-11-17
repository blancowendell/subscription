import axiosInstance from '../../axiosInstance';

const DashboardAPI = {

    listDashboards: async () => {
        try {
            const response = await axiosInstance.get('/dashboard/list');
            return response.data.data;
        } catch (error) {
            console.error("Error loading dashboards:", error);
            throw error;
        }
    },

    createDashboard: async (title) => {
        try {
            const response = await axiosInstance.post('/dashboard/create', { title });
            return response.data.data;
        } catch (error) {
            console.error("Error creating dashboard:", error);
            throw error;
        }
    },

    deleteDashboard: async (id) => {
        try {
            const response = await axiosInstance.delete(`/dashboard/${id}`);
            return response.data;
        } catch (error) {
            console.error("Error deleting dashboard:", error);
            throw error;
        }
    },

    loadLayout: async (id) => {
        try {
            const response = await axiosInstance.get('/dashboard/load-layout', { params: { id } });
            return response.data.data;
        } catch (error) {
            console.error("Error loading layout:", error);
            throw error;
        }
    },

    addWidgets: async (payload) => {
        try {
            const response = await axiosInstance.post('/dashboard/save-layout', payload);
            return response.data;
        } catch (error) {
            console.error("Error saving layout:", error);
            throw error;
        }
    },

    loadDataSources: async () => {
        try {
            const response = await axiosInstance.get('/dashboard/data-sources');
            return response.data.data;
        } catch (error) {
            console.error("Error loading data sources:", error);
            throw error;
        }
    },

    // params: { from: "YYYY-MM-DD", to: "YYYY-MM-DD" } — the dashboard's date range
    loadMaintenanceApi: async (apiUrl, params = {}) => {
        try {
            const response = await axiosInstance.get(`/dashboard_api/${apiUrl}`, { params });
            return response.data.data;
        } catch (error) {
            console.error(error);
            throw error;
        }
    },
};

export default DashboardAPI;