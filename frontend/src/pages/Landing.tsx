import { Link, useNavigate } from 'react-router-dom';
import { Scale, FileText, Search, Shield } from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import { useEffect } from 'react';

export default function Landing() {
  const { token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (token) {
      navigate('/workspace');
    }
  }, [token, navigate]);

  return (
    <div className="min-h-screen bg-background text-textMain overflow-hidden">
      {/* Navbar */}
      <nav className="w-full glass-panel fixed top-0 z-50 flex items-center justify-between px-8 py-4">
        <div className="flex items-center gap-2">
          <Scale className="text-primary h-8 w-8" />
          <span className="text-xl font-serif font-bold text-white tracking-wide">LexCounsel AI</span>
        </div>
        <div className="flex gap-4">
          <Link to="/auth" className="btn-secondary">Log In</Link>
          <Link to="/auth" className="btn-primary">Get Started</Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="pt-32 pb-20 px-8 max-w-7xl mx-auto flex flex-col items-center text-center">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
        
        <h1 className="text-5xl md:text-7xl font-serif font-bold text-white mb-6 leading-tight animate-slide-up">
          Your AI Legal <span className="text-primary italic">Co-Counsel</span>
        </h1>
        <p className="text-xl text-textMuted max-w-2xl mb-10 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          Draft precise legal notices and NDAs. Research Indian case law instantly. Designed exclusively for practicing advocates.
        </p>
        
        <div className="flex gap-4 animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <Link to="/auth" className="btn-primary text-lg px-8 py-4 flex items-center gap-2 shadow-lg shadow-primary/25">
            Enter Workspace <Shield className="h-5 w-5" />
          </Link>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-2 gap-8 mt-24 w-full animate-slide-up" style={{ animationDelay: '0.6s' }}>
          <div className="glass-panel p-8 rounded-2xl flex flex-col items-start text-left hover:border-primary/50 transition-colors">
            <div className="h-12 w-12 bg-primary/20 rounded-xl flex items-center justify-center mb-6">
              <FileText className="text-primary h-6 w-6" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">AI Legal Drafting</h3>
            <p className="text-textMuted leading-relaxed">
              Generate structured, properly formatted Legal Notices and NDAs governed by Indian law. Ready to edit, download as DOCX, and sign.
            </p>
          </div>

          <div className="glass-panel p-8 rounded-2xl flex flex-col items-start text-left hover:border-accent/50 transition-colors">
            <div className="h-12 w-12 bg-accent/20 rounded-xl flex items-center justify-center mb-6">
              <Search className="text-accent h-6 w-6" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">Precedent Research</h3>
            <p className="text-textMuted leading-relaxed">
              Ask natural language questions and get grounded answers backed by a curated corpus of landmark Indian judgments and bare acts.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
