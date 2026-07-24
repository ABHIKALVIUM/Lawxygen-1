import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import Workspace from './pages/Workspace';
import AuthCallback from './pages/AuthCallback';
import { useAuth } from './store/AuthContext';

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { token, loading } = useAuth();
  
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div></div>;
  if (!token) return <Navigate to="/auth" replace />;
  
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route 
          path="/workspace" 
          element={
            <ProtectedRoute>
              <Workspace />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
