import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Stethoscope, Mail, Lock, User, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

/** Endpoint + role returned by each tab */
const TAB_CONFIG = {
  admin: {
    label: 'Admin',
    icon: Shield,
    endpoint: '/auth/login/admin',
    description: 'SysAdmin or Center Admin',
  },
  doctor: {
    label: 'Doctor',
    icon: Stethoscope,
    endpoint: '/auth/login/doctor',
    description: 'Medical professional login',
  },
  patient: {
    label: 'Patient',
    icon: User,
    endpoint: '/auth/login/patient',
    description: 'Access your health records',
  },
};

const DASHBOARD_MAP = {
  SysAdmin: '/sysadmin/dashboard',
  MediCenterAdmin: '/admin/dashboard',
  Doctor: '/doctor/dashboard',
  Patient: '/patient/home',
};

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('admin');
  const [form, setForm] = useState({ email: '', password: '' });

  const { mutate, isPending } = useMutation({
    mutationFn: async (data) => {
      const res = await api.post(TAB_CONFIG[activeTab].endpoint, data);
      return res.data;
    },
    onSuccess: (data) => {
      const { token, user } = data;
      login(token, user);
      toast.success(`Welcome back, ${user.name ?? user.email}!`);
      navigate(DASHBOARD_MAP[user.role] ?? '/login', { replace: true });
    },
    onError: (err) => {
      toast.error(err.response?.data?.error ?? err.response?.data?.error ?? err.response?.data?.message ?? 'Invalid credentials. Please try again.');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      toast.error('Please enter email and password.');
      return;
    }
    mutate(form);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-green-50 px-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-green-500 mb-4 shadow-lg">
            <Stethoscope size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">MediCenter Network</h1>
          <p className="text-gray-500 text-sm mt-1">Management System</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-100">
            {Object.entries(TAB_CONFIG).map(([key, cfg]) => {
              const Icon = cfg.icon;
              return (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
                    activeTab === key
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon size={16} />
                  {cfg.label}
                </button>
              );
            })}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <p className="text-xs text-gray-400 text-center -mt-1">
              {TAB_CONFIG[activeTab].description}
            </p>

            {/* Email */}
            <div>
              <label className="label">Email Address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  className="input pl-9"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  className="input pl-9"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="btn-primary w-full py-2.5 text-base"
            >
              {isPending ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          {/* Footer links */}
          <div className="px-6 pb-6 pt-0 border-t border-gray-50 space-y-2 text-center text-sm">
            <p className="text-gray-500">
              New patient?{' '}
              <Link to="/register" className="text-blue-600 hover:underline font-medium">
                Register here
              </Link>
            </p>
            <p className="text-gray-500">
              Medical center?{' '}
              <Link to="/register-center" className="text-green-600 hover:underline font-medium">
                Register your center
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
