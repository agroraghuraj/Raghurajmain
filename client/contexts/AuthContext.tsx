  // Normalize avatar URL to absolute and add cache busting
  const normalizeAvatar = (raw?: string | null): string | undefined => {
    try {
      let avatar = (raw || '').trim();
      if (!avatar) return undefined;

      const apiUrl = new URL(API_BASE_URL);

      if (!/^https?:\/\//i.test(avatar)) {
        // Relative path -> URL-join with API origin to avoid double slashes
        avatar = new URL(avatar, apiUrl.origin).href;
      } else {
        // Absolute URL -> if different origin, rewrite to API origin (keep path+query)
        const parsed = new URL(avatar);
        if (parsed.origin !== apiUrl.origin) {
          const pathWithQuery = parsed.pathname + (parsed.search || '');
          const needsSlash = !apiUrl.href.endsWith('/') && !pathWithQuery.startsWith('/');
          avatar = `${apiUrl.origin}${needsSlash ? '/' : ''}${pathWithQuery}`;
        }
      }

      // Cache busting to reflect recent changes
      const sep = avatar.includes('?') ? '&' : '?';
      avatar = `${avatar}${sep}t=${Date.now()}`;
      return avatar;
    } catch {
      return raw || undefined;
    }
  };

import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient, { API_BASE_URL } from '@/lib/api';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'admin' | 'manager' | 'cashier';
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  resetRateLimit: () => void;
  isRateLimited: boolean;
  updateUser: (updatedUser: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastLoginAttempt, setLastLoginAttempt] = useState<number>(0);
  const [loginAttempts, setLoginAttempts] = useState<number>(0);
  const [isRateLimited, setIsRateLimited] = useState<boolean>(false);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        // Check if user is already logged in (from localStorage)
        const savedUser = localStorage.getItem('electromart_user');
        const savedToken = localStorage.getItem('electromart_token');

        if (savedUser && savedToken) {
          try {
            const userData = JSON.parse(savedUser);
            // Normalize avatar from persisted storage
            if (userData && userData.avatar) {
              userData.avatar = normalizeAvatar(userData.avatar) as string;
            }
            
            // Verify token is still valid by making a test API call
            const response = await apiClient.get('/api/auth/me', {
              headers: {
                Authorization: `Bearer ${savedToken}`
              }
            });

            if (response.data.success) {
              setUser(userData);
            } else {
              // Token is invalid, clear storage
              localStorage.removeItem('electromart_user');
              localStorage.removeItem('electromart_token');
            }
          } catch (error) {
            console.log('Token validation failed:', error);
            // Token is invalid or expired, clear storage
            localStorage.removeItem('electromart_user');
            localStorage.removeItem('electromart_token');
          }
        }
      } catch (error) {
        console.log('Auth check failed:', error);
        // Clear any corrupted data
        localStorage.removeItem('electromart_user');
        localStorage.removeItem('electromart_token');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  // Clear rate limiting after cooldown period
  useEffect(() => {
    if (isRateLimited) {
      const timer = setTimeout(() => {
        setIsRateLimited(false);
        setLoginAttempts(0);
        console.log('✅ Login rate limiting cleared');
      }, 10000); // 10 seconds

      return () => clearTimeout(timer);
    }
  }, [isRateLimited]);

  const login = async (email: string, password: string): Promise<boolean> => {
    const now = Date.now();
    const MIN_LOGIN_INTERVAL = 500; // 0.5 seconds between login attempts (very reduced)
    const MAX_ATTEMPTS = 50; // Much higher max attempts
    const RATE_LIMIT_COOLDOWN = 5000; // 5 seconds cooldown (very reduced)

    // Reset rate limiting if enough time has passed
    if (isRateLimited && (now - lastLoginAttempt) > RATE_LIMIT_COOLDOWN) {
      setIsRateLimited(false);
      setLoginAttempts(0);
      console.log('✅ Rate limiting auto-reset');
    }

    // Check if we're rate limited
    if (isRateLimited) {
      const remainingTime = Math.ceil((RATE_LIMIT_COOLDOWN - (now - lastLoginAttempt)) / 1000);
      console.warn(`⏱️ Login rate limited: Wait ${remainingTime}s before retry`);
      return false;
    }

    // Check minimum interval between attempts (very lenient)
    if (now - lastLoginAttempt < MIN_LOGIN_INTERVAL) {
      const remainingTime = Math.ceil((MIN_LOGIN_INTERVAL - (now - lastLoginAttempt)) / 1000);
      console.warn(`⏱️ Login too frequent: Wait ${remainingTime}s before retry`);
      return false;
    }

    // Check if we've exceeded max attempts (very high limit)
    if (loginAttempts >= MAX_ATTEMPTS) {
      setIsRateLimited(true);
      setLastLoginAttempt(now);
      console.warn(`⏱️ Too many login attempts: Rate limited for ${RATE_LIMIT_COOLDOWN / 1000}s`);
      return false;
    }

    setIsLoading(true);
    setLastLoginAttempt(now);
    setLoginAttempts(prev => prev + 1);

    try {
      // Add retry logic for 429 errors
      let response;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          response = await apiClient.post('/api/auth/login', {
            email,
            password
          });
          break; // Success, exit retry loop
        } catch (error: any) {
          if (error.response?.status === 429 && retryCount < maxRetries - 1) {
            retryCount++;
            const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff: 2s, 4s, 8s
            console.log(`🔄 Retrying login attempt ${retryCount}/${maxRetries} after ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          throw error; // Re-throw if not 429 or max retries reached
        }
      }

      const data = response.data;

      if (data.success && data.data?.user) {
        const userData: User = {
          id: data.data.user.id,
          name: data.data.user.name,
          email: data.data.user.email,
          avatar: normalizeAvatar(data.data.user.avatar),
          role: data.data.user.role
        };

        setUser(userData);
        localStorage.setItem('electromart_user', JSON.stringify(userData));
        localStorage.setItem('electromart_token', data.data.token);
        
        // Reset rate limiting on successful login
        setLoginAttempts(0);
        setIsRateLimited(false);
        
        setIsLoading(false);
        return true;
      } else {
        setIsLoading(false);
        return false;
      }
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Handle rate limiting from server (but don't set rate limited state since we have retry logic)
      if (error.response?.status === 429) {
        console.warn('⏱️ Server rate limited: All retry attempts failed');
        // Don't set isRateLimited to true since we already tried retries
      }
      
      setIsLoading(false);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('electromart_user');
    localStorage.removeItem('electromart_token');
  };

  const resetRateLimit = async () => {
    try {
      const response = await apiClient.get('/api/dev/reset-rate-limit');
      console.log('🔄 Rate limit reset response:', response.data);
      setIsRateLimited(false);
      setLoginAttempts(0);
      setLastLoginAttempt(0);
      console.log('✅ Rate limiting reset successfully');
    } catch (error) {
      console.error('Error resetting rate limit:', error);
      // Even if reset fails, try to clear local rate limiting
      setIsRateLimited(false);
      setLoginAttempts(0);
      setLastLoginAttempt(0);
      console.log('✅ Rate limiting manually reset (fallback)');
    }
  };

  const updateUser = (updatedUser: User) => {
    const merged = {
      ...updatedUser,
      avatar: normalizeAvatar(updatedUser.avatar)
    } as User;
    setUser(merged);
    localStorage.setItem('electromart_user', JSON.stringify(merged));
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, resetRateLimit, isRateLimited, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};
