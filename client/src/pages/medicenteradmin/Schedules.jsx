import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Calendar } from 'lucide-react';
import Modal from '../../components/UI/Modal';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import api from '../../utils/api';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function Schedules() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    doctorId: '', day_of_week: 'Monday', start_time: '08:00', end_time: '17:00', patient_amount: 20,
  });

  const { data: doctors = [] } = useQuery({
    queryKey: ['admin-doctors'],
    queryFn: async () => (await api.get('/admin/doctors')).data,
  });

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ['admin-schedules'],
    queryFn: async () => (await api.get('/admin/schedules')).data,
  });

  const addMutation = useMutation({
    mutationFn: (data) => api.post('/admin/schedules', { ...data, doctor_id: data.doctorId }),
    onSuccess: () => {
      toast.success('Schedule added!');
      setModalOpen(false);
      setForm({ doctorId: '', day_of_week: 'Monday', start_time: '08:00', end_time: '17:00', patient_amount: 20 });
      qc.invalidateQueries({ queryKey: ['admin-schedules'] });
    },
    onError: (err) => toast.error(err.response?.data?.error ?? err.response?.data?.message ?? 'Failed to add schedule.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/admin/schedules/${id}`),
    onSuccess: () => {
      toast.success('Schedule removed.');
      qc.invalidateQueries({ queryKey: ['admin-schedules'] });
    },
    onError: (err) => toast.error(err.response?.data?.error ?? err.response?.data?.message ?? 'Failed to remove schedule.'),
  });

  const set = (f) => (e) => setForm({ ...form, [f]: e.target.value });

  // Group schedules by doctor
  const byDoctor = {};
  schedules.forEach((s) => {
    const key = s.doctor_id || s.doctorId || s.doctor?.id;
    const docName = s.doctor_name || s.doctor?.name || 'Doctor';
    const specialty = s.specialty || s.doctor?.specialty || '';
    if (!byDoctor[key]) {
      byDoctor[key] = {
        doctor: { id: key, name: docName, specialty },
        schedules: []
      };
    }
    byDoctor[key].schedules.push(s);
  });

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Doctor Schedules</h1>
          <p className="text-gray-500 text-sm mt-1">Manage weekly availability for each doctor</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Schedule
        </button>
      </div>

      {Object.keys(byDoctor).length === 0 ? (
        <div className="card text-center py-16">
          <Calendar className="mx-auto text-gray-300 mb-3" size={40} />
          <p className="text-gray-500">No schedules configured yet.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {Object.values(byDoctor).map(({ doctor, schedules: ds }) => (
            <div key={doctor?.id} className="card">
              <h3 className="font-semibold text-gray-800 mb-3">Dr. {doctor?.name ?? 'Unknown Doctor'} ({doctor?.specialty})</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {ds.map((s) => (
                  <div key={s.schedule_id || s.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-xl border border-blue-100">
                    <div>
                      <p className="text-sm font-semibold text-blue-800">{s.day_of_week}</p>
                      <p className="text-xs text-blue-600 mt-0.5">{s.start_time} – {s.end_time}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Max {s.patient_amount} patients</p>
                    </div>
                    <button
                      onClick={() => deleteMutation.mutate(s.schedule_id || s.id)}
                      className="text-xs text-red-500 hover:text-red-700 font-medium ml-2"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Schedule Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Doctor Schedule">
        <form onSubmit={(e) => { e.preventDefault(); addMutation.mutate(form); }} className="space-y-4">
          <div>
            <label className="label">Doctor</label>
            <select className="input" value={form.doctorId} onChange={set('doctorId')} required>
              <option value="">Select doctor…</option>
              {doctors.filter(d => (d.approval_status === 'Approved' || d.status === 'approved')).map((d) => (
                <option key={d.doctor_id || d.id} value={d.doctor_id || d.id}>Dr. {d.name} – {d.specialty}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Day of Week</label>
            <select className="input" value={form.day_of_week} onChange={set('day_of_week')}>
              {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Start Time</label>
              <input type="time" className="input" value={form.start_time} onChange={set('start_time')} required />
            </div>
            <div>
              <label className="label">End Time</label>
              <input type="time" className="input" value={form.end_time} onChange={set('end_time')} required />
            </div>
          </div>
          <div>
            <label className="label">Max Patients</label>
            <input
              type="number" min={1} max={200} className="input"
              value={form.patient_amount}
              onChange={(e) => setForm({ ...form, patient_amount: parseInt(e.target.value) })}
              required
            />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" disabled={addMutation.isPending} className="btn-primary">
              {addMutation.isPending ? 'Adding…' : 'Add Schedule'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
