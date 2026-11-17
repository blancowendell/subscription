import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DashboardAPI from "../../../../api/private/dashboard/dashboardAPI";
import { useAuth } from "../../../../api/public/auth/parts/authContext";
import { humanizeField, toNumber } from "./formatters";
import { useDashboardRange } from "./dateRange";
import { userCacheKey } from "./useDataSources";

const CACHE_TTL = 60 * 1000;

// Shared across widgets of the same user: two widgets on the same data and
// range make one request. Kept per user, since access differs per role.
const cache = new Map();

const normalize = (res) => {
  let data = res;
  for (let i = 0; i < 3 && data && !Array.isArray(data); i += 1) data = data.data;
  return Array.isArray(data) ? data : [];
};

const fetchRows = (userKey, apiName, params, force) => {
  const key = `${userKey}|${apiName}|${params.from}|${params.to}`;
  const hit = cache.get(key);

  if (!force && hit) {
    if (hit.promise) return hit.promise;
    if (Date.now() - hit.at < CACHE_TTL) return Promise.resolve(hit.rows);
  }

  const promise = Promise.resolve(DashboardAPI.loadMaintenanceApi(apiName, params))
    .then(normalize)
    .then((rows) => {
      cache.set(key, { at: Date.now(), rows });
      return rows;
    })
    .catch((err) => {
      cache.delete(key);
      throw err;
    });

  cache.set(key, { ...(hit || {}), promise });
  return promise;
};

// Works out each column's name and whether it holds numbers or text
export const describeFields = (rows) => {
  const sample = rows.slice(0, 25).filter((row) => row && typeof row === "object");
  const names = [];
  sample.forEach((row) =>
    Object.keys(row).forEach((key) => {
      if (!names.includes(key)) names.push(key);
    })
  );

  return names.map((name) => {
    const values = sample
      .map((row) => row[name])
      .filter((v) => v !== null && v !== undefined && v !== "");
    const numeric = values.filter((v) => toNumber(v) !== null).length;
    const isNumber = values.length > 0 && numeric / values.length >= 0.8;
    return { name, label: humanizeField(name), kind: isNumber ? "number" : "text" };
  });
};

// Uses the saved choices if they still exist, otherwise sensible defaults
export const pickFields = (fields, settings = {}) => {
  const has = (name) => Boolean(name) && fields.some((f) => f.name === name);
  const numbers = fields.filter((f) => f.kind === "number");
  const texts = fields.filter((f) => f.kind === "text");

  const valueField = has(settings.valueField) ? settings.valueField : numbers[0]?.name ?? null;
  const labelField = has(settings.labelField)
    ? settings.labelField
    : texts[0]?.name ?? fields.find((f) => f.name !== valueField)?.name ?? null;

  return {
    valueField,
    labelField,
    compareField: has(settings.compareField) ? settings.compareField : null,
    targetField: has(settings.targetField) ? settings.targetField : null,
  };
};

const EMPTY = { rows: [], loading: false, error: null, restricted: false };

// Loads a widget's rows for the dashboard's selected date range
const useWidgetData = (apiName, refreshInterval) => {
  const { session } = useAuth();
  const userKey = userCacheKey(session);
  const { from, to } = useDashboardRange();
  const [state, setState] = useState({ ...EMPTY, loading: Boolean(apiName) });
  const requestRef = useRef(0);

  const load = useCallback(
    async ({ force = false, reset = false } = {}) => {
      const requestId = ++requestRef.current;

      if (!apiName || !session) {
        setState(EMPTY);
        return;
      }

      if (reset) setState({ ...EMPTY, loading: true });

      try {
        const rows = await fetchRows(userKey, apiName, { from, to }, force);
        if (requestId === requestRef.current) setState({ ...EMPTY, rows });
      } catch (err) {
        console.error(`Widget data error (${apiName}):`, err);
        if (requestId === requestRef.current) {
          // 403 = this role may not use this data source
          const restricted = err?.response?.status === 403;
          setState({
            ...EMPTY,
            restricted,
            error: restricted
              ? "You don't have access to this information."
              : "Couldn't load this information.",
          });
        }
      }
    },
    [apiName, from, to, userKey, session]
  );

  // Reloads when the data source, the date range or the user changes
  useEffect(() => {
    load({ reset: true });
    return () => {
      requestRef.current += 1;
    };
  }, [load]);

  useEffect(() => {
    if (!apiName || !refreshInterval) return undefined;
    const seconds = Math.max(10, Number(refreshInterval) || 0);
    const timer = setInterval(() => load({ force: true }), seconds * 1000);
    return () => clearInterval(timer);
  }, [apiName, refreshInterval, load]);

  const fields = useMemo(() => describeFields(state.rows), [state.rows]);

  return {
    ...state,
    fields,
    reload: () => load({ force: true, reset: true }),
  };
};

export default useWidgetData;