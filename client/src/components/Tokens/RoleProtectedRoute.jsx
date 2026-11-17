// import { Navigate, Outlet } from "react-router-dom";
// import { useAuth } from '../../api/public/auth/parts/authContext';

// const RoleProtectedRoute = ({ allowedRoles }) => {
//   const { session, loading } = useAuth();

//   if (loading) return null;

//   const lastRole = localStorage.getItem("lastRole");

//   if (!session) {
//     if (lastRole === "Customer") {
//       return <Navigate to="/customerlogin" replace />;
//     } else {
//       return <Navigate to="/" replace />;
//     }
//   }

//   if (!allowedRoles.includes(session.access_type)) {
//     return <Navigate to="/unauthorized" replace />;
//   }

//   return <Outlet />;
// };

// export default RoleProtectedRoute;

import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../api/public/auth/parts/authContext";

const RoleProtectedRoute = ({ allowedRoles }) => {
  const { session, loading } = useAuth();

  console.log(
    "RoleProtectedRoute — loading:",
    loading,
    "session:",
    session,
    "allowedRoles:",
    allowedRoles,
  );

  console.log("Full session in route:", JSON.stringify(session));
  console.log("allowedRoles:", allowedRoles);
  console.log("loading:", loading);

  if (loading) return null; // ✅ already have this

  if (!session) {
    const lastRole = localStorage.getItem("lastRole");
    if (lastRole === "Administrator") {
      return <Navigate to="/admin" replace />;
    } else if (lastRole === "CNC Head") {
      return <Navigate to="/" replace />;
    } else {
      return <Navigate to="/" replace />;
    }
  }

  console.log("session.access_type:", session.access_type);
  console.log("includes check:", allowedRoles.includes(session.access_type));

  if (!allowedRoles.includes(session.access_type)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
};

export default RoleProtectedRoute;
