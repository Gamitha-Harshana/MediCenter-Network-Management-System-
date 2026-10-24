import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../utils/api';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { Calendar } from 'lucide-react';

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

export default function DoctorSchedules() {
  const { data, isLoading } = useQuery({
    queryKey: ['doctor-schedules'],
    queryFn: () => api.get('/doctor/schedules').then(r => r.data),
  });

  const schedules = data?.schedules || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Schedules</h1>
        <p className="text-gray-500 text-sm mt-1">Your consultation hours set by the center admin</p>
      </div>

      {isLoading ? <LoadingSpinner /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {DAYS.map(day => {
            const daySchedules = schedules.filter(s => s.day_of_week === day);
            return (
              <div key={day} className={`card ${daySchedules.length > 0 ? 'border-blue-100' : 'opacity-60'}`}>
                <div className="flex items-center gap-2 mb-3">
                  <Calendar size={16} className={daySchedules.length > 0 ? 'text-blue-600' : 'text-gray-400'} />
                  <h3 className="font-semibold text-gray-800">{day}</h3>
                </div>
                {daySchedules.length === 0 ? (
                  <p className="text-sm text-gray-400">No schedule</p>
                ) : (
                  <div className="space-y-2">
                    {daySchedules.map(s => (
                      <div key={s.schedule_id} className="flex justify-between items-center bg-blue-50 rounded-lg px-3 py-2">
                        <span className="text-sm font-medium text-blue-800">
                          {s.start_time} – {s.end_time}
                        </span>
                        <span className="text-xs text-blue-600">{s.patient_amount} patients</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
