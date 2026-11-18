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

  const login = useCallback(async (loginName, password, role) => {
    const result = await authApi.login(loginName, password, role);
    tokenStore.set(result.token);
    setUser(result.user);
    return result.user;
  }, []);

  // Customer sign up: the account is created and a 6-digit code is emailed (no login yet)
  const signup = useCallback((data) => authApi.signup(data), []);

  // The right code from the email confirms the account and logs the customer in
  const confirmEmail = useCallback(async (loginName, code) => {
    const result = await authApi.confirmEmail(loginName, code);
    tokenStore.set(result.token);
    setUser(result.user);
    return result.user;
  }, []);

  // After the customer changes their name: show the new name in the top bar
  const refreshUser = useCallback(async () => {
    setUser(await authApi.getMe());
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, checking, login, signup, confirmEmail, refreshUser, logout }),
    [user, checking, login, signup, confirmEmail, refreshUser, logout]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
