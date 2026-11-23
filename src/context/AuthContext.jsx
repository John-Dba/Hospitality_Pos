import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAppData } from './DataContext';

const AuthContext = createContext(null);
const STORAGE_KEY = 'aurora-pos-session';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function AuthProvider({ children }) {
  const { users, updateUser } = useAppData();
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const savedUser = raw ? JSON.parse(raw) : null;
      if (!savedUser) return null;
      return {
        ...savedUser,
        role: savedUser.role === 'storekeeper' ? 'food_storekeeper' : savedUser.role,
        ...(typeof savedUser.email === 'string' &&
        savedUser.email.toLowerCase().endsWith('@aurora.com')
          ? { email: `${savedUser.username}@example.com` }
          : {}),
      };
    } catch {
      return null;
    }
  });

  useEffect(() => {
    try {
      if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, [user]);

  const value = useMemo(() => {
    const login = async (username, password) => {
      await delay(650);
      const account = users.find(
        (candidate) =>
          candidate.username.toLowerCase() === username.trim().toLowerCase(),
      );
      if (!account || account.password !== password) {
        return { ok: false, error: 'Invalid username or password. Please try again.' };
      }
      if (account.active === false) {
        return {
          ok: false,
          error: 'This account has been deactivated. Please contact the administrator.',
        };
      }
      setUser({
        id: account.id,
        username: account.username,
        name: account.name,
        role: account.role,
        email: account.email,
        phone: account.phone,
        color: account.color,
      });
      return { ok: true };
    };

    const logout = () => setUser(null);

    const updateProfile = (patch) => {
      if (!user) return;
      setUser((current) => ({ ...current, ...patch }));
      updateUser(user.id, patch);
    };

    return { user, login, logout, updateProfile };
  }, [user, users, updateUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
