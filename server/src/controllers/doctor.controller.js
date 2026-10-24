const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { parseQRCode } = require('../utils/qrcode');

// ─────────────────────────────────────────────────────────────
// GET /api/doctor/dashboard
// ─────────────────────────────────────────────────────────────
const getDashboard = async (req, res) => {
  try {
    const { id: doctorId, centerId } = req.user;
    const today = new Date().toISOString().split('T')[0];

    const [centerRes, doctorRes, todayQueueRes, doneRes, checkedInRes] = await Promise.all([
      db.query('SELECT center_name, location FROM medi_center WHERE center_id = ?', [centerId]),
      db.query('SELECT name, specialty, slmc_number, email FROM doctor WHERE doctor_id = ?', [doctorId]),
      db.query(
        `SELECT COUNT(*) AS cnt FROM appointment
         WHERE doctor_id = ? AND visit_date = ? AND status IN ('Active','CheckedIn')`,
        [doctorId, today]
      ),
      db.query(
        `SELECT COUNT(*) AS cnt FROM appointment
         WHERE doctor_id = ? AND visit_date = ? AND status = 'Done'`,
        [doctorId, today]
      ),
      db.query(
        `SELECT COUNT(*) AS cnt FROM appointment
         WHERE doctor_id = ? AND visit_date = ? AND status = 'CheckedIn'`,
        [doctorId, today]
      )
    ]);

    const total = todayQueueRes.rows[0].cnt + doneRes.rows[0].cnt;
    const done = doneRes.rows[0].cnt;
    const checkedIn = checkedInRes.rows[0].cnt;
    const remaining = todayQueueRes.rows[0].cnt;

    // Fetch today's queue list
    const queueRes = await db.query(
      `SELECT a.*, p.name AS patient_name, p.phone, p.patient_type AS patient_type_str
       FROM appointment a
       JOIN patient p ON p.patient_id = a.patient_id
       WHERE a.doctor_id = ? AND a.visit_date = ?
       ORDER BY a.queue_no ASC`,
      [doctorId, today]
    );

    return res.json({
      center: centerRes.rows[0],
      doctor: doctorRes.rows[0],
      stats: { total, checkedIn, done, remaining },
      todayQueue: queueRes.rows
    });
  } catch (err) {
    console.error('getDashboard error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/doctor/queue
// Query params: date (optional, defaults to today)
// ─────────────────────────────────────────────────────────────
const getQueue = async (req, res) => {
  try {
    const { id: doctorId } = req.user;
    const date = req.query.date || new Date().toISOString().split('T')[0];

    const result = await db.query(
      `SELECT a.*, p.name AS patient_name, p.phone, p.patient_type AS patient_type_str
       FROM appointment a
       JOIN patient p ON p.patient_id = a.patient_id
       WHERE a.doctor_id = ? AND a.visit_date = ?
       ORDER BY a.queue_no ASC`,
      [doctorId, date]
    );
    return res.json({ queue: result.rows });
  } catch (err) {
    console.error('getQueue error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/doctor/scan-qr
// Body: { qrData } (or qr_data — both accepted)
// Validates QR, marks appointment as CheckedIn, returns patient info
// ─────────────────────────────────────────────────────────────
const scanQR = async (req, res) => {
  try {
    const { id: doctorId, centerId } = req.user;
    // Accept both camelCase (frontend) and snake_case
    const qr_data = req.body.qrData || req.body.qr_data;

    if (!qr_data) {
      return res.status(400).json({ error: 'qrData is required' });
    }

    let parsed;
    try {
      parsed = parseQRCode(qr_data);
    } catch {
      return res.status(400).json({ error: 'Invalid QR code format' });
    }

    const today = new Date().toISOString().split('T')[0];

    // Validate date is today
    if (parsed.visitDate !== today) {
      return res.status(400).json({ error: 'QR code is not valid for today' });
    }

    // Validate doctor and center match
    if (parsed.doctorId !== doctorId || parsed.centerId !== centerId) {
      return res.status(403).json({ error: 'QR code does not match your clinic' });
    }

    // Find the appointment
    const apptRes = await db.query(
      `SELECT * FROM appointment
       WHERE patient_id = ? AND doctor_id = ? AND center_id = ?
         AND visit_date = ? AND queue_no = ?`,
      [parsed.patientId, parsed.doctorId, parsed.centerId, parsed.visitDate, parsed.queueNo]
    );
    const appt = apptRes.rows[0];
    if (!appt) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    if (appt.status === 'Cancelled') {
      return res.status(400).json({ error: 'This appointment has been cancelled' });
    }
    if (appt.status === 'Done') {
      return res.status(400).json({ error: 'This appointment is already completed' });
    }
    if (appt.status === 'Skipped') {
      return res.status(400).json({ error: 'This appointment was skipped' });
    }

    // Mark as CheckedIn
    await db.query(
      "UPDATE appointment SET status = 'CheckedIn' WHERE appointment_id = ?",
      [appt.appointment_id]
    );

    // Fetch patient info
    const patientRes = await db.query(
      `SELECT p.patient_id, p.name, p.email, p.phone, p.date_of_birth, p.patient_type,
              hr.notes AS health_notes, hr.viewable_by_doctors
       FROM patient p
       LEFT JOIN health_record hr ON hr.patient_id = p.patient_id
       WHERE p.patient_id = ?`,
      [parsed.patientId]
    );

    const patient = patientRes.rows[0];

    // Return health record notes only if viewable_by_doctors is true
    let healthRecord = null;
    if (patient && patient.viewable_by_doctors) {
      healthRecord = { notes: patient.health_notes };
    }

    // Recent visit history at THIS center (last 5)
    const historyRes = await db.query(
      `SELECT vr.record_id, vr.visit_date, vr.symptoms, vr.diagnosis, d.name AS doctor_name
       FROM visit_record vr
       JOIN doctor d ON d.doctor_id = vr.doctor_id
       WHERE vr.patient_id = ? AND vr.center_id = ?
       ORDER BY vr.visit_date DESC
       LIMIT 5`,
      [parsed.patientId, centerId]
    );

    return res.json({
      appointment: { ...appt, status: 'CheckedIn' },
      patient: {
        patient_id: patient.patient_id,
        name: patient.name,
        email: patient.email,
        phone: patient.phone,
        date_of_birth: patient.date_of_birth,
        patient_type: patient.patient_type
      },
      healthRecord,
      recentHistory: historyRes.rows
    });
  } catch (err) {
    console.error('scanQR error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/doctor/patients/:patientId/history
// Returns visit history at THIS center
// ─────────────────────────────────────────────────────────────
const getPatientHistory = async (req, res) => {
  try {
    const { centerId } = req.user;
    const { patientId } = req.params;

    const records = await db.query(
      `SELECT vr.*, d.name AS doctor_name, d.specialty
       FROM visit_record vr
       JOIN doctor d ON d.doctor_id = vr.doctor_id
       WHERE vr.patient_id = ? AND vr.center_id = ?
       ORDER BY vr.visit_date DESC`,
      [patientId, centerId]
    );

    // Attach prescriptions, tests, revisits to each record
    const enriched = await Promise.all(records.rows.map(async (record) => {
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
    console.error('getPatientHistory error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/doctor/patients/:patientId/cross-center-history
// Returns ALL visit records if patient has share_cross_center=true
// ─────────────────────────────────────────────────────────────
const getCrossCenterHistory = async (req, res) => {
  try {
    const { patientId } = req.params;

    // Check if patient allows cross-center sharing
    const hrRes = await db.query(
      'SELECT share_cross_center FROM health_record WHERE patient_id = ?',
      [patientId]
    );
    if (!hrRes.rows[0] || !hrRes.rows[0].share_cross_center) {
      return res.status(403).json({ error: 'Patient has not enabled cross-center history sharing' });
    }

    const records = await db.query(
      `SELECT vr.*, d.name AS doctor_name, d.specialty, mc.center_name
       FROM visit_record vr
       JOIN doctor d ON d.doctor_id = vr.doctor_id
       JOIN medi_center mc ON mc.center_id = vr.center_id
       WHERE vr.patient_id = ?
       ORDER BY vr.visit_date DESC`,
      [patientId]
    );

    const enriched = await Promise.all(records.rows.map(async (record) => {
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
    console.error('getCrossCenterHistory error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/doctor/inventory
// Returns only in-stock drugs at this center
// ─────────────────────────────────────────────────────────────
const getDrugInventory = async (req, res) => {
  try {
    const { centerId } = req.user;
    const result = await db.query(
      `SELECT drug_id, drug_name, drug_type, dosage_unit, quantity
       FROM drug_inventory
       WHERE center_id = ? AND quantity > 0
       ORDER BY drug_name`,
      [centerId]
    );
    return res.json({ drugs: result.rows });
  } catch (err) {
    console.error('getDrugInventory error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/doctor/consultation
// Saves a full consultation record within a transaction
// Body: {
//   patient_id, appointment_id?,
//   visit_date, symptoms, diagnosis,
//   prescriptions: [{ drug_id?, external_drug_name?, drug_type, times_per_day,
//                     dosage_per_time, dosage_unit, number_of_days, is_external }],
//   tests: [{ test_name, notes? }],
//   revisit?: { revisit_date, notes? }
// }
// ─────────────────────────────────────────────────────────────
const saveConsultation = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const { id: doctorId, centerId } = req.user;
    const {
      patient_id,
      appointment_id,
      visit_date,
      symptoms,
      diagnosis,
      prescriptions = [],
      tests = [],
      revisit
    } = req.body;

    if (!patient_id || !visit_date) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ error: 'patient_id and visit_date are required' });
    }

    // Verify appointment belongs to this doctor if provided
    if (appointment_id) {
      const [apptRows] = await conn.execute(
        "SELECT * FROM appointment WHERE appointment_id = ? AND doctor_id = ? AND status = 'CheckedIn'",
        [appointment_id, doctorId]
      );
      if (!apptRows[0]) {
        await conn.rollback();
        conn.release();
        return res.status(400).json({ error: 'Appointment not found or not in CheckedIn status' });
      }
    }

    // 1. Create visit record
    const recordId = uuidv4();
    await conn.execute(
      `INSERT INTO visit_record
         (record_id, patient_id, doctor_id, center_id, appointment_id, visit_date, symptoms, diagnosis)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [recordId, patient_id, doctorId, centerId, appointment_id || null, visit_date, symptoms || null, diagnosis || null]
    );

    // 2. Save prescriptions and reduce stock for internal drugs
    for (const rx of prescriptions) {
      if (!rx.is_external && rx.drug_id) {
        // Calculate total dosage to dispense: dosage_per_time * times_per_day * number_of_days
        const totalQty = parseFloat(rx.dosage_per_time) * parseInt(rx.times_per_day) * parseInt(rx.number_of_days);

        // Lock the drug row and verify sufficient stock
        const [drugRows] = await conn.execute(
          'SELECT quantity FROM drug_inventory WHERE drug_id = ? AND center_id = ? FOR UPDATE',
          [rx.drug_id, centerId]
        );
        if (!drugRows[0]) {
          await conn.rollback();
          conn.release();
          return res.status(404).json({ error: `Drug ${rx.drug_id} not found in your inventory` });
        }
        if (parseFloat(drugRows[0].quantity) < totalQty) {
          await conn.rollback();
          conn.release();
          return res.status(400).json({
            error: `Insufficient stock for drug ${rx.drug_id}. Available: ${drugRows[0].quantity}`
          });
        }

        // Reduce stock
        await conn.execute(
          'UPDATE drug_inventory SET quantity = quantity - ?, updated_at = NOW() WHERE drug_id = ?',
          [totalQty, rx.drug_id]
        );

        // Log the reduction
        const logId = uuidv4();
        await conn.execute(
          `INSERT INTO drug_inventory_log (log_id, drug_id, change_type, quantity_changed, notes, changed_by)
           VALUES (?, ?, 'Reduction', ?, ?, ?)`,
          [logId, rx.drug_id, totalQty, `Dispensed for visit ${recordId}`, doctorId]
        );
      }

      const prescriptionId = uuidv4();
      await conn.execute(
        `INSERT INTO prescription
           (prescription_id, record_id, drug_id, external_drug_name, drug_type, times_per_day,
            dosage_per_time, dosage_unit, number_of_days, is_external)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          prescriptionId,
          recordId,
          rx.is_external ? null : (rx.drug_id || null),
          rx.is_external ? rx.external_drug_name : null,
          rx.drug_type,
          rx.times_per_day,
          rx.dosage_per_time,
          rx.dosage_unit,
          rx.number_of_days,
          rx.is_external ? 1 : 0
        ]
      );
    }

    // 3. Save test recommendations
    for (const test of tests) {
      const testId = uuidv4();
      await conn.execute(
        'INSERT INTO test_recommendation (test_id, record_id, test_name, notes) VALUES (?, ?, ?, ?)',
        [testId, recordId, test.test_name, test.notes || null]
      );
    }

    // 4. Save revisit if provided
    if (revisit && revisit.revisit_date) {
      const revisitId = uuidv4();
      await conn.execute(
        'INSERT INTO revisit (revisit_id, record_id, revisit_date, notes) VALUES (?, ?, ?, ?)',
        [revisitId, recordId, revisit.revisit_date, revisit.notes || null]
      );
    }

    // 5. Mark appointment as Done
    if (appointment_id) {
      await conn.execute(
        "UPDATE appointment SET status = 'Done' WHERE appointment_id = ?",
        [appointment_id]
      );
    }

    // 6. Create notification for MediCenterAdmin
    const notifId = uuidv4();
    await conn.execute(
      'INSERT INTO notification (notification_id, center_id, record_id, doctor_id) VALUES (?, ?, ?, ?)',
      [notifId, centerId, recordId, doctorId]
    );

    await conn.commit();

    return res.status(201).json({
      message: 'Consultation saved successfully',
      record_id: recordId
    });
  } catch (err) {
    await conn.rollback();
    console.error('saveConsultation error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    conn.release();
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/doctor/schedules
// ─────────────────────────────────────────────────────────────
const getMySchedules = async (req, res) => {
  try {
    const { id: doctorId } = req.user;
    const result = await db.query(
      'SELECT * FROM schedule WHERE doctor_id = ? ORDER BY day_of_week',
      [doctorId]
    );
    return res.json({ schedules: result.rows });
  } catch (err) {
    console.error('getMySchedules error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getDashboard,
  getQueue,
  scanQR,
  getPatientHistory,
  getCrossCenterHistory,
  getDrugInventory,
  saveConsultation,
  getMySchedules
};
