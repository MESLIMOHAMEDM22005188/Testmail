import { useCallback, useEffect, useState } from 'react';
import api from '../services/api.js';

export function useAuthProvider() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshStatus = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/status');
      if (data.authenticated) {
        setUser(data.profile ?? { name: 'Google User' });
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Failed to fetch auth status', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const login = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/url');
      const url = data.url;
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Failed to start Google login', error);
      alert('Could not start Google login. Please try again.');
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
      setUser(null);
    } catch (error) {
      console.error('Failed to logout', error);
    }
  }, []);

  return { user, loading, login, logout, refreshStatus };
}


