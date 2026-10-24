import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../utils/api';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import toast from 'react-hot-toast';
import { Heart, Save, Eye, EyeOff, Share2 } from 'lucide-react';

export default function HealthRecord() {
  const qc = useQueryClient();
  const [notes, setNotes] = useState('');
  const [viewable, setViewable] = useState(false);
  const [shareCross, setShareCross] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const { isLoading } = useQuery({
    queryKey: ['health-record'],
    queryFn: () => api.get('/patient/health-record').then(r => r.data),
    onSuccess: (data) => {
      if (!loaded) {
        setNotes(data.record?.notes || '');
        setViewable(data.record?.viewable_by_doctors || false);
        setShareCross(data.record?.share_cross_center || false);
        setLoaded(true);
      }
    },
  });

  const saveMutation = useMutation({
    mutationFn: () => api.put('/patient/health-record', {
      notes,
      viewableByDoctors: viewable,
      shareCrossCenter: shareCross,
    }),
    onSuccess: () => {
      toast.success('Health record saved');
      qc.invalidateQueries(['health-record']);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to save'),
  });

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Health Record</h1>
        <p className="text-gray-500 text-sm mt-1">Your personal health information — you control who sees it</p>
      </div>

      <div className="card space-y-6">
        {/* Notes */}
        <div>
          <label className="label flex items-center gap-1"><Heart size={14} /> Personal Health Notes</label>
          <textarea
            className="input"
            rows={6}
            placeholder="Add any personal health notes, allergies, chronic conditions, ongoing medications…"
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>

        {/* Sharing toggles */}
        <div className="space-y-4 border-t border-gray-100 pt-4">
          <h3 className="font-semibold text-gray-800">Privacy Settings</h3>

          <div className="flex items-start justify-between gap-4 p-3 rounded-lg bg-gray-50">
            <div className="flex items-start gap-3">
              {viewable ? <Eye size={18} className="text-blue-600 mt-0.5" /> : <EyeOff size={18} className="text-gray-400 mt-0.5" />}
              <div>
                <p className="font-medium text-gray-800">Allow doctors to view this record</p>
                <p className="text-xs text-gray-500">Doctors at any center you visit can see your health notes</p>
              </div>
            </div>
            <button
              onClick={() => setViewable(v => !v)}
              className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${viewable ? 'bg-blue-600' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${viewable ? 'left-7' : 'left-1'}`} />
            </button>
          </div>

          <div className="flex items-start justify-between gap-4 p-3 rounded-lg bg-gray-50">
            <div className="flex items-start gap-3">
              <Share2 size={18} className={`mt-0.5 ${shareCross ? 'text-green-600' : 'text-gray-400'}`} />
              <div>
                <p className="font-medium text-gray-800">Share visit history across centers</p>
                <p className="text-xs text-gray-500">Doctors at any center can see your visits at other centers</p>
              </div>
            </div>
            <button
              onClick={() => setShareCross(v => !v)}
              className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${shareCross ? 'bg-green-600' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${shareCross ? 'left-7' : 'left-1'}`} />
            </button>
          </div>
        </div>

        <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="btn-primary flex items-center gap-2">
          <Save size={16} /> {saveMutation.isPending ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
