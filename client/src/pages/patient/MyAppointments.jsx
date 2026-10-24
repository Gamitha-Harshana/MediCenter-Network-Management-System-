import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../utils/api';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import toast from 'react-hot-toast';
import { Calendar, QrCode, XCircle } from 'lucide-react';
import { format } from 'date-fns';

const STATUS_STYLES = {
  Active:    'badge-active',
  CheckedIn: 'inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800',
  Done:      'badge-approved',
  Cancelled: 'badge-rejected',
  Skipped:   'inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-500',
};

export default function MyAppointments() {
  const qc = useQueryClient();
  const [expandedQr, setExpandedQr] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['my-appointments'],
    queryFn: () => api.get('/patient/appointments').then(r => r.data),
  });

  const cancelMutation = useMutation({
    mutationFn: (id) => api.put(`/patient/appointments/${id}/cancel`),
    onSuccess: () => {
      toast.success('Appointment cancelled');
      qc.invalidateQueries(['my-appointments']);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Cancel failed'),
  });

  const appointments = data?.appointments || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Appointments</h1>
        <p className="text-gray-500 text-sm mt-1">All your booked appointments</p>
      </div>

      {isLoading ? <LoadingSpinner /> : (
        <div className="space-y-4">
          {appointments.length === 0 ? (
            <div className="card text-center py-12">
              <Calendar size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-400">No appointments yet.</p>
              <a href="/patient/centers" className="btn-primary inline-flex mt-4 text-sm">Find a Center</a>
            </div>
          ) : appointments.map(appt => (
            <div key={appt.appointment_id} className="card space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-gray-800">{appt.center_name}</h3>
                  <p className="text-sm text-gray-500">Dr. {appt.doctor_name} · {appt.doctor_specialty}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    <span className="font-medium">{format(new Date(appt.visit_date), 'PPP')}</span>
                    {' · '}Queue #{appt.queue_no}
                  </p>
                </div>
                <div className="text-right space-y-2">
                  <span className={STATUS_STYLES[appt.status] || 'badge-pending'}>{appt.status}</span>
                  {appt.status === 'Active' && (
                    <button
                      onClick={() => cancelMutation.mutate(appt.appointment_id)}
                      disabled={cancelMutation.isPending}
                      className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 mt-1"
                    >
                      <XCircle size={13} /> Cancel
                    </button>
                  )}
                </div>
              </div>

              {/* QR Code for active appointments */}
              {appt.status === 'Active' && appt.qr_code_data && (
                <div>
                  <button
                    onClick={() => setExpandedQr(expandedQr === appt.appointment_id ? null : appt.appointment_id)}
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                  >
                    <QrCode size={14} />
                    {expandedQr === appt.appointment_id ? 'Hide QR Code' : 'Show QR Code'}
                  </button>
                  {expandedQr === appt.appointment_id && (
                    <div className="mt-3 flex flex-col items-center gap-2">
                      <img src={appt.qr_code_data_url} alt="QR" className="w-48 h-48 rounded-lg border border-gray-200" />
                      <p className="text-xs text-gray-400">Show this to the doctor's scanner</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
