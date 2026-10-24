import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Stethoscope, UserPlus } from 'lucide-react';
import Table from '../../components/UI/Table';
import Modal from '../../components/UI/Modal';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import api from '../../utils/api';

export default function Doctors() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    name: '', specialty: '', slmc_number: '', email: '',
  });

  const { data: doctors = [], isLoading } = useQuery({
    queryKey: ['admin-doctors'],
    queryFn: async () => {
      const res = await api.get('/admin/doctors');
      return res.data;
    },
  });

  const requestMutation = useMutation({
    mutationFn: (data) => api.post('/admin/doctors/request', data),
    onSuccess: () => {
      toast.success('Doctor request submitted for approval!');
      setModalOpen(false);
      setForm({ name: '', specialty: '', slmc_number: '', email: '' });
      qc.invalidateQueries({ queryKey: ['admin-doctors'] });
    },
    onError: (err) => toast.error(err.response?.data?.error ?? err.response?.data?.message ?? 'Failed to submit request.'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    requestMutation.mutate(form);
  };

  const set = (f) => (e) => setForm({ ...form, [f]: e.target.value });

  const columns = [
    {
      key: 'name', header: 'Doctor',
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-sm">
            {row.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-gray-800">{row.name}</p>
            <p className="text-xs text-gray-400">{row.email}</p>
          </div>
        </div>
      ),
    },
    { key: 'specialty', header: 'Specialty' },
    { key: 'slmc_number', header: 'SLMC No.', render: (r) => <span className="font-mono text-xs">{r.slmc_number}</span> },
    {
      key: 'status', header: 'Status',
      render: (r) => {
        if (r.status === 'approved') return <span className="badge-approved">Active</span>;
        if (r.status === 'pending') return <span className="badge-pending">Pending</span>;
        return <span className="badge-rejected">Rejected</span>;
      },
    },
    {
      key: 'createdAt', header: 'Joined',
      render: (r) => new Date(r.createdAt).toLocaleDateString(),
    },
  ];

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Doctors</h1>
          <p className="text-gray-500 text-sm mt-1">{doctors.length} doctor{doctors.length !== 1 ? 's' : ''} at this center</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-primary flex items-center gap-2">
          <UserPlus size={16} />
          Request New Doctor
        </button>
      </div>

      <Table columns={columns} data={doctors} empty="No doctors registered yet." />

      {/* Request Doctor Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Request New Doctor">
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-gray-500">
            The doctor registration will be sent for system admin approval.
          </p>
          <div>
            <label className="label">Full Name</label>
            <input type="text" className="input" placeholder="Dr. Jane Smith" value={form.name} onChange={set('name')} required />
          </div>
          <div>
            <label className="label">Email Address</label>
            <input type="email" className="input" placeholder="doctor@example.com" value={form.email} onChange={set('email')} required />
          </div>
          <div>
            <label className="label">Specialty</label>
            <input type="text" className="input" placeholder="e.g. General Physician" value={form.specialty} onChange={set('specialty')} required />
          </div>
          <div>
            <label className="label">SLMC License Number</label>
            <input type="text" className="input" placeholder="SLMC-12345" value={form.slmc_number} onChange={set('slmc_number')} required />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" disabled={requestMutation.isPending} className="btn-primary flex items-center gap-2">
              <Stethoscope size={15} />
              {requestMutation.isPending ? 'Submitting…' : 'Submit Request'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
