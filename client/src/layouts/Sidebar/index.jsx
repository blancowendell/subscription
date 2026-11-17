import { Menu } from "antd";
import { useState, useEffect, useMemo } from "react";
import Logo from "../../assets/images/logo.jpg";
import Brand from "../../assets/images/brand.png";
import { transformMenuItems } from "../../utils/TransformMenu";
import { useAuth } from "../../api/public/auth/parts/authContext";
import { usePermissions } from "../../api/public/auth/parts/permissionsContext";
import { buildPermittedMenu } from "../../utils/permissions/permissionMenu";

const Sidebar = ({ isOpen, isMobile, theme }) => {
  const { session } = useAuth();
  const { can, loading: permissionsLoading } = usePermissions();
  const [selectedKey, setSelectedKey] = useState("");
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleSelect = ({ key }) => setSelectedKey(key);

  const isZoomed = windowWidth <= 1200;
  const sidebarWidth = isZoomed
    ? isOpen
      ? "w-0"
      : "w-20"
    : isMobile
      ? isOpen
        ? "w-0"
        : "w-20"
      : isOpen
        ? "w-[18rem] translate-x-0"
        : "w-20 translate-x-0";

  const role = session?.access_type;

  // One menu for everyone, filtered by the role's permissions
  const menuConfig = useMemo(
    () => (permissionsLoading ? [] : buildPermittedMenu(role, can)),
    [permissionsLoading, role, can]
  );

  const transformedItems = transformMenuItems(menuConfig, isOpen);

  return (
    <div
      className={`fixed top-0 left-0 h-screen sidebar overflow-y-auto overflow-x-hidden z-50 transition-all duration-300 border-r 
        ${sidebarWidth} 
        bg-white dark:bg-[#0f172a] border-gray-100 dark:border-slate-800`}
    >
      <div className="flex justify-center items-center">
        <img
          src={isOpen ? Brand : Logo}
          alt="Sidebar Logo"
          className={`transition-all duration-300 mx-auto my-6 ${isOpen ? "w-[65%]" : "w-[60%]"}`}
        />
      </div>

      <hr className="border-t border-gray-100 dark:border-slate-800 mx-4 mb-4" />

      <Menu
        mode="inline"
        inlineCollapsed={!isOpen}
        items={transformedItems}
        theme={theme}
        onSelect={handleSelect}
        selectedKeys={[selectedKey]}
        className="servicelink-sidebar-menu"
        style={{
          background: "transparent",
          border: "none",
        }}
      />

      <style jsx global>{`
        /* Global Sidebar Styles */
        .dark .servicelink-sidebar-menu.ant-menu-dark {
          background: transparent !important;
        }

        .dark .ant-menu-sub.ant-menu-inline {
          background: rgba(255, 255, 255, 0.03) !important;
        }

        .dark .ant-menu-item-selected {
          background-color: var(--main-color) !important;
          color: white !important;
        }

        .dark .ant-menu-inline .ant-menu-item,
        .dark .ant-menu-inline .ant-menu-submenu-title {
          color: #94a3b8 !important;
        }

        .dark .ant-menu-item:hover,
        .dark .ant-menu-submenu-title:hover {
          color: white !important;
        }

        /* --- COLLAPSED / FLOATING MENU FIX --- */

        /* Targets the popup container created by Ant Design */
        .dark .ant-menu-submenu-popup .ant-menu {
          background-color: #0f172a !important; /* Match your sidebar bg */
          border: 1px solid #1e293b !important;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.5) !important;
        }

        .dark .ant-menu-submenu-popup .ant-menu-item {
          color: #94a3b8 !important;
        }

        .dark .ant-menu-submenu-popup .ant-menu-item-selected {
          background-color: var(--main-color) !important;
          color: white !important;
        }

        /* Fixes potential white background on arrow/inner containers */
        .dark .ant-menu-submenu-popup .ant-menu-vertical {
          background-color: #0f172a !important;
        }
      `}</style>
    </div>
  );
};

export default Sidebar;