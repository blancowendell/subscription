import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../../api/public/auth/parts/authContext";
import {
  showSuccessToast,
  showErrorToast,
} from "../../../components/ActionsCenter/Alerts/Sileo";
import useDashboard from "./utils/useDashboard";
import useDashboardList from "./utils/useDashboardList";
import useIsNarrow from "./utils/useIsNarrow";
import { DashboardRangeProvider, presetRange } from "./utils/dateRange";
import Hero from "./parts/Hero";
import Viewer from "./parts/Viewer";
import Editor from "./parts/Editor";

const Dashboard = () => {
  const { session } = useAuth();
  const location = useLocation();
  const fullname = session?.fullname || "Guest";
  const isNarrow = useIsNarrow();

  const storageKey = `dashboard-active-tab:${session?.user_source || ""}:${session?.id || ""}`;
  const list = useDashboardList(storageKey);
  const dashboard = useDashboard(list.activeId);

  const [creating, setCreating] = useState(false);
  const [openEditorFor, setOpenEditorFor] = useState(null);

  // Date range for every widget. Not saved: each visit starts at today.
  const [range, setRange] = useState(() => presetRange("today"));

  // A quick pick ("Today", "This month") stays current if the page is left open past midnight
  useEffect(() => {
    const refresh = () =>
      setRange((current) => {
        if (current.preset === "custom") return current;
        const next = presetRange(current.preset);
        return next.from === current.from && next.to === current.to ? current : next;
      });
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);

  useEffect(() => {
    if (location.state?.justLoggedIn) {
      showSuccessToast("Success", "Login successful!");
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // A new dashboard opens straight in the editor once it has loaded
  useEffect(() => {
    if (
      openEditorFor &&
      dashboard.loadedId === openEditorFor &&
      !dashboard.loading &&
      !dashboard.editing
    ) {
      setOpenEditorFor(null);
      dashboard.startEditing();
    }
  }, [openEditorFor, dashboard]);

  const handleNew = async () => {
    setCreating(true);
    try {
      const id = await list.create();
      if (id) setOpenEditorFor(id);
    } catch (err) {
      console.error("Create dashboard failed:", err);
      showErrorToast("Couldn't create a new dashboard. Try again.");
    } finally {
      setCreating(false);
    }
  };

  const handleSave = async () => {
    try {
      const saved = await dashboard.save();
      if (saved) {
        showSuccessToast("Dashboard saved");
        list.reload();
      }
    } catch (err) {
      console.error("Save failed:", err);
      showErrorToast("Couldn't save your dashboard. Try again.");
    }
  };

  const handleDelete = async () => {
    const id = list.activeId;
    if (!id) return;
    try {
      dashboard.cancelEditing();
      await list.remove(id);
      showSuccessToast("Dashboard deleted");
    } catch (err) {
      console.error("Delete failed:", err);
      showErrorToast("Couldn't delete this dashboard. Try again.");
    }
  };

  if (dashboard.editing) {
    return (
      <DashboardRangeProvider value={range}>
        <div className="p-1">
          <Editor dashboard={dashboard} onSave={handleSave} onDelete={handleDelete} />
        </div>
      </DashboardRangeProvider>
    );
  }

  const hasDashboards = list.dashboards.length > 0;
  const loading = list.loading || (hasDashboards && dashboard.loading);

  return (
    <DashboardRangeProvider value={range}>
      <div className="p-1">
        <Hero
          fullname={fullname}
          isNarrow={isNarrow}
          disabled={loading || creating || Boolean(list.error || dashboard.loadError)}
          onCustomize={hasDashboards ? dashboard.startEditing : handleNew}
          showTabs={!list.loading && !list.error}
          dashboards={list.dashboards}
          activeId={list.activeId}
          onSelectTab={list.setActiveId}
          onNewTab={handleNew}
          creating={creating}
          range={range}
          onRangeChange={setRange}
        />

        <Viewer
          widgets={hasDashboards ? dashboard.widgets : []}
          stacked={isNarrow}
          loading={loading}
          error={list.error || dashboard.loadError}
          onRetry={() => (list.error ? list.reload() : dashboard.reload())}
          onStart={hasDashboards ? dashboard.startEditing : handleNew}
          canEdit={!isNarrow && !creating}
        />
      </div>
    </DashboardRangeProvider>
  );
};

export default Dashboard;