import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Building2,
  Users,
  Calendar,
  Pill,
  Bell,
  QrCode,
  Search,
  ClipboardList,
  LogOut,
  Stethoscope,
  Trash2,
  FileText,
  Heart,
  History,
  Home,
  UserCheck,
  Clock,
} from 'lucide-react';

/** Navigation items for each role */
const NAV_CONFIG = {
  SysAdmin: [
    { to: '/sysadmin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/sysadmin/centers/pending', label: 'Pending Centers', icon: Building2 },
    { to: '/sysadmin/centers', label: 'All Centers', icon: ClipboardList },
    { to: '/sysadmin/doctors/pending', label: 'Pending Doctors', icon: UserCheck },
  ],
  MediCenterAdmin: [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/doctors', label: 'Doctors', icon: Stethoscope },
    { to: '/admin/schedules', label: 'Schedules', icon: Calendar },
    { to: '/admin/patients', label: 'Patients', icon: Users },
    { to: '/admin/inventory', label: 'Drug Inventory', icon: Pill },
    { to: '/admin/notifications', label: 'Notifications', icon: Bell },
    { to: '/admin/deletions', label: 'Deletion Requests', icon: Trash2 },
  ],
  Doctor: [
    { to: '/doctor/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/doctor/queue', label: 'Queue', icon: Clock },
    { to: '/doctor/consultation', label: 'Consultation', icon: FileText },
    { to: '/doctor/inventory', label: 'Drug Inventory', icon: Pill },
    { to: '/doctor/schedules', label: 'My Schedules', icon: Calendar },
  ],
  Patient: [
    { to: '/patient/home', label: 'Home', icon: Home },
    { to: '/patient/centers', label: 'Find Centers', icon: Search },
    { to: '/patient/appointments', label: 'My Appointments', icon: Calendar },
    { to: '/patient/health-record', label: 'Health Record', icon: Heart },
    { to: '/patient/history', label: 'Visit History', icon: History },
  ],
};

/** Role display labels and badge colours */
const ROLE_META = {
  SysAdmin: { label: 'System Admin', colour: 'bg-purple-100 text-purple-700' },
  MediCenterAdmin: { label: 'Center Admin', colour: 'bg-blue-100 text-blue-700' },
  Doctor: { label: 'Doctor', colour: 'bg-green-100 text-green-700' },
  Patient: { label: 'Patient', colour: 'bg-yellow-100 text-yellow-700' },
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navItems = NAV_CONFIG[user?.role] ?? [];
  const roleMeta = ROLE_META[user?.role] ?? { label: user?.role, colour: 'bg-gray-100 text-gray-700' };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-white border-r border-gray-200 shadow-sm">
      {/* ── Logo ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-green-500">
          <Stethoscope size={22} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-gray-800 leading-tight">MediCenter</p>
          <p className="text-xs text-gray-400 leading-tight">Network MS</p>
        </div>
      </div>

      {/* ── Navigation ───────────────────────────────────── */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* ── User info + logout ────────────────────────────── */}
      <div className="px-4 py-4 border-t border-gray-100">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-bold text-sm shrink-0">
            {user?.name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">
              {user?.name ?? user?.email}
            </p>
            <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full mt-0.5 ${roleMeta.colour}`}>
              {roleMeta.label}
            </span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
