import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from '../components/dashboard/Sidebar';
import { useAuth } from '../hooks/useAuth';
import '../styles/dashboard.css';

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div style={{ background: '#000000', minHeight: '100vh' }}>
      <Sidebar user={user} onLogout={handleLogout} />
      <main
        className="dashboard-main overflow-y-auto"
        style={{ height: '100vh', boxSizing: 'border-box' }}
      >
        <Outlet />
      </main>
    </div>
  );
}
