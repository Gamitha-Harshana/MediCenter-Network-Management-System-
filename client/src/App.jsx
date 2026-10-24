import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Layouts
import DashboardLayout from './components/Layout/DashboardLayout';
import ProtectedRoute from './components/Layout/ProtectedRoute';

// Auth
import Login from './pages/auth/Login';
import RegisterPatient from './pages/auth/RegisterPatient';
import RegisterMediCenter from './pages/auth/RegisterMediCenter';

// SysAdmin
import SysAdminDashboard from './pages/sysadmin/Dashboard';
import PendingCenters from './pages/sysadmin/PendingCenters';
import AllCenters from './pages/sysadmin/AllCenters';
import PendingDoctors from './pages/sysadmin/PendingDoctors';

// MediCenterAdmin
import AdminDashboard from './pages/medicenteradmin/Dashboard';
import AdminDoctors from './pages/medicenteradmin/Doctors';
import AdminSchedules from './pages/medicenteradmin/Schedules';
import AdminPatients from './pages/medicenteradmin/Patients';
import AdminDrugInventory from './pages/medicenteradmin/DrugInventory';
import AdminNotifications from './pages/medicenteradmin/Notifications';
import AdminDeletionRequests from './pages/medicenteradmin/DeletionRequests';

// Doctor
import DoctorDashboard from './pages/doctor/Dashboard';
import DoctorQueue from './pages/doctor/Queue';
import QRScanner from './pages/doctor/QRScanner';
import Consultation from './pages/doctor/Consultation';
import DoctorInventory from './pages/doctor/DrugInventory';
import DoctorSchedules from './pages/doctor/MySchedules';

// Patient
import PatientHome from './pages/patient/Home';
import FindCenters from './pages/patient/FindCenters';
import BookAppointment from './pages/patient/BookAppointment';
import MyAppointments from './pages/patient/MyAppointments';
import HealthRecord from './pages/patient/HealthRecord';
import VisitHistory from './pages/patient/VisitHistory';

function RoleRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  switch (user.role) {
    case 'SysAdmin': return <Navigate to="/sysadmin/dashboard" replace />;
    case 'MediCenterAdmin': return <Navigate to="/admin/dashboard" replace />;
    case 'Doctor': return <Navigate to="/doctor/dashboard" replace />;
    case 'Patient': return <Navigate to="/patient/home" replace />;
    default: return <Navigate to="/login" replace />;
  }
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<RoleRedirect />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<RegisterPatient />} />
        <Route path="/register-center" element={<RegisterMediCenter />} />

        {/* SysAdmin */}
        <Route path="/sysadmin" element={
          <ProtectedRoute allowedRoles={['SysAdmin']}>
            <DashboardLayout />
          </ProtectedRoute>
        }>
          <Route path="dashboard" element={<SysAdminDashboard />} />
          <Route path="centers/pending" element={<PendingCenters />} />
          <Route path="centers" element={<AllCenters />} />
          <Route path="doctors/pending" element={<PendingDoctors />} />
          <Route index element={<Navigate to="dashboard" replace />} />
        </Route>

        {/* MediCenterAdmin */}
        <Route path="/admin" element={
          <ProtectedRoute allowedRoles={['MediCenterAdmin']}>
            <DashboardLayout />
          </ProtectedRoute>
        }>
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="doctors" element={<AdminDoctors />} />
          <Route path="schedules" element={<AdminSchedules />} />
          <Route path="patients" element={<AdminPatients />} />
          <Route path="inventory" element={<AdminDrugInventory />} />
          <Route path="notifications" element={<AdminNotifications />} />
          <Route path="deletions" element={<AdminDeletionRequests />} />
          <Route index element={<Navigate to="dashboard" replace />} />
        </Route>

        {/* Doctor */}
        <Route path="/doctor" element={
          <ProtectedRoute allowedRoles={['Doctor']}>
            <DashboardLayout />
          </ProtectedRoute>
        }>
          <Route path="dashboard" element={<DoctorDashboard />} />
          <Route path="queue" element={<DoctorQueue />} />
          <Route path="scan" element={<QRScanner />} />
          <Route path="consultation" element={<Consultation />} />
          <Route path="inventory" element={<DoctorInventory />} />
          <Route path="schedules" element={<DoctorSchedules />} />
          <Route index element={<Navigate to="dashboard" replace />} />
        </Route>

        {/* Patient */}
        <Route path="/patient" element={
          <ProtectedRoute allowedRoles={['Patient']}>
            <DashboardLayout />
          </ProtectedRoute>
        }>
          <Route path="home" element={<PatientHome />} />
          <Route path="centers" element={<FindCenters />} />
          <Route path="book/:centerId" element={<BookAppointment />} />
          <Route path="appointments" element={<MyAppointments />} />
          <Route path="health-record" element={<HealthRecord />} />
          <Route path="history" element={<VisitHistory />} />
          <Route index element={<Navigate to="home" replace />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
