import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AuthProvider from './providers/AuthProvider';
import CustomCursor from './components/CustomCursor';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Spinner from './components/ui/Spinner';

const LandingPage          = lazy(() => import('./pages/landing/LandingPage'));
const FeaturesPage         = lazy(() => import('./pages/features/FeaturesPage'));
const PricingPage          = lazy(() => import('./pages/pricing/PricingPage'));
const PaymentPage          = lazy(() => import('./pages/payment/PaymentPage'));
const LoginPage            = lazy(() => import('./pages/auth/LoginPage'));
const SignupPage           = lazy(() => import('./pages/auth/SignupPage'));
const OnboardingPage       = lazy(() => import('./pages/auth/OnboardingPage'));
const AccountSettingsPage  = lazy(() => import('./pages/auth/AccountSettingsPage'));
const DashboardLayout      = lazy(() => import('./layouts/DashboardLayout'));
const FeatureLayout        = lazy(() => import('./layouts/FeatureLayout'));
const DashboardPage        = lazy(() => import('./pages/dashboard/DashboardPage'));
const MatchPredictionsPage = lazy(() => import('./pages/match-predictions/MatchPredictionsPage'));
const TablePredictionsPage = lazy(() => import('./pages/table-predictions/TablePredictionsPage'));
const InjuryRiskPage       = lazy(() => import('./pages/injury-risk/InjuryRiskPage'));
const PlayerStatsPage      = lazy(() => import('./pages/player-stats/PlayerStatsPage'));
const ScoutSearchPage      = lazy(() => import('./pages/scout-search/ScoutSearchPage'));
const ScoutResultsPage     = lazy(() => import('./pages/scout-results/ScoutResultsPage'));
const ScoutReportPage      = lazy(() => import('./pages/scout-report/ScoutReportPage'));
const AdminPanelPage       = lazy(() => import('./pages/admin/AdminPanelPage'));
const UserManagementPage   = lazy(() => import('./pages/admin/UserManagementPage'));
const SystemManagementPage = lazy(() => import('./pages/admin/SystemManagementPage'));
const SupportPage          = lazy(() => import('./pages/support/SupportPage'));
const TeamsPage            = lazy(() => import('./pages/teams/TeamsPage'));

const PageFallback = (
  <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <Spinner size={120} />
  </div>
);

export default function App() {
  return (
    <BrowserRouter>
      <CustomCursor />
      <AuthProvider>
        <Suspense fallback={PageFallback}>
          <Routes>
            <Route path="/" element={<div className="page-non-dashboard"><LandingPage /></div>} />
            <Route path="/features" element={<div className="page-non-dashboard"><FeaturesPage /></div>} />
            <Route path="/pricing" element={<div className="page-non-dashboard"><PricingPage /></div>} />
            <Route path="/support" element={<div className="page-non-dashboard"><SupportPage /></div>} />
            <Route path="/teams" element={<div className="page-non-dashboard"><TeamsPage /></div>} />
            <Route path="/payment" element={<div className="page-non-dashboard"><PaymentPage /></div>} />
            <Route path="/login" element={<div className="page-non-dashboard"><LoginPage /></div>} />
            <Route path="/signup" element={<div className="page-non-dashboard"><SignupPage /></div>} />

            <Route element={<ProtectedRoute allowIncompleteOnboarding />}>
              <Route path="/onboarding" element={<OnboardingPage />} />
            </Route>

            <Route element={<ProtectedRoute />}>
              <Route path="/account" element={<AccountSettingsPage />} />
            </Route>

            <Route element={<ProtectedRoute />}>
              <Route element={<FeatureLayout />}>
                <Route path="/match-predictions" element={<MatchPredictionsPage />} />
                <Route path="/table-predictions" element={<TablePredictionsPage />} />
                <Route path="/injury-risk" element={<InjuryRiskPage />} />
                <Route path="/scout-search" element={<ScoutSearchPage />} />
                <Route path="/scout-results" element={<ScoutResultsPage />} />
                <Route path="/scout-report" element={<ScoutReportPage />} />
                <Route path="/player-stats" element={<PlayerStatsPage />} />
              </Route>

              <Route element={<DashboardLayout />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/player-search" element={<Navigate to="/scout-search" replace />} />
                <Route path="/admin" element={<AdminPanelPage />} />
                <Route path="/user-management" element={<UserManagementPage />} />
                <Route path="/system" element={<SystemManagementPage />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
