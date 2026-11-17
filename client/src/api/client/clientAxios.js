import axios from "axios";
import axiosInstance from "../axiosInstance";

// Separate axios for the client portal: same server, but none of the admin
// interceptors (admin token, admin 401 redirect). The client session rides on the cookie.
const clientAxios = axios.create({
  baseURL: axiosInstance.defaults.baseURL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// Extracts the backend message regardless of how the request failed
export const getClientError = (error, fallback = "Something went wrong.") => {
  if (typeof error === "string" && error.trim()) return error;
  const data = error?.response?.data ?? error?.data ?? error;
  if (typeof data === "string" && data.trim()) return data;
  return data?.msg || data?.message || data?.error || fallback;
};

export default clientAxios;
