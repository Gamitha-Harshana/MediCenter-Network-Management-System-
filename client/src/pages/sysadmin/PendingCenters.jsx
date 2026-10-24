import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, Building2, User, Hash, FileText, Copy, KeyRound, ShieldCheck } from 'lucide-react';
import Modal from '../../components/UI/Modal';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import api from '../../utils/api';

/** Copy text to clipboard and show feedback */
function CopyField({ label, value }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-sm text-gray-900 break-all">{value}</span>
        <button
          onClick={copy}
          className="shrink-0 text-gray-400 hover:text-blue-600 transition-colors"
          title="Copy"
        >
          {copied ? <CheckCircle size={15} className="text-green-500" /> : <Copy size={15} />}
        </button>
      </div>
    </div>
  );
}

export default function PendingCenters() {
  const qc = useQueryClient();
  const [rejectModal, setRejectModal] = useState({ open: false, center: null });
  const [rejectReason, setRejectReason] = useState('');
  const [credsModal, setCredsModal] = useState({ open: false, data: null });

  const { data: centers = [], isLoading } = useQuery({
    queryKey: ['pending-centers'],
    queryFn: async () => {
      const res = await api.get('/sysadmin/centers/pending');
      return res.data;
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id) => api.put(`/sysadmin/centers/${id}/approve`),
    onSuccess: (res) => {
      toast.success('Center approved!');
      qc.invalidateQueries({ queryKey: ['pending-centers'] });
      qc.invalidateQueries({ queryKey: ['sysadmin-stats'] });
      // Show credentials popup
      if (res.data?.credentials) {
        setCredsModal({ open: true, data: res.data.credentials });
      }
    },
    onError: (err) => toast.error(err.response?.data?.error ?? 'Approval failed.'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }) => api.put(`/sysadmin/centers/${id}/reject`, { reason }),
    onSuccess: () => {
      toast.success('Center rejected.');
      setRejectModal({ open: false, center: null });
      setRejectReason('');
      qc.invalidateQueries({ queryKey: ['pending-centers'] });
      qc.invalidateQueries({ queryKey: ['sysadmin-stats'] });
    },
    onError: (err) => toast.error(err.response?.data?.error ?? 'Rejection failed.'),
  });

  const openReject = (center) => {
    setRejectModal({ open: true, center });
    setRejectReason('');
  };

  const handleReject = () => {
    if (!rejectReason.trim()) {
      toast.error('Please enter a rejection reason.');
      return;
    }
    rejectMutation.mutate({ id: rejectModal.center.center_id, reason: rejectReason });
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pending Center Registrations</h1>
        <p className="text-gray-500 text-sm mt-1">
          {centers.length} center{centers.length !== 1 ? 's' : ''} awaiting review
        </p>
      </div>

      {centers.length === 0 ? (
        <div className="card text-center py-16">
          <CheckCircle className="mx-auto text-green-400 mb-3" size={40} />
          <p className="text-gray-500 font-medium">All caught up! No pending registrations.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {centers.map((center) => (
            <div key={center.center_id} className="card">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
                {/* Center Info */}
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2">
                    <Building2 size={18} className="text-blue-600 shrink-0" />
                    <h3 className="font-semibold text-gray-900 text-lg">{center.center_name}</h3>
                    <span className="badge-pending">Pending</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-500 w-14 shrink-0">Email:</span>
                      {center.email}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-500 w-14 shrink-0">Location:</span>
                      {center.location}
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText size={13} className="text-gray-400" />
                      <span className="font-medium text-gray-500 shrink-0">PHSRC:</span>
                      <span className="font-mono">{center.phsrc_number}</span>
                    </div>
                  </div>

                  {/* Registered Doctor */}
                  {center.registered_doctor_name && (
                    <div className="bg-green-50 rounded-xl p-3 border border-green-100">
                      <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                        <User size={12} />
                        Registered Doctor
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-gray-700">
                        <div>
                          <span className="text-gray-500 text-xs">Name</span>
                          <p className="font-medium">{center.registered_doctor_name}</p>
                        </div>
                        <div>
                          <span className="text-gray-500 text-xs">Specialty</span>
                          <p className="font-medium">{center.registered_doctor_specialty}</p>
                        </div>
                        <div>
                          <span className="text-gray-500 text-xs">SLMC #</span>
                          <p className="font-mono font-medium flex items-center gap-1">
                            <Hash size={12} className="text-gray-400" />
                            {center.registered_doctor_slmc}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-gray-400">
                    Submitted: {center.created_at
                      ? new Date(center.created_at).toLocaleDateString('en-US', {
                          year: 'numeric', month: 'long', day: 'numeric'
                        })
                      : 'Unknown'}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => approveMutation.mutate(center.center_id)}
                    disabled={approveMutation.isPending}
                    className="btn-success flex items-center gap-2"
                  >
                    <CheckCircle size={16} />
                    Approve
                  </button>
                  <button
                    onClick={() => openReject(center)}
                    className="btn-danger flex items-center gap-2"
                  >
                    <XCircle size={16} />
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Credentials Modal ───────────────────────────────── */}
      <Modal
        isOpen={credsModal.open}
        onClose={() => setCredsModal({ open: false, data: null })}
        title="Center Approved — Login Credentials"
      >
        {credsModal.data && (
          <div className="space-y-5">
            {/* Warning */}
            <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-xl p-3">
              <ShieldCheck size={18} className="text-yellow-600 shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-800">
                <strong>Save these credentials now.</strong> They will not be shown again.
                Share them securely with the center and doctor.
              </p>
            </div>

            {/* Center Admin */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                <Building2 size={13} className="text-blue-500" />
                {credsModal.data.centerName} — Admin Account
              </p>
              <div className="space-y-2">
                <CopyField label="Email" value={credsModal.data.adminEmail} />
                <CopyField label="Temporary Password" value={credsModal.data.adminPassword} />
              </div>
            </div>

            {/* Doctor */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                <KeyRound size={13} className="text-green-500" />
                Dr. {credsModal.data.doctorName} — Doctor Account
              </p>
              <div className="space-y-2">
                <CopyField label="Email" value={credsModal.data.doctorEmail} />
                <CopyField label="Temporary Password" value={credsModal.data.doctorPassword} />
              </div>
            </div>

            <button
              className="btn-primary w-full"
              onClick={() => setCredsModal({ open: false, data: null })}
            >
              Done — I've saved the credentials
            </button>
          </div>
        )}
      </Modal>

      {/* ── Reject Modal ────────────────────────────────────── */}
      <Modal
        isOpen={rejectModal.open}
        onClose={() => setRejectModal({ open: false, center: null })}
        title={`Reject — ${rejectModal.center?.center_name}`}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Please provide a reason for rejection. This will be sent to the center via email.
          </p>
          <div>
            <label className="label">Rejection Reason *</label>
            <textarea
              className="input min-h-[100px] resize-none"
              placeholder="e.g. Incomplete documentation, invalid PHSRC number…"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
          <div className="flex gap-3 justify-end">
            <button
              className="btn-secondary"
              onClick={() => setRejectModal({ open: false, center: null })}
            >
              Cancel
            </button>
            <button
              className="btn-danger"
              onClick={handleReject}
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
