import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Stethoscope, Building2, Mail, MapPin, FileText, User, Hash, CheckCircle2 } from 'lucide-react';
import api from '../../utils/api';

export default function RegisterMediCenter() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    center_name: '',
    email: '',
    location: '',
    phsrc_number: '',
    doctor_name: '',
    doctor_specialty: '',
    slmc_number: '',
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async (data) => {
      // Map frontend field names to what the backend expects
      const payload = {
        center_name: data.center_name,
        email: data.email,
        location: data.location,
        phsrc_number: data.phsrc_number,
        registered_doctor_name: data.doctor_name,
        registered_doctor_specialty: data.doctor_specialty,
        registered_doctor_slmc: data.slmc_number,
      };
      const res = await api.post('/auth/register/medicenter', payload);
      return res.data;
    },
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error ?? err.response?.data?.error ?? err.response?.data?.message ?? 'Registration failed. Please try again.');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutate(form);
  };

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-green-50 px-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-10">
            <div className="flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mx-auto mb-5">
              <CheckCircle2 size={40} className="text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Registration Submitted!</h2>
            <p className="text-gray-500 mb-2">
              Your medical center registration is <span className="font-semibold text-yellow-600">pending review</span> by our system administrators.
            </p>
            <p className="text-gray-500 text-sm mb-6">
              You will receive an email notification once your registration has been reviewed. The process typically takes 1–3 business days.
            </p>
            <Link to="/login" className="btn-primary inline-block">
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-green-50 px-4 py-10">
      <div className="w-full max-w-lg">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-green-500 mb-4 shadow-lg">
            <Building2 size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Register Medical Center</h1>
          <p className="text-gray-500 text-sm mt-1">Join the MediCenter Network</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Center Info Section */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                <Building2 size={14} className="text-blue-600" />
                Center Information
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="label">Center Name</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. Colombo General Medical Center"
                    value={form.center_name}
                    onChange={set('center_name')}
                    required
                  />
                </div>
                <div>
                  <label className="label">Center Email</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      className="input pl-9"
                      placeholder="center@example.com"
                      value={form.email}
                      onChange={set('email')}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="label">Location / Address</label>
                  <div className="relative">
                    <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      className="input pl-9"
                      placeholder="123 Main Street, Colombo 07"
                      value={form.location}
                      onChange={set('location')}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="label">PHSRC Registration Number</label>
                  <div className="relative">
                    <FileText size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      className="input pl-9"
                      placeholder="e.g. PHSRC-2024-001234"
                      value={form.phsrc_number}
                      onChange={set('phsrc_number')}
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            <hr className="border-gray-100" />

            {/* Registered Doctor Section */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                <Stethoscope size={14} className="text-green-600" />
                Registered Doctor Details
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="label">Doctor's Full Name</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      className="input pl-9"
                      placeholder="Dr. Jane Smith"
                      value={form.doctor_name}
                      onChange={set('doctor_name')}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="label">Specialty</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. General Physician, Cardiologist…"
                    value={form.doctor_specialty}
                    onChange={set('doctor_specialty')}
                    required
                  />
                </div>
                <div>
                  <label className="label">SLMC License Number</label>
                  <div className="relative">
                    <Hash size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      className="input pl-9"
                      placeholder="e.g. SLMC-12345"
                      value={form.slmc_number}
                      onChange={set('slmc_number')}
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="btn-primary w-full py-2.5 text-base"
            >
              {isPending ? 'Submitting…' : 'Submit Registration'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            Already registered?{' '}
            <Link to="/login" className="text-blue-600 hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
