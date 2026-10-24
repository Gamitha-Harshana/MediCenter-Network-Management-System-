import React, { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../../utils/api';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import toast from 'react-hot-toast';
import { ArrowLeft, Calendar, Stethoscope, CheckCircle, Clock, Users } from 'lucide-react';
import { format, addDays } from 'date-fns';

export default function BookAppointment() {
  const { centerId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const center = location.state?.center;

  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [booked, setBooked] = useState(null);

  // Load center's approved doctors with their schedules
  const { data: doctorData, isLoading } = useQuery({
    queryKey: ['center-doctors', centerId],
    queryFn: () => api.get(`/patient/centers/${centerId}/doctors`).then(r => r.data),
    enabled: !!centerId,
  });

  const doctors = doctorData?.doctors || [];
  const selectedDoctorObj = doctors.find(d => d.doctor_id === selectedDoctor);

  // Get available days for the selected doctor
  const availableDays = selectedDoctorObj?.schedules?.map(s => s.day_of_week) || [];

  // Generate next 14 days, filtering by doctor's schedule days
  const today = new Date();
  const dateOptions = Array.from({ length: 14 }, (_, i) => {
    const d = addDays(today, i + 1);
    const dayName = format(d, 'EEEE'); // e.g. "Monday"
    return { value: format(d, 'yyyy-MM-dd'), label: format(d, 'EEE, MMM d'), dayName };
  }).filter(d => !selectedDoctor || availableDays.includes(d.dayName));

  // Load queue info for selected doctor + date
  const { data: queueData } = useQuery({
    queryKey: ['queue-info', selectedDoctor, selectedDate],
    queryFn: () =>
      api.get(`/patient/centers/queue-info?doctorId=${selectedDoctor}&date=${selectedDate}`)
        .then(r => r.data),
    enabled: !!(selectedDoctor && selectedDate),
  });

  // Get the schedule for the selected date to show timing
  const selectedSchedule = selectedDoctorObj?.schedules?.find(
    s => s.day_of_week === dateOptions.find(d => d.value === selectedDate)?.dayName
  );

  const bookMutation = useMutation({
    mutationFn: () => api.post('/patient/appointments', {
      center_id: centerId,
      doctor_id: selectedDoctor,
      visit_date: selectedDate,
    }),
    onSuccess: (res) => {
      setBooked(res.data);
      toast.success('Appointment booked!');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Booking failed'),
  });

  // ── Success screen ──────────────────────────────────────────
  if (booked) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="card text-center space-y-5">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mx-auto">
            <CheckCircle size={36} className="text-green-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Appointment Confirmed!</h2>
            <p className="text-gray-500 text-sm mt-1">{center?.center_name}</p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-xl p-5 space-y-1">
            <p className="text-xs text-gray-500">Queue Number</p>
            <p className="text-6xl font-black text-green-600">{booked.appointment?.queue_no}</p>
            <p className="text-sm text-gray-600 font-medium">{booked.appointment?.visit_date}</p>
          </div>

          {booked.qrCodeDataUrl && (
            <div>
              <p className="text-sm text-gray-500 mb-3">Show this QR code to the doctor</p>
              <img
                src={booked.qrCodeDataUrl}
                alt="QR Code"
                className="mx-auto w-52 h-52 rounded-xl border border-gray-200 shadow"
              />
            </div>
          )}

          {booked.schedule && (
            <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
              <Clock size={14} className="text-blue-500" />
              Clinic hours: {booked.schedule.start_time} – {booked.schedule.end_time}
            </div>
          )}

          <div className="flex gap-3 justify-center">
            <button onClick={() => navigate('/patient/appointments')} className="btn-primary">
              View Appointments
            </button>
            <button onClick={() => navigate('/patient/centers')} className="btn-secondary">
              Find Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Booking form ────────────────────────────────────────────
  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/patient/centers')} className="btn-secondary p-2">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Book Appointment</h1>
          <p className="text-blue-600 text-sm font-medium">{center?.center_name}</p>
        </div>
      </div>

      <div className="card space-y-5">
        {isLoading ? (
          <LoadingSpinner />
        ) : doctors.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Stethoscope className="mx-auto mb-2" size={32} />
            <p>No doctors available at this center.</p>
          </div>
        ) : (
          <>
            {/* Doctor Selection */}
            <div>
              <label className="label flex items-center gap-1">
                <Stethoscope size={14} /> Select Doctor
              </label>
              <select
                className="input"
                value={selectedDoctor}
                onChange={e => { setSelectedDoctor(e.target.value); setSelectedDate(''); }}
              >
                <option value="">Choose a doctor…</option>
                {doctors.map(d => (
                  <option key={d.doctor_id} value={d.doctor_id}>
                    Dr. {d.name} — {d.specialty}
                  </option>
                ))}
              </select>

              {/* Doctor schedule days hint */}
              {selectedDoctorObj && availableDays.length > 0 && (
                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                  <Clock size={11} /> Available: {availableDays.join(', ')}
                </p>
              )}
            </div>

            {/* Date Selection */}
            <div>
              <label className="label flex items-center gap-1">
                <Calendar size={14} /> Select Date
              </label>
              <select
                className="input"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                disabled={!selectedDoctor}
              >
                <option value="">Choose a date…</option>
                {dateOptions.map(d => (
                  <option key={d.value} value={d.value}>{d.label} ({d.dayName})</option>
                ))}
              </select>
              {selectedDoctor && dateOptions.length === 0 && (
                <p className="text-xs text-red-500 mt-1">No available dates in the next 14 days for this doctor.</p>
              )}
            </div>

            {/* Schedule timing */}
            {selectedSchedule && (
              <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 rounded-lg px-3 py-2">
                <Clock size={14} />
                Clinic: {selectedSchedule.start_time} – {selectedSchedule.end_time}
              </div>
            )}

            {/* Queue Info */}
            {queueData && (
              <div className={`rounded-lg p-3 text-sm flex items-center gap-2 ${
                queueData.available ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
              }`}>
                <Users size={15} />
                <span>
                  <strong>{queueData.booked}</strong> / {queueData.limit} slots booked
                  {!queueData.available
                    ? ' — Fully booked'
                    : ` — ${queueData.limit - queueData.booked} slots remaining`
                  }
                </span>
              </div>
            )}

            <button
              onClick={() => bookMutation.mutate()}
              disabled={
                !selectedDoctor || !selectedDate ||
                bookMutation.isPending ||
                queueData?.available === false
              }
              className="btn-primary w-full py-3 text-base"
            >
              {bookMutation.isPending ? 'Booking…' : 'Confirm Appointment'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
