import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { Search, MapPin, Clock, Stethoscope, ArrowRight } from 'lucide-react';

const SPECIALTIES = [
  'General Practitioner','Cardiologist','Dermatologist','ENT Specialist',
  'Gastroenterologist','Neurologist','Orthopedist','Pediatrician',
  'Psychiatrist','Radiologist','Surgeon','Urologist'
];

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

export default function FindCenters() {
  const navigate = useNavigate();
  const [specialty, setSpecialty] = useState('');
  const [day, setDay]             = useState('');
  const [lat, setLat]             = useState('');
  const [lon, setLon]             = useState('');
  const [searched, setSearched]   = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['center-search', specialty, day, lat, lon],
    queryFn: () => {
      const params = new URLSearchParams();
      if (specialty) params.append('specialty', specialty);
      if (day)       params.append('day', day);
      if (lat)       params.append('lat', lat);
      if (lon)       params.append('lon', lon);
      return api.get(`/patient/centers/search?${params}`).then(r => r.data);
    },
    enabled: false,
  });

  const useMyLocation = () => {
    navigator.geolocation.getCurrentPosition(
      pos => { setLat(pos.coords.latitude.toString()); setLon(pos.coords.longitude.toString()); },
      () => alert('Location access denied')
    );
  };

  const handleSearch = () => { setSearched(true); refetch(); };

  const centers = data?.centers || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Find a MediCenter</h1>
        <p className="text-gray-500 text-sm mt-1">Search centers by specialty, availability or location</p>
      </div>

      {/* Search Filters */}
      <div className="card space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="label">Doctor Specialty</label>
            <select className="input" value={specialty} onChange={e => setSpecialty(e.target.value)}>
              <option value="">Any specialty</option>
              {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Available Day</label>
            <select className="input" value={day} onChange={e => setDay(e.target.value)}>
              <option value="">Any day</option>
              {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Sort by Distance</label>
            <div className="flex gap-2">
              <button onClick={useMyLocation} className="btn-secondary flex-1 text-sm flex items-center gap-1 justify-center">
                <MapPin size={14} /> Use My Location
              </button>
            </div>
            {lat && <p className="text-xs text-green-600 mt-1">📍 Location captured</p>}
          </div>
        </div>
        <button onClick={handleSearch} className="btn-primary flex items-center gap-2">
          <Search size={16} /> Search Centers
        </button>
      </div>

      {/* Results */}
      {isLoading && <LoadingSpinner />}

      {searched && !isLoading && (
        <div>
          <p className="text-sm text-gray-500 mb-3">{centers.length} center(s) found</p>
          <div className="space-y-4">
            {centers.length === 0 ? (
              <div className="card text-center py-12">
                <Search size={40} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-400">No centers match your criteria.</p>
              </div>
            ) : centers.map(center => (
              <div key={center.center_id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{center.center_name}</h3>
                      {center.distance_km && (
                        <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-medium">
                          {center.distance_km.toFixed(1)} km
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                      <MapPin size={13} /> {center.location}
                    </div>

                    {/* Doctors / Specialties */}
                    {center.specialties?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {center.specialties.map(s => (
                          <span key={s} className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Stethoscope size={10} /> {s}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Available days */}
                    {center.available_days?.length > 0 && (
                      <div className="flex items-center gap-1 text-xs text-gray-500 mt-2">
                        <Clock size={11} /> Open: {center.available_days.join(', ')}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => navigate(`/patient/book/${center.center_id}`, { state: { center } })}
                    className="btn-primary text-sm flex items-center gap-1 shrink-0"
                  >
                    Book <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
