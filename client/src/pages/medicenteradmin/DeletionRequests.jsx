import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../utils/api';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import Modal from '../../components/UI/Modal';
import toast from 'react-hot-toast';
import { Trash2 } from 'lucide-react';
import { format } from 'date-fns';

export default function DeletionRequests() {
  const qc = useQueryClient();
  const [selectedReq, setSelectedReq] = useState(null);
  const [modalAction, setModalAction] = useState(null); // 'complete' | 'reject'
  const [note, setNote] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['deletion-requests'],
    queryFn: () => api.get('/admin/deletion-requests').then(r => r.data),
  });

  const actionMutation = useMutation({
    mutationFn: ({ id, status, notes }) => api.put(`/admin/deletion-requests/${id}`, { status, notes }),
    onSuccess: () => {
      toast.success(modalAction === 'complete' ? 'Records deleted and request completed' : 'Request rejected');
      qc.invalidateQueries(['deletion-requests']);
      setSelectedReq(null);
      setNote('');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Action failed'),
  });

  const requests = data?.requests || [];

  const openModal = (req, action) => { setSelectedReq(req); setModalAction(action); setNote(''); };

  const handleAction = () => {
    actionMutation.mutate({
      id: selectedReq.request_id,
      status: modalAction === 'complete' ? 'Completed' : 'Rejected',
      notes: note,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Deletion Requests</h1>
        <p className="text-gray-500 text-sm mt-1">Patient requests to delete their records from this center</p>
      </div>

      {isLoading ? <LoadingSpinner /> : (
        requests.length === 0 ? (
          <div className="card text-center py-12">
            <Trash2 size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-400">No deletion requests.</p>
          </div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-gray-500 font-semibold">Patient</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-semibold">Requested</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-semibold">Status</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {requests.map(req => (
                  <tr key={req.request_id} className="hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <p className="font-medium text-gray-800">{req.patient_name}</p>
                      <p className="text-xs text-gray-500">{req.patient_email}</p>
                    </td>
                    <td className="py-3 px-4 text-gray-600 text-xs">{format(new Date(req.created_at), 'PPP')}</td>
                    <td className="py-3 px-4">
                      <span className={
                        req.status === 'Pending' ? 'badge-pending' :
                        req.status === 'Completed' ? 'badge-approved' : 'badge-rejected'
                      }>{req.status}</span>
                    </td>
                    <td className="py-3 px-4">
                      {req.status === 'Pending' && (
                        <div className="flex gap-2">
                          <button onClick={() => openModal(req, 'complete')} className="btn-danger text-xs py-1 px-2">Delete Records</button>
                          <button onClick={() => openModal(req, 'reject')} className="btn-secondary text-xs py-1 px-2">Reject</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Action Modal */}
      {selectedReq && (
        <Modal
          title={modalAction === 'complete' ? '⚠️ Confirm Record Deletion' : 'Reject Deletion Request'}
          onClose={() => setSelectedReq(null)}
        >
          <div className="space-y-4">
            {modalAction === 'complete' ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                This will permanently delete all visit records for <strong>{selectedReq.patient_name}</strong> at this center. This cannot be undone.
              </div>
            ) : (
              <p className="text-sm text-gray-700">Are you sure you want to reject this deletion request from <strong>{selectedReq.patient_name}</strong>?</p>
            )}
            <div>
              <label className="label">Notes (optional)</label>
              <textarea className="input" rows={3} placeholder="Add a note…" value={note} onChange={e => setNote(e.target.value)} />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setSelectedReq(null)} className="btn-secondary">Cancel</button>
              <button
                onClick={handleAction}
                disabled={actionMutation.isPending}
                className={modalAction === 'complete' ? 'btn-danger' : 'btn-primary'}
              >
                {actionMutation.isPending ? 'Processing…' : modalAction === 'complete' ? 'Yes, Delete Records' : 'Reject Request'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
