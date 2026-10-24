import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { UserPlus, Users, Clock } from 'lucide-react';
import Modal from '../../components/UI/Modal';
import Table from '../../components/UI/Table';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import api from '../../utils/api';

export default function Patients() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('registered');
  const [addPatientModal, setAddPatientModal] = useState(false);
  const [apptModal, setApptModal] = useState({ open: false, patient: null });
  const [patientForm, setPatientForm] = useState({ name: '', phone: '', date_of_birth: '' });
  const [apptForm, setApptForm] = useState({ doctorId: '', visit_date: '' });

  const { data: registered = [], isLoading: regLoading } = useQuery({
    queryKey: ['admin-patients-registered'],
    queryFn: async () => (await api.get('/admin/patients/registered')).data,
  });

  const { data: temporary = [], isLoading: tmpLoading } = useQuery({
    queryKey: ['admin-patients-temporary'],
    queryFn: async () => (await api.get('/admin/patients/temporary')).data,
  });

  const { data: doctors = [] } = useQuery({
    queryKey: ['admin-doctors'],
    queryFn: async () => (await api.get('/admin/doctors')).data,
  });

  const addPatientMutation = useMutation({
    mutationFn: (data) => api.post('/admin/patients/temporary', data),
    onSuccess: (res) => {
      toast.success('Temporary patient added!');
      setAddPatientModal(false);
      setPatientForm({ name: '', phone: '', date_of_birth: '' });
      qc.invalidateQueries({ queryKey: ['admin-patients-temporary'] });
      // Open appointment modal for the newly created patient
      setApptModal({ open: true, patient: res.data });
    },
    onError: (err) => toast.error(err.response?.data?.error ?? err.response?.data?.message ?? 'Failed to add patient.'),
  });

  const bookApptMutation = useMutation({
    mutationFn: ({ patientId, ...data }) =>
      api.post(`/admin/patients/${patientId}/appointment`, data),
    onSuccess: () => {
      toast.success('Appointment booked!');
      setApptModal({ open: false, patient: null });
      setApptForm({ doctorId: '', visit_date: '' });
      qc.invalidateQueries({ queryKey: ['admin-patients-temporary'] });
    },
    onError: (err) => toast.error(err.response?.data?.error ?? err.response?.data?.message ?? 'Failed to book appointment.'),
  });

  const setP = (f) => (e) => setPatientForm({ ...patientForm, [f]: e.target.value });
  const setA = (f) => (e) => setApptForm({ ...apptForm, [f]: e.target.value });

  const regColumns = [
    { key: 'name', header: 'Name', render: (r) => <span className="font-medium">{r.name}</span> },
    { key: 'email', header: 'Email' },
    { key: 'phone', header: 'Phone' },
    { key: 'date_of_birth', header: 'DOB', render: (r) => r.date_of_birth ? new Date(r.date_of_birth).toLocaleDateString() : '—' },
    { key: 'status', header: 'Status', render: () => <span className="badge-active">Registered</span> },
  ];

  const tmpColumns = [
    { key: 'name', header: 'Name', render: (r) => <span className="font-medium">{r.name}</span> },
    { key: 'phone', header: 'Phone' },
    { key: 'date_of_birth', header: 'DOB', render: (r) => r.date_of_birth ? new Date(r.date_of_birth).toLocaleDateString() : '—' },
    { key: 'status', header: 'Status', render: () => <span className="badge-pending">Temporary</span> },
    {
      key: 'actions', header: '', render: (r) => (
        <button
          onClick={() => setApptModal({ open: true, patient: r })}
          className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 hover:bg-blue-50 rounded transition-colors"
        >
          Book Appointment
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patients</h1>
          <p className="text-gray-500 text-sm mt-1">Manage registered and temporary patients</p>
        </div>
        <button onClick={() => setAddPatientModal(true)} className="btn-primary flex items-center gap-2">
          <UserPlus size={16} />
          Add Temporary Patient
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {[{ key: 'registered', label: 'Registered Patients', icon: Users, count: registered.length },
          { key: 'temporary', label: 'Temporary Patients', icon: Clock, count: temporary.length }]
          .map(({ key, label, icon: Icon, count }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon size={15} />
            {label}
            <span className="ml-1 bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded-full">{count}</span>
          </button>
        ))}
      </div>

      {tab === 'registered' && (
        <Table columns={regColumns} data={registered} loading={regLoading} empty="No registered patients at this center." />
      )}
      {tab === 'temporary' && (
        <Table columns={tmpColumns} data={temporary} loading={tmpLoading} empty="No temporary patients added yet." />
      )}

      {/* Add Temporary Patient Modal */}
      <Modal isOpen={addPatientModal} onClose={() => setAddPatientModal(false)} title="Add Temporary Patient">
        <form onSubmit={(e) => { e.preventDefault(); addPatientMutation.mutate(patientForm); }} className="space-y-4">
          <div>
            <label className="label">Full Name</label>
            <input type="text" className="input" placeholder="John Doe" value={patientForm.name} onChange={setP('name')} required />
          </div>
          <div>
            <label className="label">Phone Number</label>
            <input type="tel" className="input" placeholder="+94 77 123 4567" value={patientForm.phone} onChange={setP('phone')} required />
          </div>
          <div>
            <label className="label">Date of Birth</label>
            <input type="date" className="input" value={patientForm.date_of_birth} onChange={setP('date_of_birth')} required />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" className="btn-secondary" onClick={() => setAddPatientModal(false)}>Cancel</button>
            <button type="submit" disabled={addPatientMutation.isPending} className="btn-primary">
              {addPatientMutation.isPending ? 'Adding…' : 'Add Patient'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Book Appointment Modal */}
      <Modal
        isOpen={apptModal.open}
        onClose={() => setApptModal({ open: false, patient: null })}
        title={`Book Appointment — ${apptModal.patient?.name}`}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            bookApptMutation.mutate({ patientId: apptModal.patient.id, ...apptForm });
          }}
          className="space-y-4"
        >
          <div>
            <label className="label">Doctor</label>
            <select className="input" value={apptForm.doctorId} onChange={setA('doctorId')} required>
              <option value="">Select a doctor…</option>
              {doctors.filter(d => d.status === 'approved').map((d) => (
                <option key={d.id} value={d.id}>{d.name} — {d.specialty}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Visit Date</label>
            <input
              type="date"
              className="input"
              value={apptForm.visit_date}
              onChange={setA('visit_date')}
              min={new Date().toISOString().split('T')[0]}
              required
            />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" className="btn-secondary" onClick={() => setApptModal({ open: false, patient: null })}>Cancel</button>
            <button type="submit" disabled={bookApptMutation.isPending} className="btn-primary">
              {bookApptMutation.isPending ? 'Booking…' : 'Book Appointment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
