import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { login, user, loading, refreshStatus } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('authenticated')) {
      refreshStatus();
      navigate('/dashboard', { replace: true });
    }
  }, [searchParams, refreshStatus, navigate]);

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [loading, navigate, user]);

  return (
    <div className="page page--centered">
      <div className="card">
        <h1>Welcome back 👋</h1>
        <p className="subtitle">
          Sign in with your Google account so we can send emails on your behalf.
        </p>
        <button className="button button--primary" onClick={login} disabled={loading}>
          {loading ? 'Checking login...' : 'Continue with Google'}
        </button>
        <p className="footer-text">We only ask for Gmail send permission.</p>
      </div>
    </div>
  );
}


