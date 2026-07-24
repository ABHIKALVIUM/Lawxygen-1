import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, setupInterceptors } from '../services/api';

interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const logoutAction = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.error(e);
    }
    setToken(null);
    setUser(null);
    window.location.href = '/auth';
  };

  useEffect(() => {
    setupInterceptors(
      () => token,
      (newToken) => setToken(newToken),
      logoutAction
    );
  }, [token]);

  useEffect(() => {
    // Attempt silent refresh on initial load
    const initAuth = async () => {
      try {
        const { data } = await axios.post(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        setToken(data.accessToken);
        setUser(data.user);
      } catch (e) {
        // Normal if not logged in
      } finally {
        setLoading(false);
      }
    };
    
    // Have to import axios directly here to bypass interceptors for initial check
    import('axios').then((axiosModule) => {
        const axios = axiosModule.default;
        initAuth();
    });
  }, []);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout: logoutAction }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
