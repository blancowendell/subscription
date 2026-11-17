import { useCallback, useEffect, useState } from "react";
import DashboardAPI from "../../../../api/private/dashboard/dashboardAPI";
import { useAuth } from "../../../../api/public/auth/parts/authContext";

// The "Information" list depends on the user's role, so it's kept per user
// and refreshed after a minute (access may have changed in Data Source Access).
const SOURCES_TTL = 60 * 1000;
const cache = new Map();

// One key per login: the same browser tab can be used by different people
export const userCacheKey = (session) =>
  session ? `${session.user_source || ""}:${session.id || ""}:${session.access_id || ""}` : "guest";

const normalize = (res) => {
  let data = res;
  for (let i = 0; i < 3 && data && !Array.isArray(data); i += 1) data = data.data;
  return Array.isArray(data) ? data : [];
};

const fetchSources = (key, force) => {
  const hit = cache.get(key);

  if (!force && hit) {
    if (hit.pending) return hit.pending;
    if (hit.sources && Date.now() - hit.at < SOURCES_TTL) return Promise.resolve(hit.sources);
  }

  const pending = Promise.resolve(DashboardAPI.loadDataSources())
    .then(normalize)
    .then((sources) => {
      cache.set(key, { at: Date.now(), sources });
      return sources;
    })
    .catch((err) => {
      cache.delete(key);
      throw err;
    });

  cache.set(key, { ...(hit || {}), pending });
  return pending;
};

const useDataSources = () => {
  const { session } = useAuth();
  const key = userCacheKey(session);

  const [sources, setSources] = useState(() => cache.get(key)?.sources || []);
  const [loading, setLoading] = useState(() => !cache.get(key)?.sources);
  const [error, setError] = useState(null);

  const load = useCallback(
    async (force = false) => {
      if (!session) return;
      setLoading(true);
      setError(null);
      try {
        setSources(await fetchSources(key, force));
      } catch (err) {
        console.error("Error loading data sources:", err);
        setError("Couldn't load the list of information.");
      } finally {
        setLoading(false);
      }
    },
    [key, session]
  );

  // Reloads when the user changes (login as someone else in the same tab)
  useEffect(() => {
    setSources(cache.get(key)?.sources || []);
    load();
  }, [key, load]);

  return { sources, loading, error, reload: () => load(true) };
};

export default useDataSources;