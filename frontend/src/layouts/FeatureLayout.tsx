import { Outlet } from 'react-router-dom';
import Navbar from '../components/landing/Navbar';
import '../styles/dashboard.css';

export default function FeatureLayout() {
  return (
    <div style={{ background: '#000000', minHeight: '100vh' }}>
      <Navbar showFeaturesDropdown />
      <main style={{ paddingTop: 64 }}>
        <Outlet />
      </main>
    </div>
  );
}
