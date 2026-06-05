import { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

function decodeToken(token) {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => sessionStorage.getItem('token'));
  const [user, setUser]   = useState(() => {
    const raw = sessionStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  });
  const [mustResetPassword, setMustResetPassword] = useState(() => {
    return sessionStorage.getItem('must_reset_password') === 'true';
  });

  const login = useCallback((accessToken, mustReset = false) => {
    const decoded  = decodeToken(accessToken);
    const userData = {
      email:            decoded?.sub,
      id:               decoded?.id,
      role:             decoded?.role,
      // Nurse fields
      access_level:     decoded?.access_level     || null,
      shift_unlocked:   decoded?.shift_unlocked   || false,
      care_id_verified: decoded?.care_id_verified || false,
      // Admin fields
      admin_role:    decoded?.admin_role    || (decoded?.role === 'admin' ? 'platform_admin' : null),
      hospital_id:   decoded?.hospital_id   || null,
      hospital_name: decoded?.hospital_name || null,
      full_name:     decoded?.full_name     || null,
      department:    decoded?.department    || null,
    };
    sessionStorage.setItem('token', accessToken);
    sessionStorage.setItem('user', JSON.stringify(userData));
    sessionStorage.setItem('must_reset_password', mustReset ? 'true' : 'false');
    setToken(accessToken);
    setUser(userData);
    setMustResetPassword(mustReset);
    return userData;
  }, []);

  // Upgrades session to full access after CARE ID verified — no re-login needed
  const updateAccessLevel = useCallback((level) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        access_level:     level,
        shift_unlocked:   level === 'full' ? true : prev.shift_unlocked,
        care_id_verified: level === 'full' ? true : prev.care_id_verified,
      };
      sessionStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearMustReset = useCallback(() => {
    sessionStorage.setItem('must_reset_password', 'false');
    setMustResetPassword(false);
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('must_reset_password');
    setToken(null);
    setUser(null);
    setMustResetPassword(false);
  }, []);

  const isTokenExpired = useCallback(() => {
    if (!token) return true;
    const decoded = decodeToken(token);
    if (!decoded?.exp) return true;
    return decoded.exp * 1000 < Date.now();
  }, [token]);

  return (
    <AuthContext.Provider value={{ token, user, login, logout, isTokenExpired, updateAccessLevel, mustResetPassword, clearMustReset }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
