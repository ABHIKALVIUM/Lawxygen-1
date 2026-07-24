import { useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../store/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Scale } from 'lucide-react';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/signup';
      const payload = isLogin ? { email, password } : { email, password, name };
      
      const { data } = await api.post(endpoint, payload);
      login(data.accessToken, data.user);
      navigate('/workspace');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = () => {
    // Redirect to backend OAuth endpoint
    window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/auth/google`;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background pointer-events-none" />
      
      <div className="w-full max-w-md glass-panel p-8 rounded-2xl relative z-10">
        <div className="flex flex-col items-center mb-8">
          <Scale className="text-primary h-12 w-12 mb-4" />
          <h2 className="text-3xl font-serif font-bold text-white">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-textMuted mt-2 text-center">
            Access your AI legal co-counsel workspace.
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-textMuted mb-1">Full Name</label>
              <input
                type="text"
                required
                className="input-field"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Advocate Name"
              />
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-textMuted mb-1">Email</label>
            <input
              type="email"
              required
              className="input-field"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="name@chambers.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-textMuted mb-1">Password</label>
            <input
              type="password"
              required
              minLength={8}
              className="input-field"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full mt-6">
            {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Sign Up')}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-between">
          <hr className="w-full border-slate-700" />
          <span className="p-2 text-textMuted text-sm">OR</span>
          <hr className="w-full border-slate-700" />
        </div>

        <button 
          onClick={handleGoogleAuth}
          className="w-full bg-white text-gray-800 hover:bg-gray-100 font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-3 transition-colors mt-4"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continue with Google
        </button>

        <p className="text-center text-textMuted mt-8 text-sm">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
          <button onClick={() => setIsLogin(!isLogin)} className="text-primary hover:underline">
            {isLogin ? 'Sign Up' : 'Log In'}
          </button>
        </p>
      </div>
    </div>
  );
}
