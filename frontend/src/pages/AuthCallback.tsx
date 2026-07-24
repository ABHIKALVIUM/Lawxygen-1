import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    const id = searchParams.get('id') || 'oauth-user'; // fallback
    const email = searchParams.get('email');
    const name = searchParams.get('name');

    if (token && email) {
      login(token, { id, email, name: name || undefined });
      navigate('/workspace', { replace: true });
    } else {
      navigate('/auth?error=oauth_failed', { replace: true });
    }
  }, [searchParams, login, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-white">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        <p>Authenticating...</p>
      </div>
    </div>
  );
}
