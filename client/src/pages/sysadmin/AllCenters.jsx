import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Search, Building2, MapPin, PowerOff } from 'lucide-react';
import Table from '../../components/UI/Table';
import Modal from '../../components/UI/Modal';
import api from '../../utils/api';

export default function AllCenters() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [deactivateModal, setDeactivateModal] = useState({ open: false, center: null });

  const { data: centers = [], isLoading } = useQuery({
    queryKey: ['all-centers'],
    queryFn: async () => {
      const res = await api.get('/sysadmin/centers');
      return res.data;
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id) => api.put(`/sysadmin/centers/${id}/deactivate`),
    onSuccess: () => {
      toast.success('Center deactivated.');
      setDeactivateModal({ open: false, center: null });
      qc.invalidateQueries({ queryKey: ['all-centers'] });
      qc.invalidateQueries({ queryKey: ['sysadmin-stats'] });
    },
    onError: (err) => toast.error(err.response?.data?.error ?? err.response?.data?.message ?? 'Deactivation failed.'),
  });

  const filtered = centers.filter((c) =>
    c.center_name?.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    {
      key: 'center_name', header: 'Center Name',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Building2 size={15} className="text-blue-500 shrink-0" />
          <span className="font-medium">{row.center_name}</span>
        </div>
      ),
    },
    { key: 'email', header: 'Email' },
    {
      key: 'location', header: 'Location',
      render: (row) => (
        <span className="flex items-center gap-1"><MapPin size={13} className="text-gray-400" />{row.location}</span>
      ),
    },
    { key: 'phsrc_number', header: 'PHSRC No.' },
    { key: 'doctor_count', header: 'Doctors', render: (row) => row.doctor_count ?? 0 },
    {
      key: 'approval_status', header: 'Status',
      render: (row) => (
        row.approval_status === 'Approved'
          ? <span className="badge-active">Active</span>
          : <span className="badge-rejected">{row.approval_status}</span>
      ),
    },
    {
      key: 'actions', header: '',
      render: (row) => (
        row.approval_status === 'Approved' ? (
          <button
            onClick={() => setDeactivateModal({ open: true, center: row })}
            className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
          >
            <PowerOff size={13} />
            Deactivate
          </button>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        )
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Medical Centers</h1>
          <p className="text-gray-500 text-sm mt-1">{filtered.length} centers found</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            className="input pl-9"
            placeholder="Search by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Table columns={columns} data={filtered} loading={isLoading} empty="No centers found." />

      {/* Deactivate confirm modal */}
      <Modal
        isOpen={deactivateModal.open}
        onClose={() => setDeactivateModal({ open: false, center: null })}
        title="Deactivate Center"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to deactivate{' '}
            <strong>{deactivateModal.center?.center_name}</strong>? This will prevent all
            doctors and patients at this center from logging in.
          </p>
          <div className="flex gap-3 justify-end">
            <button
              className="btn-secondary"
              onClick={() => setDeactivateModal({ open: false, center: null })}
            >
              Cancel
            </button>
            <button
              className="btn-danger"
              onClick={() => deactivateMutation.mutate(deactivateModal.center.center_id)}
              disabled={deactivateMutation.isPending}
            >
              {deactivateMutation.isPending ? 'Deactivating…' : 'Confirm Deactivate'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
