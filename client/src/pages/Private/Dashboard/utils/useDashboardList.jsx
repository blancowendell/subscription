import { useCallback, useEffect, useState } from "react";
import DashboardAPI from "../../../../api/private/dashboard/dashboardAPI";

const unwrapList = (res) => {
  let data = res;
  for (let i = 0; i < 3 && data && !Array.isArray(data); i += 1) data = data.data;
  return (Array.isArray(data) ? data : []).map((d) => ({ id: Number(d.id), title: d.title }));
};

const readStored = (key) => {
  try {
    return Number(window.localStorage.getItem(key)) || null;
  } catch {
    return null;
  }
};

const writeStored = (key, id) => {
  try {
    if (id) window.localStorage.setItem(key, String(id));
    else window.localStorage.removeItem(key);
  } catch {
    // Storage blocked: the tab just isn't remembered
  }
};

// The user's dashboards (tabs) and which one is open.
// storageKey is per user so each person's last tab is remembered separately.
const useDashboardList = (storageKey) => {
  const [dashboards, setDashboards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeId, setActiveIdState] = useState(null);

  const setActiveId = useCallback(
    (id) => {
      setActiveIdState(id);
      writeStored(storageKey, id);
    },
    [storageKey]
  );

  const reload = useCallback(
    async (preferId) => {
      setError(null);
      try {
        const list = unwrapList(await DashboardAPI.listDashboards());
        setDashboards(list);
        setActiveIdState((current) => {
          const wanted = preferId ?? current ?? readStored(storageKey);
          const next = list.some((d) => d.id === wanted) ? wanted : list[0]?.id ?? null;
          writeStored(storageKey, next);
          return next;
        });
      } catch (err) {
        console.error("Error loading dashboards:", err);
        setError("Couldn't load your dashboards.");
      } finally {
        setLoading(false);
      }
    },
    [storageKey]
  );

  useEffect(() => {
    reload();
  }, [reload]);

  // Returns the new dashboard's id
  const create = useCallback(async () => {
    let res = await DashboardAPI.createDashboard();
    for (let i = 0; i < 3 && res && res.id === undefined && res.data; i += 1) res = res.data;
    const id = Number(res?.id) || null;
    await reload(id);
    return id;
  }, [reload]);

  const remove = useCallback(
    async (id) => {
      await DashboardAPI.deleteDashboard(id);
      await reload(null);
    },
    [reload]
  );

  return { dashboards, loading, error, activeId, setActiveId, reload, create, remove };
};

export default useDashboardList;