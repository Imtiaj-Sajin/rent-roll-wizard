/* eslint-disable @typescript-eslint/no-explicit-any */
import { createContext, useContext, useEffect, useState, ReactNode } from "react";

const ODIN_API = import.meta.env.VITE_ODIN_API_URL || "http://localhost:3013/api";

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  roles: string[];
  employee?: {
    id: number;
    first_name?: string;
    last_name?: string;
    designation?: string | null;
    profile_photo_url?: string | null;
  } | null;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("auth_token"));
  const [loading, setLoading] = useState<boolean>(Boolean(localStorage.getItem("auth_token")));

  // Hydrate user from token on mount
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    fetch(`${ODIN_API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((data) => setUser(data.user))
      .catch(() => {
        localStorage.removeItem("auth_token");
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const login = async (username: string, password: string) => {
    try {
      const res = await fetch(`${ODIN_API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.error || "Login failed" };
      localStorage.setItem("auth_token", data.token);
      setToken(data.token);
      setUser(data.user);
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message || "Network error" };
    }
  };

  const logout = () => {
    localStorage.removeItem("auth_token");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function authHeader(): Record<string, string> {
  const t = localStorage.getItem("auth_token");
  return t ? { Authorization: `Bearer ${t}` } : {};
}
