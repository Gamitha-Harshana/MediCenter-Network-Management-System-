import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../utils/api';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { History, ChevronDown, ChevronUp, Pill, TestTube } from 'lucide-react';
import { format } from 'date-fns';

function VisitCard({ record }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="card">
      <button className="flex items-start justify-between w-full text-left" onClick={() => setOpen(o => !o)}>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-800">{record.center_name}</span>
            <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">{format(new Date(record.visit_date), 'dd MMM yyyy')}</span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">Dr. {record.doctor_name} · {record.doctor_specialty}</p>
          <p className="text-sm font-medium text-gray-700 mt-1">Diagnosis: {record.diagnosis}</p>
        </div>
        {open ? <ChevronUp size={18} className="text-gray-400 shrink-0 mt-1" /> : <ChevronDown size={18} className="text-gray-400 shrink-0 mt-1" />}
      </button>

      {open && (
        <div className="mt-4 space-y-4 border-t border-gray-100 pt-4">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Symptoms</p>
            <p className="text-sm text-gray-700">{record.symptoms || 'Not recorded'}</p>
          </div>

          {record.prescriptions?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Pill size={12} /> Prescriptions
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-1 px-2 text-gray-400">Drug</th>
                      <th className="text-left py-1 px-2 text-gray-400">Type</th>
                      <th className="text-left py-1 px-2 text-gray-400">Times/Day</th>
                      <th className="text-left py-1 px-2 text-gray-400">Dose</th>
                      <th className="text-left py-1 px-2 text-gray-400">Days</th>
                    </tr>
                  </thead>
                  <tbody>
                    {record.prescriptions.map((p, i) => (
                      <tr key={i} className="border-b border-gray-50">
                        <td className="py-1 px-2 font-medium">{p.drug_name || p.external_drug_name} {p.is_external ? '(ext)' : ''}</td>
                        <td className="py-1 px-2 text-gray-600">{p.drug_type}</td>
                        <td className="py-1 px-2 text-gray-600">{p.times_per_day}x</td>
                        <td className="py-1 px-2 text-gray-600">{p.dosage_per_time} {p.dosage_unit}</td>
                        <td className="py-1 px-2 text-gray-600">{p.number_of_days} days</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {record.tests?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                <TestTube size={12} /> Recommended Tests
              </p>
              <ul className="list-disc list-inside space-y-1">
                {record.tests.map((t, i) => (
                  <li key={i} className="text-sm text-gray-700">{t.test_name}</li>
                ))}
              </ul>
            </div>
          )}

          {record.revisit_date && (
            <div className="bg-yellow-50 rounded-lg px-3 py-2 text-sm">
              <span className="font-medium text-yellow-800">Revisit scheduled: </span>
              <span className="text-yellow-700">{format(new Date(record.revisit_date), 'PPP')}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function VisitHistory() {
  const { data, isLoading } = useQuery({
    queryKey: ['visit-history'],
    queryFn: () => api.get('/patient/history').then(r => r.data),
  });

  const records = data?.records || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Visit History</h1>
        <p className="text-gray-500 text-sm mt-1">All your past consultations and prescriptions</p>
      </div>

      {isLoading ? <LoadingSpinner /> : (
        records.length === 0 ? (
          <div className="card text-center py-12">
            <History size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-400">No visit history yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {records.map(record => <VisitCard key={record.record_id} record={record} />)}
          </div>
        )
      )}
    </div>
  );
}
