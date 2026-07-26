import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, clearStoredTokens, getStoredAccessToken, type User } from "../api";
import { USER_UPDATED_EVENT } from "../lib/user-events";

export function useShellAuth() {
  const navigate = useNavigate();
  const signedIn = Boolean(getStoredAccessToken());
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!signedIn) {
      setUser(null);
      return;
    }

    let cancelled = false;

    async function loadMe() {
      try {
        const r = await api.me();
        if (!cancelled) setUser(r.user);
      } catch {
        if (!cancelled) setUser(null);
      }
    }

    void loadMe();

    function onUpdated() {
      void loadMe();
    }
    window.addEventListener(USER_UPDATED_EVENT, onUpdated);
    return () => {
      cancelled = true;
      window.removeEventListener(USER_UPDATED_EVENT, onUpdated);
    };
  }, [signedIn]);

  async function logout() {
    try {
      await api.logout();
    } finally {
      clearStoredTokens();
      setUser(null);
      navigate("/login");
    }
  }

  return {
    signedIn,
    user,
    isAdmin: Boolean(user?.isAdmin ?? user?.role === "admin"),
    permissions: user?.permissions ?? null,
    logout,
  };
}
