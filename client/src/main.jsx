import { StrictMode, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { createPortal } from "react-dom"; // Added this
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { Toaster } from "sileo";
import { TourProvider } from "./components/Tour/context/TourContext.jsx";

import "./index.css";
import "sileo/styles.css";
import App from "./App.jsx";
import logo from "./assets/images/logo.jpg";

const theme = createTheme();

const DynamicToaster = () => {
  const [isDark, setIsDark] = useState(
    document.documentElement.classList.contains("dark"),
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  const toastConfig = isDark
    ? {
        fill: "rgba(255, 255, 255, 0.95)",
        title: "text-slate-950!",
        desc: "text-slate-600!",
        badge: "bg-slate-200!",
      }
    : {
        fill: "#171717",
        title: "text-white!",
        desc: "text-white/75!",
        badge: "bg-white/10!",
      };

  const toasterNode = (
    <Toaster
      position="top-center"
      duration={2000}
      options={{
        fill: toastConfig.fill,
        styles: {
          title: `${toastConfig.title} font-bold`,
          description: toastConfig.desc,
          badge: toastConfig.badge,
          button: "bg-white/10! hover:bg-white/15!",
        },
      }}
    />
  );

  // This sends the Toaster to the div with id "toast-root" in your index.html
  const target = document.getElementById("toast-root");
  return target ? createPortal(toasterNode, target) : toasterNode;
};

// --- Favicon Logic ---
const favicon = document.querySelector("link[rel~='icon']") || document.createElement("link");
favicon.rel = "icon";
favicon.type = "image/png";
favicon.href = logo;
document.head.appendChild(favicon);

const container = document.getElementById("root");
const root = createRoot(container);

root.render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <TourProvider steps={[]}>
        <DynamicToaster />
        <App />
      </TourProvider>
    </ThemeProvider>
  </StrictMode>,
);
