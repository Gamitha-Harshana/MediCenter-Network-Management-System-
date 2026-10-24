import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, Stethoscope, Building2 } from 'lucide-react';
import Modal from '../../components/UI/Modal';
import Table from '../../components/UI/Table';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import api from '../../utils/api';

export default function PendingDoctors() {
  const qc = useQueryClient();
  const [rejectModal, setRejectModal] = useState({ open: false, doctor: null });
  const [rejectReason, setRejectReason] = useState('');

  const { data: doctors = [], isLoading } = useQuery({
    queryKey: ['pending-doctors'],
    queryFn: async () => {
      const res = await api.get('/sysadmin/doctors/pending');
      return res.data;
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id) => api.put(`/sysadmin/doctors/${id}/approve`),
    onSuccess: () => {
      toast.success('Doctor approved!');
      qc.invalidateQueries({ queryKey: ['pending-doctors'] });
      qc.invalidateQueries({ queryKey: ['sysadmin-stats'] });
    },
    onError: (err) => toast.error(err.response?.data?.error ?? err.response?.data?.message ?? 'Approval failed.'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }) => api.put(`/sysadmin/doctors/${id}/reject`, { reason }),
    onSuccess: () => {
      toast.success('Doctor registration rejected.');
      setRejectModal({ open: false, doctor: null });
      setRejectReason('');
      qc.invalidateQueries({ queryKey: ['pending-doctors'] });
      qc.invalidateQueries({ queryKey: ['sysadmin-stats'] });
    },
    onError: (err) => toast.error(err.response?.data?.error ?? err.response?.data?.message ?? 'Rejection failed.'),
  });

  const columns = [
    {
      key: 'name', header: 'Doctor Name',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Stethoscope size={15} className="text-green-600 shrink-0" />
          <span className="font-medium">{row.name}</span>
        </div>
      ),
    },
    { key: 'specialty', header: 'Specialty' },
    { key: 'slmc_number', header: 'SLMC No.', render: (row) => <span className="font-mono text-xs">{row.slmc_number}</span> },
    {
      key: 'center_name', header: 'Center',
      render: (row) => (
        <span className="flex items-center gap-1 text-xs">
          <Building2 size={12} className="text-gray-400" />
          {row.center_name ?? '—'}
        </span>
      ),
    },
    { key: 'email', header: 'Email' },
    {
      key: 'created_at', header: 'Submitted',
      render: (row) => row.created_at
        ? new Date(row.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
        : '—',
    },
    {
      key: 'actions', header: 'Actions',
      render: (row) => (
        <div className="flex gap-2">
          <button
            onClick={() => approveMutation.mutate(row.doctor_id)}
            disabled={approveMutation.isPending}
            className="btn-success text-xs py-1 px-2 flex items-center gap-1"
          >
            <CheckCircle size={13} /> Approve
          </button>
          <button
            onClick={() => { setRejectModal({ open: true, doctor: row }); setRejectReason(''); }}
            className="btn-danger text-xs py-1 px-2 flex items-center gap-1"
          >
            <XCircle size={13} /> Reject
          </button>
        </div>
      ),
    },
  ];

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pending Doctor Registrations</h1>
        <p className="text-gray-500 text-sm mt-1">
          {doctors.length} doctor{doctors.length !== 1 ? 's' : ''} awaiting review
        </p>
      </div>

      {doctors.length === 0 ? (
        <div className="card text-center py-16">
          <CheckCircle className="mx-auto text-green-400 mb-3" size={40} />
          <p className="text-gray-500 font-medium">No pending doctor registrations.</p>
        </div>
      ) : (
        <Table columns={columns} data={doctors} empty="No pending doctors." />
      )}

      {/* Reject Modal */}
      <Modal
        isOpen={rejectModal.open}
        onClose={() => setRejectModal({ open: false, doctor: null })}
        title={`Reject Dr. ${rejectModal.doctor?.name}`}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Please provide a reason for rejecting this doctor's registration.
          </p>
          <div>
            <label className="label">Rejection Reason *</label>
            <textarea
              className="input min-h-[100px] resize-none"
              placeholder="e.g. Invalid SLMC number, incomplete information…"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
          <div className="flex gap-3 justify-end">
            <button className="btn-secondary" onClick={() => setRejectModal({ open: false, doctor: null })}>
              Cancel
            </button>
            <button
              className="btn-danger"
              onClick={() => {
                if (!rejectReason.trim()) { toast.error('Please enter a reason.'); return; }
                rejectMutation.mutate({ id: rejectModal.doctor.doctor_id, reason: rejectReason });
              }}
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending ? 'Rejecting…' : 'Confirm Rejection'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
