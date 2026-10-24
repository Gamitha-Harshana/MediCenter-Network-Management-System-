import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

/**
 * AuthProvider — wraps the app and manages authentication state.
 * Reads persisted token/user from localStorage on mount.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Rehydrate from localStorage on first render
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('mcnms_user');
      const storedToken = localStorage.getItem('mcnms_token');
      if (storedUser && storedToken) {
        setUser(JSON.parse(storedUser));
      }
    } catch {
      // Corrupt storage — clear it
      localStorage.removeItem('mcnms_token');
      localStorage.removeItem('mcnms_user');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Persist token + user data after a successful login.
   * @param {string} token - JWT access token
   * @param {Object} userData - { id, role, email, centerId, name }
   */
  const login = (token, userData) => {
    localStorage.setItem('mcnms_token', token);
    localStorage.setItem('mcnms_user', JSON.stringify(userData));
    setUser(userData);
  };

  /** Clear auth state and localStorage. */
  const logout = () => {
    localStorage.removeItem('mcnms_token');
    localStorage.removeItem('mcnms_user');
    setUser(null);
  };

  /** True when a user is logged in. */
  const isAuthenticated = () => Boolean(user);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}

/** Convenience hook for consuming auth context. */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
