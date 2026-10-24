const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { generateQRCode } = require('../utils/qrcode');

// ─────────────────────────────────────────────────────────────
// GET /api/patient/profile
// ─────────────────────────────────────────────────────────────
const getProfile = async (req, res) => {
  try {
    const { id } = req.user;
    const result = await db.query(
      `SELECT patient_id, name, email, date_of_birth, phone, patient_type, created_at
       FROM patient WHERE patient_id = ?`,
      [id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Patient not found' });
    return res.json(result.rows[0]);
  } catch (err) {
    console.error('getProfile error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ─────────────────────────────────────────────────────────────
// PUT /api/patient/profile
// Body: { name?, phone?, date_of_birth? }
// ─────────────────────────────────────────────────────────────
const updateProfile = async (req, res) => {
  try {
    const { id } = req.user;
    const { name, phone, date_of_birth } = req.body;

    await db.query(
      `UPDATE patient
       SET name          = COALESCE(?, name),
           phone         = COALESCE(?, phone),
           date_of_birth = COALESCE(?, date_of_birth)
       WHERE patient_id = ?`,
      [name || null, phone || null, date_of_birth || null, id]
    );

    const updated = await db.query(
      'SELECT patient_id, name, email, phone, date_of_birth, patient_type FROM patient WHERE patient_id = ?',
      [id]
    );
    return res.json(updated.rows[0]);
  } catch (err) {
    console.error('updateProfile error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/patient/centers/search
// Query: lat, lon, specialty, date
// Returns approved centers, ordered by distance if lat/lon supplied
// ─────────────────────────────────────────────────────────────
const searchCenters = async (req, res) => {
  try {
    const { lat, lon, specialty, date } = req.query;

    const params = [];
    let selectClause = `SELECT DISTINCT mc.center_id, mc.center_name, mc.location,
                        mc.latitude, mc.longitude, mc.email`;

    // MySQL Haversine formula
    if (lat && lon) {
      params.push(parseFloat(lat), parseFloat(lon), parseFloat(lat));
      selectClause += `,
        (6371 * ACOS(
          COS(RADIANS(?)) * COS(RADIANS(mc.latitude)) *
          COS(RADIANS(mc.longitude) - RADIANS(?)) +
          SIN(RADIANS(?)) * SIN(RADIANS(mc.latitude))
        )) AS distance_km`;
    }

    let fromClause = ' FROM medi_center mc';
    const needsDoctorJoin = specialty || date;
    if (needsDoctorJoin) {
      fromClause += `
        JOIN doctor d ON d.center_id = mc.center_id AND d.approval_status = 'Approved'
        JOIN schedule s ON s.doctor_id = d.doctor_id AND s.is_active = 1`;
    }

    let whereClause = " WHERE mc.approval_status = 'Approved' AND mc.latitude IS NOT NULL AND mc.longitude IS NOT NULL";

    if (specialty) {
      params.push(`%${specialty}%`);
      whereClause += ' AND d.specialty LIKE ?';
    }

    if (date) {
      const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
      const dateObj = new Date(date);
      const dayName = days[dateObj.getUTCDay()];
      params.push(dayName);
      whereClause += ' AND s.day_of_week = ?';
    }

    const orderClause = (lat && lon)
      ? ' ORDER BY distance_km ASC'
      : ' ORDER BY mc.center_name ASC';

    const fullQuery = selectClause + fromClause + whereClause + orderClause + ' LIMIT 50';
    const result = await db.query(fullQuery, params);

    // For each center, attach available specialties
    const centers = await Promise.all(result.rows.map(async (center) => {
      const doctorsRes = await db.query(
        `SELECT DISTINCT specialty FROM doctor
         WHERE center_id = ? AND approval_status = 'Approved'`,
        [center.center_id]
      );
      return {
        ...center,
        specialties: doctorsRes.rows.map((r) => r.specialty)
      };
    }));

    return res.json({ centers });
  } catch (err) {
    console.error('searchCenters error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/patient/appointments
// Body: { doctor_id, center_id, visit_date }
// Assigns queue number atomically and generates QR code
// ─────────────────────────────────────────────────────────────
const bookAppointment = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const { id: patientId } = req.user;
    const { doctor_id, center_id, visit_date } = req.body;

    if (!doctor_id || !center_id || !visit_date) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ error: 'doctor_id, center_id, and visit_date are required' });
    }

    // Verify doctor belongs to center and is approved
    const [doctorRows] = await conn.execute(
      "SELECT * FROM doctor WHERE doctor_id = ? AND center_id = ? AND approval_status = 'Approved'",
      [doctor_id, center_id]
    );
    if (!doctorRows[0]) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ error: 'Doctor not found at this center' });
    }

    // Get day of week from visit_date
    const visitDateObj = new Date(visit_date);
    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const dayName = days[visitDateObj.getUTCDay()];

    // Check schedule exists for that day
    const [scheduleRows] = await conn.execute(
      'SELECT * FROM schedule WHERE doctor_id = ? AND day_of_week = ? AND is_active = 1',
      [doctor_id, dayName]
    );
    if (!scheduleRows[0]) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ error: `Doctor has no schedule on ${dayName}` });
    }
    const schedule = scheduleRows[0];

    // Check patient doesn't already have an active appointment for this doctor on this date
    const [dupRows] = await conn.execute(
      `SELECT appointment_id FROM appointment
       WHERE patient_id = ? AND doctor_id = ? AND visit_date = ?
         AND status IN ('Active','CheckedIn')`,
      [patientId, doctor_id, visit_date]
    );
    if (dupRows.length > 0) {
      await conn.rollback();
      conn.release();
      return res.status(409).json({ error: 'You already have an active appointment with this doctor on this date' });
    }

    // Count existing active appointments with row-level lock
    const [countRows] = await conn.execute(
      `SELECT COUNT(*) AS cnt FROM appointment
       WHERE doctor_id = ? AND visit_date = ?
         AND status IN ('Active','CheckedIn')
       FOR UPDATE`,
      [doctor_id, visit_date]
    );
    const currentCount = countRows[0].cnt;

    if (currentCount >= schedule.patient_amount) {
      await conn.rollback();
      conn.release();
      return res.status(409).json({ error: 'Queue is full for this doctor on this date' });
    }

    const queueNo = currentCount + 1;

    // Generate QR code — patient_type=0 for Registered
    const { data: qrData, qrDataUrl } = await generateQRCode(
      visit_date, 0, patientId, center_id, doctor_id, queueNo
    );

    const appointmentId = uuidv4();
    await conn.execute(
      `INSERT INTO appointment
         (appointment_id, patient_id, patient_type, doctor_id, center_id, visit_date, queue_no, qr_code_data)
       VALUES (?, ?, 0, ?, ?, ?, ?, ?)`,
      [appointmentId, patientId, doctor_id, center_id, visit_date, queueNo, qrData]
    );

    const [apptRows] = await conn.execute(
      'SELECT * FROM appointment WHERE appointment_id = ?',
      [appointmentId]
    );

    await conn.commit();

    return res.status(201).json({
      appointment: apptRows[0],
      qrCodeDataUrl: qrDataUrl,
      schedule: {
        start_time: schedule.start_time,
        end_time: schedule.end_time
      }
    });
  } catch (err) {
    await conn.rollback();
    console.error('bookAppointment error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    conn.release();
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/patient/appointments
// ─────────────────────────────────────────────────────────────
const getAppointments = async (req, res) => {
  try {
    const { id: patientId } = req.user;
    const result = await db.query(
      `SELECT a.*, d.name AS doctor_name, d.specialty, mc.center_name, mc.location
       FROM appointment a
       JOIN doctor d ON d.doctor_id = a.doctor_id
       JOIN medi_center mc ON mc.center_id = a.center_id
       WHERE a.patient_id = ?
       ORDER BY a.visit_date DESC, a.queue_no ASC`,
      [patientId]
    );
    return res.json({ appointments: result.rows });
  } catch (err) {
    console.error('getAppointments error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ─────────────────────────────────────────────────────────────
// PUT /api/patient/appointments/:id/cancel
// ─────────────────────────────────────────────────────────────
const cancelAppointment = async (req, res) => {
  try {
    const { id: patientId } = req.user;
    const { id } = req.params;

    // Verify ownership and active status before updating
    const existing = await db.query(
      `SELECT * FROM appointment
       WHERE appointment_id = ? AND patient_id = ? AND status IN ('Active','CheckedIn')`,
      [id, patientId]
    );
    if (!existing.rows[0]) {
      return res.status(404).json({ error: 'Active appointment not found' });
    }

    await db.query(
      "UPDATE appointment SET status = 'Cancelled', qr_code_data = NULL WHERE appointment_id = ?",
      [id]
    );

    const updated = await db.query('SELECT * FROM appointment WHERE appointment_id = ?', [id]);
    return res.json({ message: 'Appointment cancelled', appointment: updated.rows[0] });
  } catch (err) {
    console.error('cancelAppointment error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/patient/health-record
// Get or create health record for the patient
// ─────────────────────────────────────────────────────────────
const getHealthRecord = async (req, res) => {
  try {
    const { id: patientId } = req.user;
    let result = await db.query(
      'SELECT * FROM health_record WHERE patient_id = ?',
      [patientId]
    );

    if (!result.rows[0]) {
      // Auto-create
      const hrId = uuidv4();
      await db.query(
        'INSERT INTO health_record (health_record_id, patient_id) VALUES (?, ?)',
        [hrId, patientId]
      );
      result = await db.query('SELECT * FROM health_record WHERE patient_id = ?', [patientId]);
    }

    return res.json({ record: result.rows[0] });
  } catch (err) {
    console.error('getHealthRecord error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ─────────────────────────────────────────────────────────────
// PUT /api/patient/health-record
// Body: { notes?, viewable_by_doctors?, share_cross_center? }
// ─────────────────────────────────────────────────────────────
const updateHealthRecord = async (req, res) => {
  try {
    const { id: patientId } = req.user;
    const { notes, viewable_by_doctors, share_cross_center } = req.body;

    // Ensure record exists first
    const existsRes = await db.query(
      'SELECT health_record_id FROM health_record WHERE patient_id = ?',
      [patientId]
    );
    if (!existsRes.rows[0]) {
      const hrId = uuidv4();
      await db.query(
        'INSERT INTO health_record (health_record_id, patient_id) VALUES (?, ?)',
        [hrId, patientId]
      );
    }

    await db.query(
      `UPDATE health_record
       SET notes               = COALESCE(?, notes),
           viewable_by_doctors = COALESCE(?, viewable_by_doctors),
           share_cross_center  = COALESCE(?, share_cross_center),
           updated_at          = NOW()
       WHERE patient_id = ?`,
      [
        notes !== undefined ? notes : null,
        viewable_by_doctors !== undefined ? viewable_by_doctors : null,
        share_cross_center !== undefined ? share_cross_center : null,
        patientId
      ]
    );

    const updated = await db.query('SELECT * FROM health_record WHERE patient_id = ?', [patientId]);
    return res.json({ record: updated.rows[0] });
  } catch (err) {
    console.error('updateHealthRecord error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/patient/deletion-requests
// Body: { center_id, notes? }
// ─────────────────────────────────────────────────────────────
const requestDeletion = async (req, res) => {
  try {
    const { id: patientId } = req.user;
    const { center_id, notes } = req.body;

    if (!center_id) {
      return res.status(400).json({ error: 'center_id is required' });
    }

    // Verify center exists and is approved
    const centerRes = await db.query(
      "SELECT center_id FROM medi_center WHERE center_id = ? AND approval_status = 'Approved'",
      [center_id]
    );
    if (!centerRes.rows[0]) {
      return res.status(404).json({ error: 'Approved center not found' });
    }

    // Check no existing pending request for this center
    const dupRes = await db.query(
      "SELECT request_id FROM deletion_request WHERE patient_id = ? AND center_id = ? AND status = 'Pending'",
      [patientId, center_id]
    );
    if (dupRes.rows.length > 0) {
      return res.status(409).json({ error: 'A pending deletion request already exists for this center' });
    }

    const requestId = uuidv4();
    await db.query(
      'INSERT INTO deletion_request (request_id, patient_id, center_id, notes) VALUES (?, ?, ?, ?)',
      [requestId, patientId, center_id, notes || null]
    );

    const newRequest = await db.query('SELECT * FROM deletion_request WHERE request_id = ?', [requestId]);

    return res.status(201).json({
      message: 'Deletion request submitted',
      request: newRequest.rows[0]
    });
  } catch (err) {
    console.error('requestDeletion error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/patient/history
// Query: center_id (optional — filter to one center)
// ─────────────────────────────────────────────────────────────
const getVisitHistory = async (req, res) => {
  try {
    const { id: patientId } = req.user;
    const { center_id } = req.query;

    const params = [patientId];
    let filterClause = '';
    if (center_id) {
      params.push(center_id);
      filterClause = ' AND vr.center_id = ?';
    }

    const result = await db.query(
      `SELECT vr.record_id, vr.visit_date, vr.symptoms, vr.diagnosis, vr.created_at,
              d.name AS doctor_name, d.specialty,
              mc.center_name, mc.location
       FROM visit_record vr
       JOIN doctor d ON d.doctor_id = vr.doctor_id
       JOIN medi_center mc ON mc.center_id = vr.center_id
       WHERE vr.patient_id = ?${filterClause}
       ORDER BY vr.visit_date DESC`,
      params
    );

    // Enrich each record with prescriptions, tests, revisit
    const enriched = await Promise.all(result.rows.map(async (record) => {
      const [prescriptions, tests, revisit] = await Promise.all([
        db.query(
          `SELECT pr.*, di.drug_name FROM prescription pr
           LEFT JOIN drug_inventory di ON di.drug_id = pr.drug_id
           WHERE pr.record_id = ?`,
          [record.record_id]
        ),
        db.query('SELECT * FROM test_recommendation WHERE record_id = ?', [record.record_id]),
        db.query('SELECT * FROM revisit WHERE record_id = ?', [record.record_id])
      ]);
      return {
        ...record,
        prescriptions: prescriptions.rows,
        tests: tests.rows,
        revisit: revisit.rows[0] || null
      };
    }));

    return res.json({ records: enriched });
  } catch (err) {
    console.error('getVisitHistory error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  searchCenters,
  bookAppointment,
  getAppointments,
  cancelAppointment,
  getHealthRecord,
  updateHealthRecord,
  requestDeletion,
  getVisitHistory
};
