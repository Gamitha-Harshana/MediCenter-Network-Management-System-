import React, { useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../utils/api';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import toast from 'react-hot-toast';
import { useReactToPrint } from 'react-to-print';
import { Bell, Printer, CheckCheck } from 'lucide-react';
import { format } from 'date-fns';

function PrintablePrescription({ details }) {
  if (!details) return null;
  const { record, doctor, center, patient, prescriptions, external_prescriptions, tests, revisit } = details;

  return (
    <div className="p-8 font-serif text-gray-900 text-sm">
      {/* Header */}
      <div className="border-b-2 border-gray-800 pb-4 mb-4">
        <h1 className="text-2xl font-bold">{center?.center_name}</h1>
        <p className="text-gray-600">{center?.location}</p>
        <p className="text-gray-600 text-xs mt-1">PHSRC Reg: {center?.phsrc_number}</p>
      </div>

      <div className="flex justify-between mb-4">
        <div>
          <p className="font-semibold">Dr. {doctor?.name}</p>
          <p className="text-gray-600">{doctor?.specialty}</p>
        </div>
        <div className="text-right">
          <p className="text-gray-600">Date: {record?.visit_date ? format(new Date(record.visit_date), 'PPP') : ''}</p>
        </div>
      </div>

      <div className="border border-gray-200 rounded p-3 mb-4">
        <p><span className="font-semibold">Patient:</span> {patient?.name}</p>
        <p><span className="font-semibold">Age:</span> {patient?.age ?? '—'}</p>
      </div>

      {prescriptions?.length > 0 && (
        <div className="mb-4">
          <h3 className="font-bold mb-2">Prescription (Available at Center)</h3>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-200 px-2 py-1 text-left">Drug</th>
                <th className="border border-gray-200 px-2 py-1">Type</th>
                <th className="border border-gray-200 px-2 py-1">Times/Day</th>
                <th className="border border-gray-200 px-2 py-1">Dose</th>
                <th className="border border-gray-200 px-2 py-1">Days</th>
              </tr>
            </thead>
            <tbody>
              {prescriptions.map((p, i) => (
                <tr key={i}>
                  <td className="border border-gray-200 px-2 py-1">{p.drug_name}</td>
                  <td className="border border-gray-200 px-2 py-1 text-center">{p.drug_type}</td>
                  <td className="border border-gray-200 px-2 py-1 text-center">{p.times_per_day}</td>
                  <td className="border border-gray-200 px-2 py-1 text-center">{p.dosage_per_time} {p.dosage_unit}</td>
                  <td className="border border-gray-200 px-2 py-1 text-center">{p.number_of_days}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {external_prescriptions?.length > 0 && (
        <div className="mb-4">
          <h3 className="font-bold mb-2">External Prescription (Purchase from Pharmacy)</h3>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-orange-50">
                <th className="border border-gray-200 px-2 py-1 text-left">Drug</th>
                <th className="border border-gray-200 px-2 py-1">Type</th>
                <th className="border border-gray-200 px-2 py-1">Times/Day</th>
                <th className="border border-gray-200 px-2 py-1">Dose</th>
                <th className="border border-gray-200 px-2 py-1">Days</th>
              </tr>
            </thead>
            <tbody>
              {external_prescriptions.map((p, i) => (
                <tr key={i}>
                  <td className="border border-gray-200 px-2 py-1">{p.external_drug_name}</td>
                  <td className="border border-gray-200 px-2 py-1 text-center">{p.drug_type}</td>
                  <td className="border border-gray-200 px-2 py-1 text-center">{p.times_per_day}</td>
                  <td className="border border-gray-200 px-2 py-1 text-center">{p.dosage_per_time} {p.dosage_unit}</td>
                  <td className="border border-gray-200 px-2 py-1 text-center">{p.number_of_days}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tests?.length > 0 && (
        <div className="mb-4">
          <h3 className="font-bold mb-1">Recommended Tests</h3>
          <ul className="list-disc list-inside">
            {tests.map((t, i) => <li key={i}>{t.test_name}</li>)}
          </ul>
        </div>
      )}

      {revisit && (
        <p className="text-sm"><span className="font-semibold">Revisit Date:</span> {format(new Date(revisit.revisit_date), 'PPP')}</p>
      )}

      <div className="mt-8 border-t border-gray-200 pt-4 text-center text-xs text-gray-500">
        <p>Issued by {center?.center_name} · {format(new Date(), 'PPP')}</p>
      </div>
    </div>
  );
}

function NotificationItem({ notif }) {
  const qc = useQueryClient();
  const printRef = useRef();

  const { data: details, refetch: loadDetails, isFetching } = useQuery({
    queryKey: ['notif-details', notif.notification_id],
    queryFn: () => api.get(`/admin/notifications/${notif.notification_id}/details`).then(r => r.data),
    enabled: false,
  });

  const markReadMutation = useMutation({
    mutationFn: () => api.put(`/admin/notifications/${notif.notification_id}/read`),
    onSuccess: () => qc.invalidateQueries(['admin-notifications']),
  });

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `Prescription-${notif.notification_id}`,
  });

  const handleLoadAndPrint = async () => {
    await loadDetails();
    if (!notif.status === 'Read') markReadMutation.mutate();
    setTimeout(handlePrint, 200);
  };

  return (
    <div className={`card border ${notif.status === 'Unread' ? 'border-blue-200 bg-blue-50' : 'border-gray-100'}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            {notif.status === 'Unread' && <span className="w-2 h-2 bg-blue-600 rounded-full" />}
            <p className="font-medium text-gray-800">Patient: {notif.patient_name} · Dr. {notif.doctor_name}</p>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{format(new Date(notif.created_at), 'PPP · p')}</p>
          {notif.diagnosis && <p className="text-sm text-gray-700 mt-1">Diagnosis: {notif.diagnosis}</p>}
        </div>
        <div className="flex gap-2 shrink-0">
          {notif.status === 'Unread' && (
            <button onClick={() => markReadMutation.mutate()} className="btn-secondary text-xs py-1 px-2 flex items-center gap-1">
              <CheckCheck size={12} /> Mark Read
            </button>
          )}
          <button onClick={handleLoadAndPrint} disabled={isFetching} className="btn-primary text-xs py-1 px-2 flex items-center gap-1">
            <Printer size={12} /> {isFetching ? 'Loading…' : 'Print'}
          </button>
        </div>
      </div>

      {/* Hidden printable content */}
      <div className="hidden">
        <div ref={printRef}>
          <PrintablePrescription details={details} />
        </div>
      </div>
    </div>
  );
}

export default function AdminNotifications() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-notifications'],
    queryFn: () => api.get('/admin/notifications').then(r => r.data),
    refetchInterval: 30000,
  });

  const notifications = data?.notifications || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Consultation Notifications</h1>
        <p className="text-gray-500 text-sm mt-1">Completed consultations from doctors — print prescriptions here</p>
      </div>

      {isLoading ? <LoadingSpinner /> : (
        notifications.length === 0 ? (
          <div className="card text-center py-12">
            <Bell size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-400">No notifications yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map(n => <NotificationItem key={n.notification_id} notif={n} />)}
          </div>
        )
      )}
    </div>
  );
}
