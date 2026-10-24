import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { QrCode, Clock } from 'lucide-react';
import { format } from 'date-fns';

const STATUS_STYLES = {
  Active: 'bg-blue-100 text-blue-700',
  CheckedIn: 'bg-yellow-100 text-yellow-700',
  Done: 'bg-green-100 text-green-700',
  Cancelled: 'bg-red-100 text-red-700',
  Skipped: 'bg-gray-100 text-gray-500',
};

export default function DoctorQueue() {
  const navigate = useNavigate();
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['doctor-queue', today],
    queryFn: () => api.get(`/doctor/queue?date=${today}`).then(r => r.data),
    refetchInterval: 15000,
  });

  const queue = data?.queue || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Today's Queue</h1>
          <p className="text-gray-500 mt-1">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <button
          onClick={() => navigate('/doctor/scan')}
          className="btn-primary flex items-center gap-2"
        >
          <QrCode size={18} />
          Scan QR Code
        </button>
      </div>

      {isLoading ? <LoadingSpinner /> : (
        <div className="card">
          {queue.length === 0 ? (
            <div className="text-center py-12">
              <Clock size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-400">No appointments scheduled for today.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-gray-500 font-semibold">Queue #</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-semibold">Patient Name</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-semibold">Type</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-semibold">Status</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {queue.map(appt => (
                    <tr key={appt.appointment_id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-sm">
                          {appt.queue_no}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-gray-800">{appt.patient_name}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex px-2 py-0.5 text-xs rounded-full font-medium ${appt.patient_type === 1 ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}>
                          {appt.patient_type === 1 ? 'Registered' : 'Temporary'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex px-2 py-0.5 text-xs rounded-full font-medium ${STATUS_STYLES[appt.status] || 'bg-gray-100 text-gray-600'}`}>
                          {appt.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {appt.status === 'CheckedIn' ? (
                          <button
                            onClick={() => navigate('/doctor/consultation', {
                              state: {
                                appointment: appt,
                                patient: {
                                  patient_id: appt.patient_id,
                                  name: appt.patient_name,
                                  phone: appt.phone,
                                  email: appt.email,
                                  date_of_birth: appt.date_of_birth,
                                  patient_type: appt.patient_type
                                }
                              }
                            })}
                            className="text-xs btn-primary py-1 px-3"
                          >
                            Open Consultation
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
