import React, { useEffect, useState } from "react";
import { useAuth } from "../../api/public/auth/parts/authContext";
import Navbar from "./parts/Navbar";

const NavbarIndex = ({ isOpen, isMobile, toggleSidebar }) => {
  const { session } = useAuth();

  // Theme is remembered between visits
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  if (!session) {
    return <div>Loading...</div>;
  }

  return (
    <Navbar
      isOpen={isOpen}
      isMobile={isMobile}
      toggleSidebar={toggleSidebar}
      theme={theme}
      toggleTheme={toggleTheme}
    />
  );
};

export default NavbarIndex;