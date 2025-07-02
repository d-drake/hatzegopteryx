'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from '@/lib/axios';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';

interface User {
  id: number;
  email: string;
  username: string;
  is_active: boolean;
  is_superuser: boolean;
  created_at: string;
  updated_at: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<{ message: string }>;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Timeout constants
const AUTH_CHECK_TIMEOUT = 10000; // 10 seconds
const MAX_LOADING_TIME = 15000; // 15 seconds

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Check if user is logged in on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    // Set a maximum loading time failsafe
    const loadingTimeout = setTimeout(() => {
      console.error('Auth check timeout - continuing without auth');
      setLoading(false);
      setUser(null);
    }, MAX_LOADING_TIME);

    try {
      // Check if we're on the client side
      if (typeof window === 'undefined') {
        setLoading(false);
        clearTimeout(loadingTimeout);
        return;
      }
      
      const token = localStorage.getItem('access_token');
      if (!token) {
        setLoading(false);
        clearTimeout(loadingTimeout);
        return;
      }

      // Add timeout to request
      const response = await axios.get('/api/auth/me', {
        timeout: AUTH_CHECK_TIMEOUT
      });
      setUser(response.data);
    } catch (error: any) {
      console.error('Auth check failed:', error.message);
      
      // Log specific error types for debugging
      if (error.code === 'ECONNABORTED') {
        console.error('Request timeout - API might be slow');
      } else if (!error.response) {
        console.error('Network error - check CORS or API availability');
      }
      
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
      }
    } finally {
      setLoading(false);
      clearTimeout(loadingTimeout);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await axios.post('/api/auth/login', {
        email,
        password
      });

      const { access_token, refresh_token } = response.data;
      
      // Store tokens
      if (typeof window !== 'undefined') {
        localStorage.setItem('access_token', access_token);
      }
      Cookies.set('refresh_token', refresh_token);

      // Get user info
      const userResponse = await axios.get('/api/auth/me');
      setUser(userResponse.data);

      // Redirect to dashboard
      router.push('/');
    } catch (error: any) {
      // Handle different error structures
      const errorMessage = error.response?.data?.detail || 
                          error.response?.data?.message || 
                          error.message || 
                          'Login failed';
      throw new Error(errorMessage);
    }
  };

  const logout = async () => {
    try {
      await axios.post('/api/auth/logout', {}, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear tokens and user data
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
      }
      Cookies.remove('refresh_token');
      setUser(null);
      router.push('/login');
    }
  };

  const register = async (email: string, username: string, password: string) => {
    try {
      const response = await axios.post('/api/auth/register', {
        email,
        username,
        password
      });

      return { message: response.data.message };
    } catch (error: any) {
      // Handle different error structures
      const errorMessage = error.response?.data?.detail || 
                          error.response?.data?.message || 
                          error.message || 
                          'Registration failed';
      throw new Error(errorMessage);
    }
  };

  const refreshToken = async () => {
    try {
      const refreshToken = Cookies.get('refresh_token');
      if (!refreshToken) throw new Error('No refresh token');

      const response = await axios.post('/api/auth/refresh', {
        refresh_token: refreshToken
      });

      const { access_token, refresh_token: newRefreshToken } = response.data;
      if (typeof window !== 'undefined') {
        localStorage.setItem('access_token', access_token);
      }
      Cookies.set('refresh_token', newRefreshToken);
    } catch (error) {
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register, refreshToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}