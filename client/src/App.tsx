import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { useAuth } from '@/context/auth-context';
import { useTaskNotifications } from '@/hooks/use-notifications';
import HomePage from '@/pages/HomePage';
import ListDetailPage from '@/pages/ListDetailPage';
import LoginPage from '@/pages/LoginPage';
import SettingsPage from '@/pages/SettingsPage';
import SmartListPage from '@/pages/SmartListPage';
import TagDetailPage from '@/pages/TagDetailPage';

function NotificationProvider({ children }: { children: ReactNode }) {
  useTaskNotifications();
  return <>{children}</>;
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={(
            <ProtectedRoute>
              <NotificationProvider>
                <MainLayout />
              </NotificationProvider>
            </ProtectedRoute>
          )}
        >
          <Route path="/" element={<HomePage />} />
          <Route path="/lists/:id" element={<ListDetailPage />} />
          <Route path="/smart/:type" element={<SmartListPage />} />
          <Route path="/tags/:id" element={<TagDetailPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
