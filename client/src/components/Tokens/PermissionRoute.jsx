import React from "react";
import { Navigate } from "react-router-dom";
import { usePermissions } from "../../api/public/auth/parts/permissionsContext";
import { toSnake } from "../../utils/permissions/permissionCodes";

// Route guard: the page code comes from the route path, the same way the sync derives it
const PermissionRoute = ({ path, children }) => {
  const { can, loading } = usePermissions();

  if (loading) {
    return <div className="py-16 text-center text-gray-400">Loading...</div>;
  }

  if (!can(toSnake(path))) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default PermissionRoute;