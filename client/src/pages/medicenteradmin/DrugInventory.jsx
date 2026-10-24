import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Pill, RefreshCw, ClipboardList } from 'lucide-react';
import Modal from '../../components/UI/Modal';
import Table from '../../components/UI/Table';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import api from '../../utils/api';

export default function DrugInventory() {
  const qc = useQueryClient();
  const [addModal, setAddModal] = useState(false);
  const [qtyModal, setQtyModal] = useState({ open: false, drug: null });
  const [logModal, setLogModal] = useState(false);
  const [form, setForm] = useState({ name: '', type: '', dosage_unit: '', quantity: 0 });
  const [qty, setQty] = useState(0);

  const { data: drugs = [], isLoading } = useQuery({
    queryKey: ['admin-inventory'],
    queryFn: async () => (await api.get('/admin/inventory')).data,
  });

  const { data: logs = [], isLoading: logLoading } = useQuery({
    queryKey: ['admin-inventory-log'],
    queryFn: async () => (await api.get('/admin/inventory/log')).data,
    enabled: logModal,
  });

  const addMutation = useMutation({
    mutationFn: (data) => api.post('/admin/inventory', data),
    onSuccess: () => {
      toast.success('Drug added to inventory!');
      setAddModal(false);
      setForm({ name: '', type: '', dosage_unit: '', quantity: 0 });
      qc.invalidateQueries({ queryKey: ['admin-inventory'] });
    },
    onError: (err) => toast.error(err.response?.data?.error ?? err.response?.data?.message ?? 'Failed to add drug.'),
  });

  const updateQtyMutation = useMutation({
    mutationFn: ({ id, quantity }) => api.patch(`/admin/inventory/${id}/quantity`, { quantity }),
    onSuccess: () => {
      toast.success('Quantity updated!');
      setQtyModal({ open: false, drug: null });
      qc.invalidateQueries({ queryKey: ['admin-inventory'] });
      qc.invalidateQueries({ queryKey: ['admin-inventory-log'] });
    },
    onError: (err) => toast.error(err.response?.data?.error ?? err.response?.data?.message ?? 'Update failed.'),
  });

  const set = (f) => (e) => setForm({ ...form, [f]: e.target.value });

  const columns = [
    { key: 'name', header: 'Drug Name', render: (r) => <span className="font-medium">{r.name}</span> },
    { key: 'type', header: 'Type' },
    { key: 'dosage_unit', header: 'Dosage Unit' },
    {
      key: 'quantity', header: 'In Stock',
      render: (r) => (
        <span className={`font-semibold ${r.quantity < 10 ? 'text-red-600' : 'text-green-700'}`}>
          {r.quantity}
        </span>
      ),
    },
    {
      key: 'actions', header: '',
      render: (r) => (
        <button
          onClick={() => { setQtyModal({ open: true, drug: r }); setQty(r.quantity); }}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 hover:bg-blue-50 rounded transition-colors"
        >
          <RefreshCw size={12} />
          Update Qty
        </button>
      ),
    },
  ];

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Drug Inventory</h1>
          <p className="text-gray-500 text-sm mt-1">{drugs.length} drug types in inventory</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setLogModal(true)} className="btn-secondary flex items-center gap-2">
            <ClipboardList size={16} /> View Log
          </button>
          <button onClick={() => setAddModal(true)} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Add Drug
          </button>
        </div>
      </div>

      <Table columns={columns} data={drugs} empty="No drugs in inventory yet." />

      {/* Add Drug Modal */}
      <Modal isOpen={addModal} onClose={() => setAddModal(false)} title="Add Drug to Inventory">
        <form onSubmit={(e) => { e.preventDefault(); addMutation.mutate({ ...form, quantity: parseInt(form.quantity) }); }} className="space-y-4">
          <div>
            <label className="label">Drug Name</label>
            <input type="text" className="input" placeholder="e.g. Amoxicillin" value={form.name} onChange={set('name')} required />
          </div>
          <div>
            <label className="label">Type / Category</label>
            <input type="text" className="input" placeholder="e.g. Antibiotic" value={form.type} onChange={set('type')} required />
          </div>
          <div>
            <label className="label">Dosage Unit</label>
            <input type="text" className="input" placeholder="e.g. 500mg, 10ml" value={form.dosage_unit} onChange={set('dosage_unit')} required />
          </div>
          <div>
            <label className="label">Initial Quantity</label>
            <input
              type="number" min={0} className="input"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              required
            />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" className="btn-secondary" onClick={() => setAddModal(false)}>Cancel</button>
            <button type="submit" disabled={addMutation.isPending} className="btn-primary flex items-center gap-2">
              <Pill size={14} />
              {addMutation.isPending ? 'Adding…' : 'Add Drug'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Update Quantity Modal */}
      <Modal
        isOpen={qtyModal.open}
        onClose={() => setQtyModal({ open: false, drug: null })}
        title={`Update Quantity — ${qtyModal.drug?.name}`}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Current quantity: <strong>{qtyModal.drug?.quantity}</strong> {qtyModal.drug?.dosage_unit}
          </p>
          <div>
            <label className="label">New Quantity</label>
            <input
              type="number" min={0} className="input"
              value={qty}
              onChange={(e) => setQty(parseInt(e.target.value))}
            />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button className="btn-secondary" onClick={() => setQtyModal({ open: false, drug: null })}>Cancel</button>
            <button
              className="btn-primary"
              onClick={() => updateQtyMutation.mutate({ id: qtyModal.drug.id, quantity: qty })}
              disabled={updateQtyMutation.isPending}
            >
              {updateQtyMutation.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Inventory Log Modal */}
      <Modal isOpen={logModal} onClose={() => setLogModal(false)} title="Inventory Log" size="lg">
        {logLoading ? (
          <LoadingSpinner />
        ) : logs.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No log entries yet.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {logs.map((entry) => (
              <div key={entry.id} className="py-3 flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium text-gray-800">{entry.drug?.name}</p>
                  <p className="text-xs text-gray-400">{new Date(entry.createdAt).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${entry.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {entry.change > 0 ? `+${entry.change}` : entry.change}
                  </p>
                  <p className="text-xs text-gray-400">{entry.reason}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
