import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, clearStoredTokens, getStoredAccessToken, type User } from "../api";

export function useShellAuth() {
  const navigate = useNavigate();
  const signedIn = Boolean(getStoredAccessToken());
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!signedIn) {
      setUser(null);
      return;
    }
    void api
      .me()
      .then((r) => setUser(r.user))
      .catch(() => setUser(null));
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
    isAdmin: user?.role === "admin",
    logout,
  };
}
