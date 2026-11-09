import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { login, user, loading, authError, refreshStatus } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const authenticated = searchParams.has('authenticated');
  const authErrorParam = searchParams.get('auth_error');

  useEffect(() => {
    if (!authenticated) return undefined;
    let active = true;
    refreshStatus().then((isAuthenticated) => {
      if (active && isAuthenticated) navigate('/dashboard', { replace: true });
    });
    return () => {
      active = false;
    };
  }, [authenticated, refreshStatus, navigate]);

  useEffect(() => {
    if (!loading && user) navigate('/dashboard', { replace: true });
  }, [loading, navigate, user]);

  return (
    <main className="page page--centered">
      <section className="card login-card">
        <p className="eyebrow">TESTMAIL</p>
        <h1>Send better emails.</h1>
        <p className="subtitle">
          Sign in with Google to compose and send messages from your Gmail account using reusable templates.
        </p>
        {authErrorParam && (
          <p className="feedback feedback--error" role="alert">
            Google sign-in was not completed. Please try again.
          </p>
        )}
        {authError && <p className="feedback feedback--error" role="alert">{authError}</p>}
        <button className="button button--primary" onClick={login} disabled={loading}>
          {loading ? 'Checking session…' : 'Continue with Google'}
        </button>
        <p className="footer-text">Testmail requests permission to send email only.</p>
      </section>
    </main>
  );
}
