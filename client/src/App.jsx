import React from "react";
import { Routes, Route, BrowserRouter, Navigate, useParams } from "react-router-dom";
import NotFound from "./components/Pages/NotFound";
import AdminDashboard from "./pages/Private/Dashboard";
import Settings from "./pages/Private/Settings";
import MainLayout from "./layouts/MainLayout";
import AdminLoginPage from "./pages/Public/Login";
import UserLoginPage from "./pages/Public/UserLogin";
import RequireAuth from "./components/Tokens/RequireAuth";
import PermissionRoute from "./components/Tokens/PermissionRoute";
import { AuthProvider } from "./api/public/auth/parts/authContext";
import { PermissionsProvider } from "./api/public/auth/parts/permissionsContext";
import DevTools from "./pages/Private/DevTools";
// import Security from "./pages/Private/Security";
// import AdminReports from "./pages/Private/Reports";
import Employees from "./pages/Private/Employees";
import SamplePage from "./pages/Private/SamplePage";
import ForgotPasswordPage from "./components/Pages/ForgotPassword";
import "react-toastify/dist/ReactToastify.css";
// import Accounting from "./pages/Private/Accounting";
import Maintain from "./pages/Private/Maintain";
// import Inventory from "./pages/Private/Inventory";
// import Customers from "./pages/Private/Customer";
// import Invoicing from "./pages/Private/Invoicing";
// import CreditsPayments from "./pages/Private/CreditsPayments";
// import SalesOrder from "./pages/Private/SalesOrder";
// import PurchaseOrders from "./pages/Private/PurchaseOrders";
// import Vendors from "./pages/Private/Vendors";
// import WareHouse from "./pages/Private/WareHouse";
// import Warranty from "./pages/Private/Warranty";
// import DeliveryReceipts from "./pages/Private/DeliveryReceipts";
// import CndDashboard from "./pages/Private/CncDashboard";
// import FinanceDashboard from "./pages/Private/FinanceDashboard";
// import FinancePosting from "./pages/Private/FinancePosting";
// import RequestPage from "./pages/Private/Request";
// import Audit from "./pages/Private/Audit";

// Every page lives under /index. Who can open what is decided by
// permissions (PermissionRoute), never by role names.
const PAGE_ROUTES = [
  // { path: "reportsPanel", element: <AdminReports /> },
  { path: "settings", element: <Settings /> },
  { path: "devtools", element: <DevTools /> },
  // { path: "security", element: <Security /> },
  { path: "employees", element: <Employees /> },
  { path: "samplepage", element: <SamplePage /> },
  // { path: "accounting", element: <Accounting /> },
  { path: "maintainPanel", element: <Maintain /> },
  // { path: "inventory", element: <Inventory /> },
  // { path: "warehouse", element: <WareHouse /> },
  // { path: "warrantyPanel", element: <Warranty /> },
  // { path: "customer", element: <Customers /> },
  // { path: "vendor", element: <Vendors /> },
  // { path: "invoicing", element: <Invoicing /> },
  // { path: "creditsPayments", element: <CreditsPayments /> },
  // { path: "salesOrder", element: <SalesOrder /> },
  // { path: "purchaseOrders", element: <PurchaseOrders /> },
  // { path: "requestPanel", element: <RequestPage /> },
  // { path: "deliveryReceiptsPanel", element: <DeliveryReceipts /> },
  // { path: "financePayments", element: <FinancePosting /> },
  // { path: "cncDashboard", element: <CndDashboard /> },
  // { path: "financeDashboard", element: <FinanceDashboard /> },
  // { path: "audit", element: <Audit /> },
];

// Old role-based base paths -> /index, keeping the rest of the address
const LEGACY_BASES = ["/cncAdmin/index", "/financeAdmin/index", "/accounting/index"];

const LegacyRedirect = () => {
  const { "*": rest } = useParams();
  return <Navigate to={rest ? `/index/${rest}` : "/index"} replace />;
};

function App() {
  return (
    <AuthProvider>
      <PermissionsProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<UserLoginPage />} />
            <Route path="/admin" element={<AdminLoginPage />} />
            <Route path="/forgotpassword" element={<ForgotPasswordPage />} />
            <Route path="/unauthorized" element={<div>Access Denied</div>} />

            {/* Every logged-in user, any role */}
            <Route path="/index" element={<RequireAuth />}>
              <Route element={<MainLayout />}>
                <Route index element={<AdminDashboard />} />
                {PAGE_ROUTES.map(({ path, element }) => (
                  <Route
                    key={path}
                    path={path}
                    element={<PermissionRoute path={path}>{element}</PermissionRoute>}
                  />
                ))}
              </Route>
            </Route>

            {LEGACY_BASES.map((base) => (
              <Route key={base} path={`${base}/*`} element={<LegacyRedirect />} />
            ))}

            {/* Catch-All */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </PermissionsProvider>
    </AuthProvider>
  );
}

export default App;