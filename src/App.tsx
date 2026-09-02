import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { FullScreenSpinner } from './components/Feedback';
import { BottomNav } from './components/BottomNav';
import { AuthPage } from './screens/AuthPage';
import { ProfilePage } from './screens/ProfilePage';
import { JobsPage } from './screens/JobsPage';
import { JobDetailPage } from './screens/JobDetailPage';
import { PostJobPage } from './screens/PostJobPage';
import { MyJobsPage } from './screens/MyJobsPage';
import { MyApplicationsPage } from './screens/MyApplicationsPage';
import { SubscriptionPage } from './screens/SubscriptionPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return <FullScreenSpinner message="Loading..." />;
  if (!session) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return <FullScreenSpinner message="Loading..." />;
  if (session) return <Navigate to="/jobs" replace />;
  return <>{children}</>;
}

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="mx-auto max-w-md min-h-screen bg-white shadow-sm relative">
        {children}
        <BottomNav />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/auth" element={
        <PublicRoute><AuthPage /></PublicRoute>
      } />
      <Route path="/" element={
        <ProtectedRoute><AppLayout><JobsPage /></AppLayout></ProtectedRoute>
      } />
      <Route path="/jobs" element={
        <ProtectedRoute><AppLayout><JobsPage /></AppLayout></ProtectedRoute>
      } />
      <Route path="/jobs/:id" element={
        <ProtectedRoute><AppLayout><JobDetailPage /></AppLayout></ProtectedRoute>
      } />
      <Route path="/post-job" element={
        <ProtectedRoute><AppLayout><PostJobPage /></AppLayout></ProtectedRoute>
      } />
      <Route path="/my-jobs" element={
        <ProtectedRoute><AppLayout><MyJobsPage /></AppLayout></ProtectedRoute>
      } />
      <Route path="/applications" element={
        <ProtectedRoute><AppLayout><MyApplicationsPage /></AppLayout></ProtectedRoute>
      } />
      <Route path="/profile" element={
        <ProtectedRoute><AppLayout><ProfilePage /></AppLayout></ProtectedRoute>
      } />
      <Route path="/subscription" element={
        <ProtectedRoute><AppLayout><SubscriptionPage /></AppLayout></ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
