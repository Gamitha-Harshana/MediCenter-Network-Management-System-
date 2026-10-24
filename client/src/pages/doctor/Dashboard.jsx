import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../utils/api';
import StatCard from '../../components/UI/StatCard';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { Users, Stethoscope, ClipboardList, Bell } from 'lucide-react';
import { format } from 'date-fns';

export default function DoctorDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['doctor-dashboard'],
    queryFn: () => api.get('/doctor/dashboard').then(r => r.data),
  });

  if (isLoading) return <LoadingSpinner />;

  const stats = data?.stats || {};
  const queue = data?.todayQueue || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Doctor Dashboard</h1>
        <p className="text-gray-500 mt-1">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Today" value={stats.total ?? 0} icon={Users} colour="blue" />
        <StatCard title="Checked In" value={stats.checkedIn ?? 0} icon={Stethoscope} colour="yellow" />
        <StatCard title="Completed" value={stats.done ?? 0} icon={ClipboardList} colour="green" />
        <StatCard title="Remaining" value={stats.remaining ?? 0} icon={Bell} colour="purple" />
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Today's Queue</h2>
        {queue.length === 0 ? (
          <p className="text-gray-400 text-sm">No patients scheduled for today.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">#</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Patient</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Type</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {queue.map(appt => (
                  <tr key={appt.appointment_id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 px-3 font-bold text-blue-600">{appt.queue_no}</td>
                    <td className="py-2 px-3 font-medium">{appt.patient_name}</td>
                    <td className="py-2 px-3">
                      <span className={`inline-flex px-2 py-0.5 text-xs rounded-full font-medium ${appt.patient_type === 1 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                        {appt.patient_type === 1 ? 'Registered' : 'Temporary'}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <span className={`inline-flex px-2 py-0.5 text-xs rounded-full font-medium ${
                        appt.status === 'Done' ? 'bg-green-100 text-green-700' :
                        appt.status === 'CheckedIn' ? 'bg-yellow-100 text-yellow-700' :
                        appt.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>{appt.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
