import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Timetable } from './pages/Timetable';
import { Bookings } from './pages/Bookings';
import { Approvals } from './pages/Approvals';
import { AIAssistant } from './pages/AIAssistant';
import { Exams } from './pages/Exams';
import { FacultyAvailability } from './pages/FacultyAvailability';
import { ConflictReports } from './pages/ConflictReports';
import { AuditHistory } from './pages/AuditHistory';
import { AdminSettings } from './pages/AdminSettings';
import { Login } from './pages/Login';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="timetable" element={<Timetable />} />
            <Route path="bookings" element={<Bookings />} />
            <Route path="approvals" element={<Approvals />} />
            <Route path="ai-assistant" element={<AIAssistant />} />
            <Route path="exams" element={<Exams />} />
            <Route path="faculty" element={<FacultyAvailability />} />
            <Route path="conflicts" element={<ConflictReports />} />
            <Route path="audit" element={<AuditHistory />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
