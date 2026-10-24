import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Stethoscope, Users, Pill, Bell, ArrowRight } from 'lucide-react';
import StatCard from '../../components/UI/StatCard';
import api from '../../utils/api';
import { formatDistanceToNow } from 'date-fns';

export default function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const res = await api.get('/admin/dashboard');
      return res.data;
    },
  });

  const { data: notifData, isLoading: notifLoading } = useQuery({
    queryKey: ['admin-notifications-recent'],
    queryFn: async () => {
      const res = await api.get('/admin/notifications');
      return res.data;
    },
  });
  const notifications = notifData?.notifications?.slice(0, 5) ?? [];

  const cards = [
    { title: 'Total Doctors', value: statsLoading ? '…' : stats?.stats?.doctors ?? 0, icon: Stethoscope, colour: 'blue' },
    { title: 'Total Patients', value: statsLoading ? '…' : stats?.stats?.patients ?? 0, icon: Users, colour: 'green' },
    { title: 'Drug Types', value: statsLoading ? '…' : stats?.stats?.drugs ?? 0, icon: Pill, colour: 'purple' },
    { title: 'Unread Notifications', value: statsLoading ? '…' : stats?.stats?.unreadNotifications ?? 0, icon: Bell, colour: 'yellow' },
  ];

  const quickLinks = [
    { label: 'Manage Doctors', to: '/admin/doctors' },
    { label: 'View Schedules', to: '/admin/schedules' },
    { label: 'Drug Inventory', to: '/admin/inventory' },
    { label: 'Deletion Requests', to: '/admin/deletions' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Center Admin Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {cards.map((c) => <StatCard key={c.title} {...c} />)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Links */}
        <div className="card">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Quick Actions</h2>
          <div className="space-y-2">
            {quickLinks.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-blue-50 border border-gray-100 hover:border-blue-200 transition-all group"
              >
                <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700">{l.label}</span>
                <ArrowRight size={15} className="text-gray-400 group-hover:text-blue-600" />
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Notifications */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-800">Recent Notifications</h2>
            <Link to="/admin/notifications" className="text-xs text-blue-600 hover:underline">View all</Link>
          </div>
          {notifLoading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="animate-pulse h-12 bg-gray-100 rounded-lg" />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No notifications yet.</p>
          ) : (
            <div className="space-y-3">
              {notifications.map((n) => (
                <div
                  key={n.notification_id}
                  className={`flex items-start gap-3 p-3 rounded-lg border ${
                    n.status === 'Unread' ? 'bg-blue-50 border-blue-100' : 'bg-gray-50 border-gray-100'
                  }`}
                >
                  <Bell size={16} className={n.status === 'Read' ? 'text-gray-400 mt-0.5' : 'text-blue-500 mt-0.5'} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {n.patient_name ? `${n.patient_name} — Dr. ${n.doctor_name}` : 'Consultation Complete'}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  {n.status === 'Unread' && (
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-1 shrink-0" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
