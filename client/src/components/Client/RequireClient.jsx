import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useClientAuth } from "../../api/client/clientAuthContext";

// Guards /portal/*: sends visitors without a client session to the client login
const RequireClient = () => {
  const { client, loading } = useClientAuth();
  const location = useLocation();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>;
  }
  if (!client) {
    return <Navigate to="/client-login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
};

export default RequireClient;
