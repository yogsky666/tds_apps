import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SettingsProvider } from './contexts/SettingsContext';
import LoginPage from './pages/LoginPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './components/layout/MainLayout';
import UsersPage from './pages/UsersPage';
import KelasPage from './pages/KelasPage';
import PengaturanPage from './pages/PengaturanPage';
import SanksiPage from './pages/SanksiPage';
import IntrospeksiPage from './pages/IntrospeksiPage';
import SiswaPage from './pages/SiswaPage';
import PelanggaranPage from './pages/PelanggaranPage';
import BimbinganPage from './pages/BimbinganPage';
import ProfilePage from './pages/ProfilePage';
import ExportPage from './pages/ExportPage';
import LogsPage from './pages/LogsPage';
import LandingPage from './pages/LandingPage';
import { useAuth } from './hooks/useAuth';
import { Role } from './types';
import SiswaDashboardPage from './pages/SiswaDashboardPage';

const DashboardSelector: React.FC = () => {
  const { user } = useAuth();
  if (!user) return null; // Should be handled by ProtectedRoute
  return user.role === Role.SISWA ? <SiswaDashboardPage /> : <DashboardPage />;
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SettingsProvider>
          <div className="bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 min-h-screen">
            <HashRouter>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                
                <Route 
                  path="/app" 
                  element={
                    <ProtectedRoute>
                      <MainLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Navigate to="/app/dashboard" replace />} />
                  <Route path="dashboard" element={<DashboardSelector />} />
                  <Route path="users" element={<UsersPage />} />
                  <Route path="siswa" element={<SiswaPage />} />
                  <Route path="kelas" element={<KelasPage />} />
                  <Route path="sanksi" element={<SanksiPage />} />
                  <Route path="introspeksi" element={<IntrospeksiPage />} />
                  <Route path="bimbingan" element={<BimbinganPage />} />
                  <Route path="pelanggaran" element={<PelanggaranPage />} />
                  <Route path="profile" element={<ProfilePage />} />
                  <Route path="export" element={<ExportPage />} />
                  <Route path="logs" element={<LogsPage />} />
                  <Route path="pengaturan" element={<PengaturanPage />} />
                </Route>

                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </HashRouter>
          </div>
        </SettingsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;