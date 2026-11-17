import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./authContext";
import MasterAccessRightsAPI from "../../../private/dev_tools/masterAccessRightsAPI";

const EMPTY = { isSystem: false, permissions: new Set() };

const PermissionsContext = createContext({
  can: () => false,
  isSystem: false,
  loading: true,
  refresh: () => {},
});

export const PermissionsProvider = ({ children }) => {
  const { session, loading: authLoading } = useAuth();
  const [state, setState] = useState(EMPTY);
  const [loading, setLoading] = useState(true);

  const sessionKey = session ? `${session.id ?? ""}|${session.access_type ?? ""}` : null;

  const loadPermissions = useCallback(async () => {
    if (!sessionKey) {
      setState(EMPTY);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await MasterAccessRightsAPI.getMyPermissions();
      setState({
        isSystem: !!data?.isSystem,
        permissions: new Set(data?.permissions || []),
      });
    } catch (error) {
      console.error("Failed to load permissions:", error);
      setState(EMPTY);
    } finally {
      setLoading(false);
    }
  }, [sessionKey]);

  useEffect(() => {
    if (authLoading) return;
    loadPermissions();
  }, [authLoading, loadPermissions]);

  // can("credit_memos")            -> view
  // can("credit_memos", "approve") -> approve
  const can = useCallback(
    (pageCode, action = "view") =>
      state.isSystem || state.permissions.has(`${pageCode}.${String(action).toLowerCase()}`),
    [state]
  );

  const value = useMemo(
    () => ({ can, isSystem: state.isSystem, loading: authLoading || loading, refresh: loadPermissions }),
    [can, state.isSystem, authLoading, loading, loadPermissions]
  );

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>;
};

export const usePermissions = () => useContext(PermissionsContext);