import { Navigate, Outlet, Route, Routes } from 'react-router-dom';

import { useAuth } from './app/AuthContext';
import { AppLayout } from './components/layout/AppLayout';

import { Billing } from './pages/Billing';
import { Dashboard } from './pages/Dashboard';
import { DoctorManagement } from './pages/DoctorManagement';
import { FinalReportPreview } from './pages/FinalReportPreview';
import { Login } from './pages/Login';
import { ForgotPassword } from './pages/ForgotPassword';
import { Notifications } from './pages/Notifications';
import { PatientPortal } from './pages/PatientPortal';
import { PatientRegistration } from './pages/PatientRegistration';
import { ResultEntry } from './pages/ResultEntry';
import { ResultVerification } from './pages/ResultVerification';
import { ReportVerification } from './pages/ReportVerification';
import { SampleTracking } from './pages/SampleTracking';
import { TestBooking } from './pages/TestBooking';
import { TestManagement } from './pages/TestManagement';
import { AccountManagement } from './pages/AccountManagement';
import { ResetPassword } from './pages/ResetPassword';

import type { Role } from './types/labflow';

function ProtectedRoute({
  allowedRoles,
}: {
  allowedRoles?: Role[];
}) {
  const { user, role } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/verify" element={<ReportVerification />} />

      {/* Protected application routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={['Admin']} />
            }
          >
            <Route index element={<Dashboard />} />
          </Route>

          <Route
            path="/patients/register"
            element={
              <ProtectedRoute
                allowedRoles={['Admin', 'Receptionist']}
              />
            }
          >
            <Route index element={<PatientRegistration />} />
          </Route>

          <Route
            path="/accounts/create"
            element={
              <ProtectedRoute allowedRoles={['Admin']} />
            }
          >
            <Route index element={<AccountManagement />} />
          </Route>

          <Route
            path="/doctors"
            element={
              <ProtectedRoute allowedRoles={['Admin']} />
            }
          >
            <Route index element={<DoctorManagement />} />
          </Route>

          <Route
            path="/tests/manage"
            element={
              <ProtectedRoute allowedRoles={['Admin']} />
            }
          >
            <Route index element={<TestManagement />} />
          </Route>

          <Route
            path="/bookings/new"
            element={
              <ProtectedRoute
                allowedRoles={['Admin', 'Receptionist']}
              />
            }
          >
            <Route index element={<TestBooking />} />
          </Route>

          <Route
            path="/billing"
            element={
              <ProtectedRoute
                allowedRoles={['Admin', 'Receptionist']}
              />
            }
          >
            <Route index element={<Billing />} />
          </Route>

          <Route
            path="/samples"
            element={
              <ProtectedRoute
                allowedRoles={['Admin', 'Lab Technician']}
              />
            }
          >
            <Route index element={<SampleTracking />} />
          </Route>

          <Route
            path="/results/entry/:sampleId"
            element={
              <ProtectedRoute
                allowedRoles={['Admin', 'Lab Technician']}
              />
            }
          >
            <Route index element={<ResultEntry />} />
          </Route>

          <Route
            path="/results/verification"
            element={
              <ProtectedRoute allowedRoles={['Doctor']} />
            }
          >
            <Route index element={<ResultVerification />} />
          </Route>

          <Route
            path="/reports/preview"
            element={
              <ProtectedRoute
                allowedRoles={[
                  'Admin',
                  'Doctor',
                  'Lab Technician',
                ]}
              />
            }
          >
            <Route index element={<FinalReportPreview />} />
          </Route>

          <Route
            path="/portal"
            element={
              <ProtectedRoute allowedRoles={['Patient']} />
            }
          >
            <Route index element={<PatientPortal />} />
          </Route>

          <Route
            path="/notifications"
            element={
              <ProtectedRoute
                allowedRoles={[
                  'Admin',
                  'Receptionist',
                  'Doctor',
                  'Lab Technician',
                  'Patient',
                ]}
              />
            }
          >
            <Route index element={<Notifications />} />
          </Route>
        </Route>
      </Route>

      {/* Unknown route */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
