import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../api/public/auth/parts/authContext";

// Any logged-in user gets in; what they can open inside is decided by permissions
const RequireAuth = () => {
  const { session, loading } = useAuth();

  if (loading) return null;

  if (!session) {
    // Set at logout from the user's login table, so no role names are needed
    const loginPage = localStorage.getItem("lastLoginPage") === "/admin" ? "/admin" : "/";
    return <Navigate to={loginPage} replace />;
  }

  return <Outlet />;
};

export default RequireAuth;