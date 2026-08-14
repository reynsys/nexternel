import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, clearStoredTokens, getStoredAccessToken, type User } from "../api";
import { USER_UPDATED_EVENT } from "../lib/user-events";

export function useShellAuth() {
  const navigate = useNavigate();
  const signedIn = Boolean(getStoredAccessToken());
  /** undefined = still loading /api/v1/auth/me */
  const [user, setUser] = useState<User | null | undefined>(signedIn ? undefined : null);

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
        if (!cancelled) {
          setUser(null);
          clearStoredTokens();
          navigate("/login", { replace: true });
        }
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
    authLoading: signedIn && user === undefined,
    isAdmin: Boolean(user?.isAdmin ?? user?.role === "admin"),
    permissions: user?.permissions ?? null,
    logout,
  };
}
