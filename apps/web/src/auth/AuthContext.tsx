import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "../api/client";
import type { AuthResult, User } from "../types";

const TOKEN_KEY = "social_hub_token";

type AuthContextValue = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (payload: { emailOrUsername: string; password: string }) => Promise<void>;
  register: (payload: { email: string; username: string; name: string; password: string }) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function saveAuth(result: AuthResult) {
  localStorage.setItem(TOKEN_KEY, result.token);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadUser() {
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const result = await api.me(token);
        if (active) {
          setUser(result.user);
        }
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        if (active) {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadUser();
    return () => {
      active = false;
    };
  }, [token]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      loading,
      async login(payload) {
        const result = await api.login(payload);
        saveAuth(result);
        setToken(result.token);
        setUser(result.user);
      },
      async register(payload) {
        const result = await api.register(payload);
        saveAuth(result);
        setToken(result.token);
        setUser(result.user);
      },
      logout() {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
      },
      updateUser(nextUser) {
        setUser(nextUser);
      }
    }),
    [loading, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth precisa ser usado dentro de AuthProvider");
  }

  return context;
}
