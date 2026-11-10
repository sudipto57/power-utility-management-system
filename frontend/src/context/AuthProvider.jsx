import { useCallback, useEffect, useMemo, useState } from 'react';
import { AuthContext } from './auth-context';
import { tokenStore } from '../api/client';
import * as authApi from '../api/auth';

// Wraps the whole app and remembers who is logged in.
export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // If a token is saved, we first ask the backend who it belongs to
  const [checking, setChecking] = useState(() => Boolean(tokenStore.get()));

  useEffect(() => {
    if (!tokenStore.get()) return;
    let active = true;
    authApi
      .getMe()
      .then((me) => active && setUser(me))
      .catch(() => {
        tokenStore.clear();
        if (active) setUser(null);
      })
      .finally(() => active && setChecking(false));
    return () => {
      active = false;
    };
  }, []);

  // The API client fires this event when the token has expired
  useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, []);

  const login = useCallback(async (loginName, password) => {
    const result = await authApi.login(loginName, password);
    tokenStore.set(result.token);
    setUser(result.user);
    return result.user;
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, checking, login, logout }), [user, checking, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
