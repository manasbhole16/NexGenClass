import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { storageService } from '../services/storageService';
import { authApi } from '../api/authApi';
import { socketService } from '../services/socketService';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  register: (data: { fullname: string; email: string; password: string; role: 'student' | 'teacher' }) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const initAuth = async () => {
    try {
      setLoading(true);
      const savedToken = await storageService.getToken();
      const savedUser = await storageService.getUser();

      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(savedUser);
        socketService.connect();
      }
    } catch {
      await storageService.clearAuth();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initAuth();
  }, []);

  const login = async (credentials: { email: string; password: string }) => {
    const res = await authApi.login(credentials);
    if (res.token && res.user) {
      await storageService.setToken(res.token);
      await storageService.setUser(res.user);
      setToken(res.token);
      setUser(res.user);
      socketService.connect();
    }
  };

  const register = async (data: { fullname: string; email: string; password: string; role: 'student' | 'teacher' }) => {
    const res = await authApi.register(data);
    if (res.token && res.user) {
      await storageService.setToken(res.token);
      await storageService.setUser(res.user);
      setToken(res.token);
      setUser(res.user);
      socketService.connect();
    }
  };

  const logout = async () => {
    await authApi.logout();
    await storageService.clearAuth();
    socketService.disconnect();
    setToken(null);
    setUser(null);
  };

  const refreshProfile = async () => {
    try {
      const res = await authApi.getProfile();
      if (res.user) {
        await storageService.setUser(res.user);
        setUser(res.user);
      }
    } catch {
      // Ignore profile refresh failure
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
