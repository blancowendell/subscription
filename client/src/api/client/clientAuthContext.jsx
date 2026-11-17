import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import ClientAuthAPI from "./clientAuthAPI";

// Client portal session, separate from the admin AuthProvider.
const ClientAuthContext = createContext(null);

// Plan picked on the landing page, carried through sign-up until the first login
const PENDING_PLAN_KEY = "client_pending_plan";

export const savePendingPlan = (plan) => {
  try {
    localStorage.setItem(PENDING_PLAN_KEY, JSON.stringify(plan));
  } catch {
    /* storage unavailable: the client can still pick a plan in the portal */
  }
};

export const readPendingPlan = () => {
  try {
    return JSON.parse(localStorage.getItem(PENDING_PLAN_KEY) || "null");
  } catch {
    return null;
  }
};

export const clearPendingPlan = () => {
  try {
    localStorage.removeItem(PENDING_PLAN_KEY);
  } catch {
    /* ignore */
  }
};

export const ClientAuthProvider = ({ children }) => {
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const user = await ClientAuthAPI.session();
      setClient(user);
      return user;
    } catch {
      setClient(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = async (email, password) => {
    const user = await ClientAuthAPI.login(email, password);
    setClient(user);
    return user;
  };

  const logout = async () => {
    try {
      await ClientAuthAPI.logout();
    } finally {
      setClient(null);
    }
  };

  const updateClient = (patch) => setClient((c) => (c ? { ...c, ...patch } : c));

  return (
    <ClientAuthContext.Provider
      value={{ client, loading, isOwner: client?.role === "OWNER", login, logout, refresh, updateClient }}
    >
      {children}
    </ClientAuthContext.Provider>
  );
};

export const useClientAuth = () => {
  const ctx = useContext(ClientAuthContext);
  if (!ctx) throw new Error("useClientAuth must be used inside ClientAuthProvider");
  return ctx;
};
