import React, { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../../utils/api';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import toast from 'react-hot-toast';
import { ArrowLeft, Calendar, Stethoscope, CheckCircle } from 'lucide-react';
import { format, addDays } from 'date-fns';

export default function BookAppointment() {
  const { centerId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const center = location.state?.center;

  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [booked, setBooked] = useState(null);

  // Load center's doctors
  const { data: centerData, isLoading } = useQuery({
    queryKey: ['center-doctors', centerId],
    queryFn: () => api.get(`/patient/centers/search?centerId=${centerId}`).then(r => r.data),
    enabled: !!centerId,
  });

  // Load queue info for selected doctor + date
  const { data: queueData } = useQuery({
    queryKey: ['queue-info', selectedDoctor, selectedDate],
    queryFn: () => api.get(`/patient/appointments/queue-info?doctorId=${selectedDoctor}&date=${selectedDate}`).then(r => r.data),
    enabled: !!(selectedDoctor && selectedDate),
  });

  const bookMutation = useMutation({
    mutationFn: () => api.post('/patient/appointments', {
      centerId,
      doctorId: selectedDoctor,
      visitDate: selectedDate,
    }),
    onSuccess: (res) => {
      setBooked(res.data);
      toast.success('Appointment booked!');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Booking failed'),
  });

  // Generate next 14 days for date picker
  const today = new Date();
  const dateOptions = Array.from({ length: 14 }, (_, i) => {
    const d = addDays(today, i + 1);
    return { value: format(d, 'yyyy-MM-dd'), label: format(d, 'EEE, MMM d') };
  });

  if (booked) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="card text-center space-y-4">
          <CheckCircle size={48} className="mx-auto text-green-500" />
          <h2 className="text-xl font-bold text-gray-900">Appointment Confirmed!</h2>
          <div className="bg-green-50 rounded-xl p-4 space-y-2">
            <p className="text-sm text-gray-600">Queue Number</p>
            <p className="text-5xl font-black text-green-600">{booked.appointment?.queue_no}</p>
            <p className="text-sm text-gray-600">{booked.appointment?.visit_date}</p>
          </div>
          {booked.qrCodeDataUrl && (
            <div>
              <p className="text-sm text-gray-500 mb-2">Your QR Code (show this to the doctor)</p>
              <img src={booked.qrCodeDataUrl} alt="QR Code" className="mx-auto w-48 h-48" />
            </div>
          )}
          <p className="text-xs text-gray-400">A copy has been sent to your email.</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => navigate('/patient/appointments')} className="btn-primary">View Appointments</button>
            <button onClick={() => navigate('/patient/centers')} className="btn-secondary">Find Another</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/patient/centers')} className="btn-secondary p-2"><ArrowLeft size={18} /></button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Book Appointment</h1>
          <p className="text-gray-500 text-sm">{center?.center_name}</p>
        </div>
      </div>

      <div className="card space-y-5">
        {/* Doctor Selection */}
        <div>
          <label className="label flex items-center gap-1"><Stethoscope size={14} /> Select Doctor</label>
          <select
            className="input"
            value={selectedDoctor}
            onChange={e => setSelectedDoctor(e.target.value)}
          >
            <option value="">Choose a doctor…</option>
            {centerData?.centers?.[0]?.doctors?.map(d => (
              <option key={d.doctor_id} value={d.doctor_id}>
                Dr. {d.name} — {d.specialty}
              </option>
            ))}
          </select>
        </div>

        {/* Date Selection */}
        <div>
          <label className="label flex items-center gap-1"><Calendar size={14} /> Select Date</label>
          <select className="input" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} disabled={!selectedDoctor}>
            <option value="">Choose a date…</option>
            {dateOptions.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </div>

        {/* Queue Info */}
        {queueData && (
          <div className="bg-blue-50 rounded-lg p-3 text-sm">
            <p className="font-medium text-blue-800">
              {queueData.booked} / {queueData.limit} slots booked
              {queueData.booked >= queueData.limit
                ? ' — 🚫 Fully booked'
                : ` — ${queueData.limit - queueData.booked} remaining`
              }
            </p>
          </div>
        )}

        <button
          onClick={() => bookMutation.mutate()}
          disabled={!selectedDoctor || !selectedDate || bookMutation.isPending || (queueData?.booked >= queueData?.limit)}
          className="btn-primary w-full"
        >
          {bookMutation.isPending ? 'Booking…' : 'Confirm Appointment'}
        </button>
      </div>
    </div>
  );
}
