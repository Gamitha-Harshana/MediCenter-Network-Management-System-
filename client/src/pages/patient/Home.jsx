import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Search, Calendar, Heart, History, ArrowRight } from 'lucide-react';

const actions = [
  { icon: Search,   label: 'Find a Center',    sub: 'Search centers by location, specialty or availability', to: '/patient/centers',      color: 'blue'   },
  { icon: Calendar, label: 'My Appointments',  sub: 'View upcoming visits and your QR codes',                to: '/patient/appointments', color: 'green'  },
  { icon: Heart,    label: 'Health Record',     sub: 'Manage your personal health record',                   to: '/patient/health-record', color: 'red'    },
  { icon: History,  label: 'Visit History',     sub: 'See your past consultations and prescriptions',        to: '/patient/history',      color: 'purple' },
];

const COLOR_MAP = {
  blue:   { bg: 'bg-blue-50',   icon: 'text-blue-600',   btn: 'text-blue-600 hover:bg-blue-100' },
  green:  { bg: 'bg-green-50',  icon: 'text-green-600',  btn: 'text-green-600 hover:bg-green-100' },
  red:    { bg: 'bg-red-50',    icon: 'text-red-500',    btn: 'text-red-500 hover:bg-red-100' },
  purple: { bg: 'bg-purple-50', icon: 'text-purple-600', btn: 'text-purple-600 hover:bg-purple-100' },
};

export default function PatientHome() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Welcome banner */}
      <div className="card bg-gradient-to-br from-blue-600 to-green-500 text-white">
        <p className="text-blue-100 text-sm font-medium">Welcome back</p>
        <h1 className="text-2xl font-bold mt-1">{user?.name || user?.email}</h1>
        <p className="text-blue-100 text-sm mt-2">
          Manage your healthcare from one place — find doctors, book appointments, and track your health records.
        </p>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {actions.map(({ icon: Icon, label, sub, to, color }) => {
            const c = COLOR_MAP[color];
            return (
              <button
                key={to}
                onClick={() => navigate(to)}
                className="card text-left hover:shadow-md transition-shadow group"
              >
                <div className={`inline-flex p-3 rounded-xl ${c.bg} mb-3`}>
                  <Icon size={22} className={c.icon} />
                </div>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-800">{label}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">{sub}</p>
                  </div>
                  <ArrowRight size={18} className={`mt-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ${c.icon}`} />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
