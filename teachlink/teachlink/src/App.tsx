import { useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { FullScreenSpinner } from './components/Feedback';
import { BottomNav } from './components/BottomNav';
import { Splash } from './components/Splash';
import { AuthPage } from './screens/AuthPage';
import { ProfilePage } from './screens/ProfilePage';
import { JobsPage } from './screens/JobsPage';
import { JobDetailPage } from './screens/JobDetailPage';
import { PostJobPage } from './screens/PostJobPage';
import { MyJobsPage } from './screens/MyJobsPage';
import { MyApplicationsPage } from './screens/MyApplicationsPage';
import { SubscriptionPage } from './screens/SubscriptionPage';
import { DashboardPage } from './screens/DashboardPage';
import { SavedJobsPage } from './screens/SavedJobsPage';
import { NotificationsPage } from './screens/NotificationsPage';
import { MessagesPage } from './screens/MessagesPage';
import { SupportPage } from './screens/SupportPage';
import { SuspendedPage } from './screens/SuspendedPage';
import { AdminDashboardPage } from './screens/AdminDashboardPage';
import { PublicProfilePage } from './screens/PublicProfilePage';

const isTeacher = (role: string | null) => role === 'school_teacher' || role === 'university_lecturer';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return <FullScreenSpinner message="Loading..." />;
  if (!session) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { session, loading, profile } = useAuth();
  if (loading) return <FullScreenSpinner message="Loading..." />;
  if (session && profile) return <Navigate to={isTeacher(profile.role) ? '/jobs' : '/dashboard'} replace />;
  if (session && !profile) return <FullScreenSpinner message="Setting up your account..." />;
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
  const [showSplash, setShowSplash] = useState(true);
  const { profile } = useAuth();
  const location = useLocation();

  if (showSplash) {
    return <Splash onDone={() => setShowSplash(false)} />;
  }

  if (profile?.account_status === 'suspended' && location.pathname !== '/support') {
    return <SuspendedPage />;
  }

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
      <Route path="/dashboard" element={
        <ProtectedRoute><AppLayout><DashboardPage /></AppLayout></ProtectedRoute>
      } />
      <Route path="/saved" element={
        <ProtectedRoute><AppLayout><SavedJobsPage /></AppLayout></ProtectedRoute>
      } />
      <Route path="/notifications" element={
        <ProtectedRoute><AppLayout><NotificationsPage /></AppLayout></ProtectedRoute>
      } />
      <Route path="/messages" element={
        <ProtectedRoute><AppLayout><MessagesPage /></AppLayout></ProtectedRoute>
      } />
      <Route path="/messages/:conversationId" element={
        <ProtectedRoute><AppLayout><MessagesPage /></AppLayout></ProtectedRoute>
      } />
      <Route path="/support" element={<ProtectedRoute><SupportPage /></ProtectedRoute>} />
      <Route path="/profiles/:id" element={<ProtectedRoute><AppLayout><PublicProfilePage /></AppLayout></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute><AppLayout><AdminDashboardPage /></AppLayout></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
