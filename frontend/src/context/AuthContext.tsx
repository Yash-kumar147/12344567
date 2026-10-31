import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { loginApi } from '../api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  quickLogin: (role: 'admin' | 'coordinator' | 'faculty' | 'club_rep') => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const DEMO_PRESETS = [
  { role: 'admin' as const, email: 'admin@cit.edu', pass: 'Admin@123', label: 'Admin (Dean)' },
  { role: 'coordinator' as const, email: 'coord@cit.edu', pass: 'Coord@123', label: 'Dept Coordinator' },
  { role: 'faculty' as const, email: 'faculty@cit.edu', pass: 'Faculty@123', label: 'Faculty (Dr. Sharma)' },
  { role: 'club_rep' as const, email: 'club@cit.edu', pass: 'Club@123', label: 'Club Representative' },
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('cit_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('cit_token'));
  const [isLoading, setIsLoading] = useState(false);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const data = await loginApi(email, pass);
      setUser(data.user);
      setToken(data.access_token);
      localStorage.setItem('cit_user', JSON.stringify(data.user));
      localStorage.setItem('cit_token', data.access_token);
    } finally {
      setIsLoading(false);
    }
  };

  const quickLogin = async (role: 'admin' | 'coordinator' | 'faculty' | 'club_rep') => {
    const preset = DEMO_PRESETS.find(p => p.role === role);
    if (preset) {
      await login(preset.email, preset.pass);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('cit_user');
    localStorage.removeItem('cit_token');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, quickLogin, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

