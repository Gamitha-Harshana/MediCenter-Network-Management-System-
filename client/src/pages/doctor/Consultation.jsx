import React, { useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { Plus, Trash2, ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { differenceInYears, format } from 'date-fns';

const DRUG_TYPES = ['Tablet', 'Syrup', 'Injection', 'Capsule', 'Cream', 'Drops', 'Other'];
const DRUG_TYPE_UNITS = {
  Tablet: 'tablet(s)', Syrup: 'ml', Injection: 'ml', Capsule: 'capsule(s)',
  Cream: 'g', Drops: 'drop(s)', Other: 'unit(s)',
};

const emptyRx = () => ({ drug_id: '', drug_name: '', drug_type: 'Tablet', times_per_day: 1, dosage_per_time: 1, number_of_days: 3 });
const emptyExtRx = () => ({ external_drug_name: '', drug_type: 'Tablet', times_per_day: 1, dosage_per_time: 1, number_of_days: 3 });
const emptyTest = () => ({ test_name: '' });

export default function Consultation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { appointment, patient } = location.state || {};

  const [symptoms, setSymptoms] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [prescriptions, setPrescriptions] = useState([emptyRx()]);
  const [externalPrescriptions, setExternalPrescriptions] = useState([]);
  const [tests, setTests] = useState([]);
  const [revisitDate, setRevisitDate] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [crossHistoryOpen, setCrossHistoryOpen] = useState(false);
  const [crossHistory, setCrossHistory] = useState(null);

  // Drug inventory for this center
  const { data: inventoryData } = useQuery({
    queryKey: ['doctor-inventory'],
    queryFn: () => api.get('/doctor/inventory').then(r => r.data),
  });

  // Patient's own-center history
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['patient-history', patient?.patient_id],
    queryFn: () => api.get(`/doctor/patients/${patient?.patient_id}/history`).then(r => r.data),
    enabled: !!patient?.patient_id,
  });

  const drugs = inventoryData?.drugs || [];

  const age = patient?.date_of_birth
    ? differenceInYears(new Date(), new Date(patient.date_of_birth))
    : null;

  // Prescription helpers
  const updateRx = (idx, field, val) => {
    const updated = [...prescriptions];
    updated[idx] = { ...updated[idx], [field]: val };
    if (field === 'drug_id') {
      const drug = drugs.find(d => d.drug_id === val);
      if (drug) { updated[idx].drug_name = drug.drug_name; updated[idx].drug_type = drug.drug_type; }
    }
    if (field === 'drug_type') updated[idx].dosage_unit = DRUG_TYPE_UNITS[val] || 'unit(s)';
    setPrescriptions(updated);
  };
  const addRx = () => setPrescriptions([...prescriptions, emptyRx()]);
  const removeRx = (idx) => setPrescriptions(prescriptions.filter((_, i) => i !== idx));

  const updateExtRx = (idx, field, val) => {
    const updated = [...externalPrescriptions];
    updated[idx] = { ...updated[idx], [field]: val };
    setExternalPrescriptions(updated);
  };
  const addExtRx = () => setExternalPrescriptions([...externalPrescriptions, emptyExtRx()]);
  const removeExtRx = (idx) => setExternalPrescriptions(externalPrescriptions.filter((_, i) => i !== idx));

  const addTest = () => setTests([...tests, emptyTest()]);
  const updateTest = (idx, val) => { const t = [...tests]; t[idx].test_name = val; setTests(t); };
  const removeTest = (idx) => setTests(tests.filter((_, i) => i !== idx));

  const loadCrossHistory = async () => {
    if (crossHistory) { setCrossHistoryOpen(o => !o); return; }
    try {
      const res = await api.get(`/doctor/patients/${patient?.patient_id}/cross-center-history`);
      setCrossHistory(res.data);
      setCrossHistoryOpen(true);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not load cross-center history');
    }
  };

  const saveMutation = useMutation({
    mutationFn: (payload) => api.post('/doctor/consultation', payload),
    onSuccess: () => {
      toast.success('Consultation saved! Next patient ready.');
      navigate('/doctor/queue');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to save consultation'),
  });

  const handleSubmit = () => {
    if (!symptoms.trim() || !diagnosis.trim()) {
      toast.error('Please enter symptoms and diagnosis');
      return;
    }
    const validRx = prescriptions.filter(p => p.drug_id);
    const validExtRx = externalPrescriptions.filter(p => p.external_drug_name?.trim());
    const validTests = tests.filter(t => t.test_name?.trim());

    saveMutation.mutate({
      appointmentId: appointment?.appointment_id,
      patientId: patient?.patient_id,
      symptoms,
      diagnosis,
      prescriptions: validRx,
      externalPrescriptions: validExtRx,
      tests: validTests,
      revisitDate: revisitDate || null,
    });
  };

  if (!patient || !appointment) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">No patient selected. Please scan a QR code first.</p>
        <button onClick={() => navigate('/doctor/scan')} className="btn-primary mt-4">Go to Scanner</button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/doctor/queue')} className="btn-secondary p-2"><ArrowLeft size={18} /></button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Consultation</h1>
          <p className="text-sm text-gray-500">Queue #{appointment.queue_no} · {format(new Date(), 'PPP')}</p>
        </div>
      </div>

      {/* Patient Info */}
      <div className="card bg-blue-50 border border-blue-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-blue-500 uppercase tracking-wider">Patient</p>
            <h2 className="text-xl font-bold text-blue-900 mt-0.5">{patient.name}</h2>
            <p className="text-blue-700 text-sm">{age !== null ? `${age} years old` : 'Age unknown'} · {patient.patient_type}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-blue-500">Queue Number</p>
            <span className="text-4xl font-black text-blue-600">{appointment.queue_no}</span>
          </div>
        </div>
      </div>

      {/* Symptoms & Diagnosis */}
      <div className="card space-y-4">
        <h3 className="font-semibold text-gray-800">Symptoms & Diagnosis</h3>
        <div>
          <label className="label">Symptoms *</label>
          <textarea className="input" rows={3} placeholder="Describe patient symptoms…" value={symptoms} onChange={e => setSymptoms(e.target.value)} />
        </div>
        <div>
          <label className="label">Diagnosis *</label>
          <textarea className="input" rows={3} placeholder="Enter diagnosis…" value={diagnosis} onChange={e => setDiagnosis(e.target.value)} />
        </div>
      </div>

      {/* Visit History — own center */}
      <div className="card">
        <button className="flex items-center justify-between w-full" onClick={() => setHistoryOpen(o => !o)}>
          <h3 className="font-semibold text-gray-800">Visit History (This Center)</h3>
          {historyOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        {historyOpen && (
          <div className="mt-4">
            {historyLoading ? <LoadingSpinner /> : (historyData?.records?.length === 0 ? (
              <p className="text-gray-400 text-sm">No previous visits at this center.</p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {historyData?.records?.map(r => (
                  <div key={r.record_id} className="border border-gray-100 rounded-lg p-3">
                    <p className="text-xs text-gray-400">{format(new Date(r.visit_date), 'PPP')}</p>
                    <p className="text-sm font-medium text-gray-700 mt-1">Diagnosis: {r.diagnosis}</p>
                    <p className="text-xs text-gray-500">Symptoms: {r.symptoms}</p>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cross-center history — registered patients only */}
      {patient.patient_type === 'Registered' && (
        <div className="card">
          <button className="flex items-center justify-between w-full" onClick={loadCrossHistory}>
            <h3 className="font-semibold text-gray-800">History from Other Centers</h3>
            {crossHistoryOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          {crossHistoryOpen && crossHistory && (
            <div className="mt-4">
              {crossHistory.records?.length === 0 ? (
                <p className="text-gray-400 text-sm">No cross-center history available or sharing is disabled.</p>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {crossHistory.records?.map(r => (
                    <div key={r.record_id} className="border border-gray-100 rounded-lg p-3">
                      <p className="text-xs text-gray-400">{format(new Date(r.visit_date), 'PPP')} · {r.center_name}</p>
                      <p className="text-sm font-medium text-gray-700 mt-1">Diagnosis: {r.diagnosis}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Prescription (from center stock) */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">Prescription (Center Stock)</h3>
          <button onClick={addRx} className="btn-secondary text-sm flex items-center gap-1"><Plus size={14} />Add Drug</button>
        </div>
        {prescriptions.map((rx, idx) => (
          <div key={idx} className="grid grid-cols-12 gap-2 items-end border border-gray-100 rounded-lg p-3">
            <div className="col-span-3">
              <label className="label text-xs">Drug</label>
              <select className="input text-sm" value={rx.drug_id} onChange={e => updateRx(idx, 'drug_id', e.target.value)}>
                <option value="">Select…</option>
                {drugs.map(d => <option key={d.drug_id} value={d.drug_id}>{d.drug_name} ({d.quantity} {d.dosage_unit})</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="label text-xs">Type</label>
              <select className="input text-sm" value={rx.drug_type} onChange={e => updateRx(idx, 'drug_type', e.target.value)}>
                {DRUG_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="label text-xs">Times/Day</label>
              <input type="number" min={1} className="input text-sm" value={rx.times_per_day} onChange={e => updateRx(idx, 'times_per_day', +e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="label text-xs">Dose ({DRUG_TYPE_UNITS[rx.drug_type]})</label>
              <input type="number" min={0.5} step={0.5} className="input text-sm" value={rx.dosage_per_time} onChange={e => updateRx(idx, 'dosage_per_time', +e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="label text-xs">Days</label>
              <input type="number" min={1} className="input text-sm" value={rx.number_of_days} onChange={e => updateRx(idx, 'number_of_days', +e.target.value)} />
            </div>
            <div className="col-span-1 flex justify-end">
              <button onClick={() => removeRx(idx)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={15} /></button>
            </div>
          </div>
        ))}
      </div>

      {/* External Prescription */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">External Prescription (Out of Stock)</h3>
          <button onClick={addExtRx} className="btn-secondary text-sm flex items-center gap-1"><Plus size={14} />Add</button>
        </div>
        {externalPrescriptions.map((rx, idx) => (
          <div key={idx} className="grid grid-cols-12 gap-2 items-end border border-orange-100 rounded-lg p-3 bg-orange-50">
            <div className="col-span-3">
              <label className="label text-xs">Drug Name</label>
              <input type="text" className="input text-sm" placeholder="Drug name" value={rx.external_drug_name} onChange={e => updateExtRx(idx, 'external_drug_name', e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="label text-xs">Type</label>
              <select className="input text-sm" value={rx.drug_type} onChange={e => updateExtRx(idx, 'drug_type', e.target.value)}>
                {DRUG_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="label text-xs">Times/Day</label>
              <input type="number" min={1} className="input text-sm" value={rx.times_per_day} onChange={e => updateExtRx(idx, 'times_per_day', +e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="label text-xs">Dose ({DRUG_TYPE_UNITS[rx.drug_type]})</label>
              <input type="number" min={0.5} step={0.5} className="input text-sm" value={rx.dosage_per_time} onChange={e => updateExtRx(idx, 'dosage_per_time', +e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="label text-xs">Days</label>
              <input type="number" min={1} className="input text-sm" value={rx.number_of_days} onChange={e => updateExtRx(idx, 'number_of_days', +e.target.value)} />
            </div>
            <div className="col-span-1 flex justify-end">
              <button onClick={() => removeExtRx(idx)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={15} /></button>
            </div>
          </div>
        ))}
      </div>

      {/* Test Recommendations */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">Test Recommendations</h3>
          <button onClick={addTest} className="btn-secondary text-sm flex items-center gap-1"><Plus size={14} />Add Test</button>
        </div>
        {tests.map((t, idx) => (
          <div key={idx} className="flex gap-2">
            <input type="text" className="input flex-1" placeholder="Test name (e.g. Blood Count, X-Ray)" value={t.test_name} onChange={e => updateTest(idx, e.target.value)} />
            <button onClick={() => removeTest(idx)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={15} /></button>
          </div>
        ))}
      </div>

      {/* Revisit — registered patients only */}
      {patient.patient_type === 'Registered' && (
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-3">Schedule Revisit (Optional)</h3>
          <input
            type="date"
            className="input max-w-xs"
            min={format(new Date(), 'yyyy-MM-dd')}
            value={revisitDate}
            onChange={e => setRevisitDate(e.target.value)}
          />
        </div>
      )}

      {/* Next Patient Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={saveMutation.isPending}
          className="btn-primary text-base px-8 py-3"
        >
          {saveMutation.isPending ? 'Saving…' : '✓ Next Patient'}
        </button>
      </div>
    </div>
  );
}
