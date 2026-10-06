import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { get, post, setUnauthorizedHandler, TOKEN_KEY } from '../api/client.js';
import { storage } from '../lib/storage.js';
import i18n from '../i18n/index.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState({ loading: true, user: null, status: null });

  const refresh = useCallback(async () => {
    try {
      const status = await get('/auth/status');
      let user = null;
      if (storage.get(TOKEN_KEY) || status.anonymousMode) {
        user = await get('/auth/me').catch(() => null);
      }
      setState({ loading: false, user, status });
    } catch (error) {
      setState({ loading: false, user: null, status: null, error });
    }
  }, []);

  const logout = useCallback(() => {
    storage.set(TOKEN_KEY, null);
    queryClient.clear();
    refresh();
  }, [queryClient, refresh]);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    refresh();
  }, [logout, refresh]);

  const finishLogin = useCallback(
    async ({ token, user }) => {
      storage.set(TOKEN_KEY, token);
      queryClient.clear();
      // Adopt the language stored in the profile unless the user picked one here.
      if (user.locale && !storage.get('pm.lang')) i18n.changeLanguage(user.locale);
      await refresh();
    },
    [queryClient, refresh],
  );

  const value = useMemo(
    () => ({
      ...state,
      isAdmin: state.user?.role === 'admin' && !state.user?.anonymous,
      isAuthenticated: Boolean(state.user),
      login: async (email, password) => finishLogin(await post('/auth/login', { email, password })),
      register: async (data) => finishLogin(await post('/auth/register', data)),
      logout,
      refresh,
    }),
    [state, finishLogin, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
