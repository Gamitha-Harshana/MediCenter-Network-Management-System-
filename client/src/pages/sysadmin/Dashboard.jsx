import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Building2, Users, UserCheck, Clock, ArrowRight } from 'lucide-react';
import StatCard from '../../components/UI/StatCard';
import api from '../../utils/api';

export default function SysAdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['sysadmin-stats'],
    queryFn: async () => {
      const res = await api.get('/sysadmin/dashboard');
      return res.data;
    },
  });

  const cards = [
    {
      title: 'Total Centers',
      value: isLoading ? '…' : stats?.totalApprovedCenters ?? 0,
      icon: Building2,
      colour: 'blue',
    },
    {
      title: 'Pending Registrations',
      value: isLoading ? '…' : stats?.pendingCenterRegistrations ?? 0,
      icon: Clock,
      colour: 'yellow',
    },
    {
      title: 'Pending Doctors',
      value: isLoading ? '…' : stats?.pendingDoctors ?? 0,
      icon: UserCheck,
      colour: 'purple',
    },
    {
      title: 'Total Patients',
      value: isLoading ? '…' : stats?.totalPatients ?? 0,
      icon: Users,
      colour: 'green',
    },
  ];

  const quickActions = [
    { label: 'Review Pending Centers', to: '/sysadmin/centers/pending', colour: 'yellow' },
    { label: 'View All Centers', to: '/sysadmin/centers', colour: 'blue' },
    { label: 'Review Pending Doctors', to: '/sysadmin/doctors/pending', colour: 'purple' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">System Admin Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {cards.map((c) => (
          <StatCard key={c.title} {...c} />
        ))}
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {quickActions.map((action) => (
            <Link
              key={action.to}
              to={action.to}
              className="flex items-center justify-between p-4 rounded-xl bg-gray-50 hover:bg-blue-50 border border-gray-100 hover:border-blue-200 transition-all group"
            >
              <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700">
                {action.label}
              </span>
              <ArrowRight size={16} className="text-gray-400 group-hover:text-blue-600 transition-colors" />
            </Link>
          ))}
        </div>
      </div>

      {/* System Overview */}
      <div className="card">
        <h2 className="text-base font-semibold text-gray-800 mb-4">System Overview</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          {[
            { label: 'Approved Centers', value: stats?.totalApprovedCenters ?? '—' },
            { label: 'Pending Doctors', value: stats?.pendingDoctors ?? '—' },
            { label: 'Total Patients', value: stats?.totalPatients ?? '—' },
          ].map((item) => (
            <div key={item.label} className="bg-gray-50 rounded-xl p-4">
              <p className="text-2xl font-bold text-gray-900">{isLoading ? '…' : item.value}</p>
              <p className="text-xs text-gray-500 mt-1">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
