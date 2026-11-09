import { useCallback, useEffect, useState } from 'react';
import api from '../services/api.js';

export function useAuthProvider() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  const refreshStatus = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/auth/status');
      setUser(data.authenticated ? data.profile ?? { name: 'Google User' } : null);
      setAuthError('');
      return data.authenticated;
    } catch (error) {
      console.error('Authentication status request failed:', error.message);
      setUser(null);
      setAuthError('Unable to verify your Google session. Please refresh the page.');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const login = useCallback(async () => {
    setAuthError('');
    try {
      const { data } = await api.get('/auth/url');
      if (!data.url) throw new Error('The authentication URL was not returned.');
      window.location.assign(data.url);
    } catch (error) {
      console.error('Could not start Google sign-in:', error.message);
      setAuthError('Could not start Google sign-in. Please try again.');
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout request failed:', error.message);
    } finally {
      setUser(null);
    }
  }, []);

  return { user, loading, authError, login, logout, refreshStatus };
}
