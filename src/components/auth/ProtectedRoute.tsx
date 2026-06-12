import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface Props {
  allowIncompleteOnboarding?: boolean;
}

export default function ProtectedRoute({ allowIncompleteOnboarding = false }: Props) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 28, height: 28, border: '2px solid rgba(255,255,255,0.1)', borderTop: '2px solid #1A65D3', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (!user.onboardingComplete && !allowIncompleteOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  if (user.onboardingComplete && allowIncompleteOnboarding) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
