import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { QrCode, Camera, ArrowLeft, CheckCircle, XCircle } from 'lucide-react';

export default function QRScanner() {
  const navigate = useNavigate();
  const [manualInput, setManualInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const validateQR = async (qrData) => {
    setError('');
    setResult(null);
    try {
      const res = await api.post('/doctor/scan-qr', { qrData });
      setResult(res.data);
      toast.success('Patient checked in successfully!');
      // Auto-navigate to consultation after 1.5s
      setTimeout(() => {
        navigate('/doctor/consultation', { state: { appointment: res.data.appointment, patient: res.data.patient } });
      }, 1500);
    } catch (err) {
      const msg = err.response?.data?.error || 'Invalid QR code';
      setError(msg);
      toast.error(msg);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualInput.trim()) validateQR(manualInput.trim());
  };

  const startCamera = async () => {
    setScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;

      // Use BarcodeDetector if available
      if ('BarcodeDetector' in window) {
        const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
        const scanLoop = setInterval(async () => {
          if (videoRef.current && videoRef.current.readyState === 4) {
            try {
              const codes = await detector.detect(videoRef.current);
              if (codes.length > 0) {
                clearInterval(scanLoop);
                stream.getTracks().forEach(t => t.stop());
                setScanning(false);
                validateQR(codes[0].rawValue);
              }
            } catch {}
          }
        }, 500);
      }
    } catch {
      toast.error('Camera access denied or not available');
      setScanning(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    setScanning(false);
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/doctor/queue')} className="btn-secondary p-2">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">QR Scanner</h1>
          <p className="text-gray-500 text-sm">Scan patient appointment QR code to check in</p>
        </div>
      </div>

      {/* Camera Scanner */}
      <div className="card text-center space-y-4">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 mx-auto">
          <Camera size={28} className="text-blue-600" />
        </div>
        <h2 className="font-semibold text-gray-800">Camera Scan</h2>

        {scanning ? (
          <div className="space-y-3">
            <div className="relative rounded-xl overflow-hidden bg-black" style={{ aspectRatio: '4/3' }}>
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              {/* Scan overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-48 border-2 border-blue-400 rounded-lg opacity-70" />
              </div>
            </div>
            <button onClick={stopCamera} className="btn-danger">Stop Camera</button>
            <p className="text-xs text-gray-400">Point the camera at the patient's QR code</p>
          </div>
        ) : (
          <button onClick={startCamera} className="btn-primary flex items-center gap-2 mx-auto">
            <Camera size={16} /> Start Camera
          </button>
        )}
      </div>

      {/* Manual Input */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2">
          <QrCode size={20} className="text-gray-500" />
          <h2 className="font-semibold text-gray-800">Enter QR Data Manually</h2>
        </div>
        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <input
            type="text"
            className="input flex-1"
            placeholder="e.g. 2026-10-24/1/patient-id/center-id/doctor-id/3"
            value={manualInput}
            onChange={e => setManualInput(e.target.value)}
          />
          <button type="submit" className="btn-primary whitespace-nowrap">Validate</button>
        </form>
      </div>

      {/* Result */}
      {result && (
        <div className="card border border-green-200 bg-green-50 flex items-start gap-3">
          <CheckCircle className="text-green-600 shrink-0 mt-0.5" size={20} />
          <div>
            <p className="font-semibold text-green-800">Check-in Successful!</p>
            <p className="text-sm text-green-700 mt-1">
              Patient: <strong>{result.patient?.name}</strong> — Queue #{result.appointment?.queue_no}
            </p>
            <p className="text-xs text-green-600 mt-1">Redirecting to consultation…</p>
          </div>
        </div>
      )}

      {error && (
        <div className="card border border-red-200 bg-red-50 flex items-start gap-3">
          <XCircle className="text-red-600 shrink-0 mt-0.5" size={20} />
          <div>
            <p className="font-semibold text-red-800">Check-in Failed</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
