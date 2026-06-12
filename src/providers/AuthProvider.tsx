import { useState, useCallback, useEffect, type ReactNode } from 'react';
import { authService } from '../services/auth.service';
import { AuthContext } from '../hooks/useAuth';
import type { ProfileUpdate, User } from '../types/auth.types';

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const restore = async () => {
      try {
        if (authService.isAuthenticated()) {
          const u = await authService.me();
          setUser(u);
        } else {
          await authService.refreshToken();
          const u = await authService.me();
          setUser(u);
        }
      } catch {
        authService.clearLocal();
      } finally {
        setIsLoading(false);
      }
    };
    restore();
  }, []);

  const login = useCallback(async (email: string, password: string, _role?: string) => {
    setError(null);
    const res = await authService.login(email, password, _role ?? '');
    setUser(res.user);
    return res.user;
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string, role?: string) => {
    setError(null);
    const res = await authService.signup(name, email, password, role ?? 'fan');
    setUser(res.user);
    return res.user;
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (patch: ProfileUpdate) => {
    const updated = await authService.updateProfile(patch);
    setUser(updated);
    return updated;
  }, []);

  const deleteAccount = useCallback(async () => {
    await authService.deleteAccount();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        logout,
        updateProfile,
        deleteAccount,
        error,
        setError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
