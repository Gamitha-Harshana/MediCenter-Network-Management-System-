const QRCode = require('qrcode');

/**
 * Generate QR code data URL for an appointment.
 * Encoded structure: visitDate/patientType/patientId/centerId/doctorId/queueNo
 *
 * @param {string} visitDate   - ISO date string (YYYY-MM-DD)
 * @param {number} patientType - 0=Registered, 1=Temporary
 * @param {string} patientId   - UUID of the patient
 * @param {string} centerId    - UUID of the medi center
 * @param {string} doctorId    - UUID of the doctor
 * @param {number} queueNo     - Queue position number
 * @returns {{ data: string, qrDataUrl: string }}
 */
const generateQRCode = async (visitDate, patientType, patientId, centerId, doctorId, queueNo) => {
  const data = `${visitDate}/${patientType}/${patientId}/${centerId}/${doctorId}/${queueNo}`;
  const qrDataUrl = await QRCode.toDataURL(data, { errorCorrectionLevel: 'H' });
  return { data, qrDataUrl };
};

/**
 * Parse QR code data string back into its constituent parts.
 * @param {string} qrData - Raw QR code string
 * @returns {{ visitDate, patientType, patientId, centerId, doctorId, queueNo }}
 */
const parseQRCode = (qrData) => {
  const parts = qrData.split('/');
  if (parts.length !== 6) throw new Error('Invalid QR code format');
  return {
    visitDate: parts[0],
    patientType: parseInt(parts[1]),
    patientId: parts[2],
    centerId: parts[3],
    doctorId: parts[4],
    queueNo: parseInt(parts[5])
  };
};

module.exports = { generateQRCode, parseQRCode };
