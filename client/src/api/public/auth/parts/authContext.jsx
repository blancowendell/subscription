import React, { createContext, useState, useEffect, useContext } from "react";
import authAPI from "../authAPI";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

    console.log("AuthProvider render — session:", session, "loading:", loading); // ← add


  // const loadSession = async () => {
  //   try {
  //     const res = await authAPI.getSession();
  //     console.log("Session API response:", res);
  //     if (res.success) {
  //       setSession(res.user);
  //     }
  //   } catch (err) {
  //     console.warn("No active session.");
  //     setSession(null);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const loadSession = async () => {
    try {
      const res = await authAPI.getSession();
      console.log("Full session response:", JSON.stringify(res)); // ← add this
      if (res.success) {
        setSession({
          ...res.user,
          access_type: res.user.access_type || res.user.role,
        });
      }
    } catch (err) {
      console.warn("No active session.");
      setSession(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSession();
  }, []);

  const logout = async () => {
    await authAPI.logout();
    localStorage.removeItem("APK");
    //localStorage.removeItem("lastRole");
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ session, loading, logout, setSession }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
