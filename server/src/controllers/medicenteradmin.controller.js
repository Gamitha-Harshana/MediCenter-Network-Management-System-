const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { generateQRCode } = require('../utils/qrcode');

const BCRYPT_ROUNDS = 12;

/**
 * Generate a random temporary password.
 */
const generateTempPassword = () =>
  Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4).toUpperCase();

// ─────────────────────────────────────────────────────────────
// GET /api/admin/dashboard
// ─────────────────────────────────────────────────────────────
const getDashboard = async (req, res) => {
  try {
    const { centerId } = req.user;

    const [centerRes, doctorCount, patientCount, drugCount, unreadCount] = await Promise.all([
      db.query('SELECT * FROM medi_center WHERE center_id = ?', [centerId]),
      db.query(
        "SELECT COUNT(*) AS cnt FROM doctor WHERE center_id = ? AND approval_status = 'Approved'",
        [centerId]
      ),
      db.query(
        `SELECT COUNT(DISTINCT p.patient_id) AS cnt FROM patient p
         JOIN visit_record vr ON vr.patient_id = p.patient_id
         WHERE vr.center_id = ?`,
        [centerId]
      ),
      db.query('SELECT COUNT(*) AS cnt FROM drug_inventory WHERE center_id = ?', [centerId]),
      db.query(
        "SELECT COUNT(*) AS cnt FROM notification WHERE center_id = ? AND status = 'Unread'",
        [centerId]
      )
    ]);

    return res.json({
      center: centerRes.rows[0],
      stats: {
        doctors: doctorCount.rows[0].cnt,
        patients: patientCount.rows[0].cnt,
        drugs: drugCount.rows[0].cnt,
        unreadNotifications: unreadCount.rows[0].cnt
      }
    });
  } catch (err) {
    console.error('getDashboard error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/admin/doctors
// Body: { name, specialty, slmc_number, email }
// ─────────────────────────────────────────────────────────────
const requestDoctor = async (req, res) => {
  try {
    const { centerId } = req.user;
    const { name, specialty, slmc_number, email } = req.body;

    if (!name || !specialty || !slmc_number || !email) {
      return res.status(400).json({ error: 'name, specialty, slmc_number, email are required' });
    }

    // Check duplicate SLMC
    const dupSlmc = await db.query(
      'SELECT doctor_id FROM doctor WHERE slmc_number = ?',
      [slmc_number.trim()]
    );
    if (dupSlmc.rows.length > 0) {
      return res.status(409).json({ error: 'A doctor with this SLMC number already exists' });
    }

    // Check duplicate email
    const dupEmail = await db.query(
      'SELECT doctor_id FROM doctor WHERE email = ?',
      [email.toLowerCase().trim()]
    );
    if (dupEmail.rows.length > 0) {
      return res.status(409).json({ error: 'A doctor with this email already exists' });
    }

    const doctorId = uuidv4();
    await db.query(
      `INSERT INTO doctor (doctor_id, name, specialty, slmc_number, email, center_id, approval_status)
       VALUES (?, ?, ?, ?, ?, ?, 'Pending')`,
      [doctorId, name.trim(), specialty.trim(), slmc_number.trim(), email.toLowerCase().trim(), centerId]
    );

    const newDoctor = await db.query('SELECT * FROM doctor WHERE doctor_id = ?', [doctorId]);

    return res.status(201).json({
      message: 'Doctor request submitted. Awaiting SysAdmin approval.',
      doctor: newDoctor.rows[0]
    });
  } catch (err) {
    console.error('requestDoctor error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/admin/doctors
// ─────────────────────────────────────────────────────────────
const getDoctors = async (req, res) => {
  try {
    const { centerId } = req.user;
    const result = await db.query(
      `SELECT doctor_id, name, specialty, slmc_number, email,
              approval_status, is_registered_doctor, created_at
       FROM doctor
       WHERE center_id = ?
       ORDER BY created_at DESC`,
      [centerId]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('getDoctors error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ─────────────────────────────────────────────────────────────
// PUT /api/admin/doctors/:id/deactivate
// ─────────────────────────────────────────────────────────────
const deactivateDoctor = async (req, res) => {
  try {
    const { centerId } = req.user;
    const { id } = req.params;

    const result = await db.query(
      `UPDATE doctor
       SET approval_status = 'Deactivated'
       WHERE doctor_id = ? AND center_id = ?`,
      [id, centerId]
    );
    if (result.rows.affectedRows === 0) {
      return res.status(404).json({ error: 'Doctor not found in your center' });
    }
    const updated = await db.query('SELECT * FROM doctor WHERE doctor_id = ?', [id]);
    return res.json({ message: 'Doctor deactivated', doctor: updated.rows[0] });
  } catch (err) {
    console.error('deactivateDoctor error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/admin/schedules
// ─────────────────────────────────────────────────────────────
const getSchedules = async (req, res) => {
  try {
    const { centerId } = req.user;
    const result = await db.query(
      `SELECT s.*, d.name AS doctor_name, d.specialty
       FROM schedule s
       JOIN doctor d ON d.doctor_id = s.doctor_id
       WHERE d.center_id = ?
       ORDER BY d.name, s.day_of_week`,
      [centerId]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('getSchedules error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/admin/schedules
// Body: { doctor_id, day_of_week, start_time, end_time, patient_amount }
// ─────────────────────────────────────────────────────────────
const createSchedule = async (req, res) => {
  try {
    const { centerId } = req.user;
    const { doctor_id, day_of_week, start_time, end_time, patient_amount } = req.body;

    if (!doctor_id || !day_of_week || !start_time || !end_time) {
      return res.status(400).json({ error: 'doctor_id, day_of_week, start_time, end_time are required' });
    }

    // Verify the doctor belongs to this center
    const doctorRes = await db.query(
      "SELECT doctor_id FROM doctor WHERE doctor_id = ? AND center_id = ? AND approval_status = 'Approved'",
      [doctor_id, centerId]
    );
    if (!doctorRes.rows[0]) {
      return res.status(404).json({ error: 'Approved doctor not found in your center' });
    }

    const scheduleId = uuidv4();
    await db.query(
      `INSERT INTO schedule (schedule_id, doctor_id, day_of_week, start_time, end_time, patient_amount)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [scheduleId, doctor_id, day_of_week, start_time, end_time, patient_amount || 25]
    );

    const newSchedule = await db.query('SELECT * FROM schedule WHERE schedule_id = ?', [scheduleId]);
    return res.status(201).json(newSchedule.rows[0]);
  } catch (err) {
    console.error('createSchedule error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ─────────────────────────────────────────────────────────────
// PUT /api/admin/schedules/:id
// Body: { day_of_week?, start_time?, end_time?, patient_amount?, is_active? }
// ─────────────────────────────────────────────────────────────
const updateSchedule = async (req, res) => {
  try {
    const { centerId } = req.user;
    const { id } = req.params;
    const { day_of_week, start_time, end_time, patient_amount, is_active } = req.body;

    // Verify schedule belongs to this center's doctor
    const check = await db.query(
      `SELECT s.schedule_id FROM schedule s
       JOIN doctor d ON d.doctor_id = s.doctor_id
       WHERE s.schedule_id = ? AND d.center_id = ?`,
      [id, centerId]
    );
    if (!check.rows[0]) {
      return res.status(404).json({ error: 'Schedule not found in your center' });
    }

    await db.query(
      `UPDATE schedule
       SET day_of_week    = COALESCE(?, day_of_week),
           start_time     = COALESCE(?, start_time),
           end_time       = COALESCE(?, end_time),
           patient_amount = COALESCE(?, patient_amount),
           is_active      = COALESCE(?, is_active)
       WHERE schedule_id = ?`,
      [
        day_of_week || null, start_time || null, end_time || null,
        patient_amount !== undefined ? patient_amount : null,
        is_active !== undefined ? is_active : null,
        id
      ]
    );

    const updated = await db.query('SELECT * FROM schedule WHERE schedule_id = ?', [id]);
    return res.json(updated.rows[0]);
  } catch (err) {
    console.error('updateSchedule error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ─────────────────────────────────────────────────────────────
// DELETE /api/admin/schedules/:id
// ─────────────────────────────────────────────────────────────
const deleteSchedule = async (req, res) => {
  try {
    const { centerId } = req.user;
    const { id } = req.params;

    // Verify ownership first
    const check = await db.query(
      `SELECT s.schedule_id FROM schedule s
       JOIN doctor d ON d.doctor_id = s.doctor_id
       WHERE s.schedule_id = ? AND d.center_id = ?`,
      [id, centerId]
    );
    if (!check.rows[0]) {
      return res.status(404).json({ error: 'Schedule not found in your center' });
    }

    await db.query('DELETE FROM schedule WHERE schedule_id = ?', [id]);
    return res.json({ message: 'Schedule deleted' });
  } catch (err) {
    console.error('deleteSchedule error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/admin/patients/temporary
// Body: { name, phone, date_of_birth? }
// ─────────────────────────────────────────────────────────────
const createTemporaryPatient = async (req, res) => {
  try {
    const { centerId } = req.user;
    const { name, phone, date_of_birth } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Patient name is required' });
    }

    const patientId = uuidv4();
    await db.query(
      `INSERT INTO patient (patient_id, name, phone, date_of_birth, patient_type, center_id)
       VALUES (?, ?, ?, ?, 'Temporary', ?)`,
      [patientId, name.trim(), phone || null, date_of_birth || null, centerId]
    );

    const newPatient = await db.query('SELECT * FROM patient WHERE patient_id = ?', [patientId]);
    return res.status(201).json(newPatient.rows[0]);
  } catch (err) {
    console.error('createTemporaryPatient error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/admin/patients
// ─────────────────────────────────────────────────────────────
const getPatients = async (req, res) => {
  try {
    const { centerId } = req.user;

    // Patients who have visited this center OR are temporary patients of this center
    const result = await db.query(
      `SELECT DISTINCT p.patient_id, p.name, p.email, p.phone,
                       p.date_of_birth, p.patient_type, p.created_at
       FROM patient p
       LEFT JOIN visit_record vr ON vr.patient_id = p.patient_id AND vr.center_id = ?
       WHERE vr.patient_id IS NOT NULL
          OR (p.patient_type = 'Temporary' AND p.center_id = ?)
       ORDER BY p.name`,
      [centerId, centerId]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('getPatients error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/admin/inventory
// ─────────────────────────────────────────────────────────────
const getDrugInventory = async (req, res) => {
  try {
    const { centerId } = req.user;
    const result = await db.query(
      'SELECT * FROM drug_inventory WHERE center_id = ? ORDER BY drug_name',
      [centerId]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('getDrugInventory error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/admin/inventory
// Body: { drug_name, drug_type, dosage_unit, quantity }
// ─────────────────────────────────────────────────────────────
const addDrug = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const { centerId, id: adminId } = req.user;
    const { drug_name, drug_type, dosage_unit, quantity } = req.body;

    if (!drug_name || !drug_type || !dosage_unit) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ error: 'drug_name, drug_type, dosage_unit are required' });
    }

    const qty = parseFloat(quantity) || 0;
    const drugId = uuidv4();

    // Upsert: add to existing stock if same drug exists in center
    // MySQL ON DUPLICATE KEY UPDATE requires a unique key on (center_id, drug_name)
    await conn.execute(
      `INSERT INTO drug_inventory (drug_id, center_id, drug_name, drug_type, dosage_unit, quantity)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         quantity   = quantity + VALUES(quantity),
         updated_at = NOW()`,
      [drugId, centerId, drug_name.trim(), drug_type, dosage_unit.trim(), qty]
    );

    // Fetch the actual record (may have been the updated existing row)
    const [drugRows] = await conn.execute(
      'SELECT * FROM drug_inventory WHERE center_id = ? AND drug_name = ?',
      [centerId, drug_name.trim()]
    );
    const drug = drugRows[0];

    // Log the addition
    if (qty > 0) {
      const logId = uuidv4();
      await conn.execute(
        `INSERT INTO drug_inventory_log (log_id, drug_id, change_type, quantity_changed, notes, changed_by)
         VALUES (?, ?, 'Addition', ?, 'Initial stock / manual addition', ?)`,
        [logId, drug.drug_id, qty, adminId]
      );
    }

    await conn.commit();
    return res.status(201).json(drug);
  } catch (err) {
    await conn.rollback();
    console.error('addDrug error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    conn.release();
  }
};

// ─────────────────────────────────────────────────────────────
// PUT /api/admin/inventory/:id
// Body: { drug_name?, drug_type?, dosage_unit?, quantity?, change_type?, notes? }
// ─────────────────────────────────────────────────────────────
const updateDrug = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const { centerId, id: adminId } = req.user;
    const { id } = req.params;
    const { drug_name, drug_type, dosage_unit, quantity, change_type, notes } = req.body;

    // Verify drug belongs to this center
    const [drugRows] = await conn.execute(
      'SELECT * FROM drug_inventory WHERE drug_id = ? AND center_id = ?',
      [id, centerId]
    );
    if (!drugRows[0]) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ error: 'Drug not found in your center' });
    }

    let newQuantity = parseFloat(drugRows[0].quantity);

    if (quantity !== undefined && change_type) {
      const qty = parseFloat(quantity);
      if (change_type === 'Addition') {
        newQuantity = newQuantity + qty;
      } else if (change_type === 'Reduction') {
        newQuantity = newQuantity - qty;
        if (newQuantity < 0) {
          await conn.rollback();
          conn.release();
          return res.status(400).json({ error: 'Insufficient stock' });
        }
      } else if (change_type === 'Correction') {
        newQuantity = qty;
      }

      const logId = uuidv4();
      await conn.execute(
        `INSERT INTO drug_inventory_log (log_id, drug_id, change_type, quantity_changed, notes, changed_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [logId, id, change_type, qty, notes || null, adminId]
      );
    }

    await conn.execute(
      `UPDATE drug_inventory
       SET drug_name   = COALESCE(?, drug_name),
           drug_type   = COALESCE(?, drug_type),
           dosage_unit = COALESCE(?, dosage_unit),
           quantity    = ?,
           updated_at  = NOW()
       WHERE drug_id = ?`,
      [drug_name || null, drug_type || null, dosage_unit || null, newQuantity, id]
    );

    const [updatedRows] = await conn.execute('SELECT * FROM drug_inventory WHERE drug_id = ?', [id]);

    await conn.commit();
    return res.json(updatedRows[0]);
  } catch (err) {
    await conn.rollback();
    console.error('updateDrug error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    conn.release();
  }
};

// ─────────────────────────────────────────────────────────────
// DELETE /api/admin/inventory/:id
// ─────────────────────────────────────────────────────────────
const removeDrug = async (req, res) => {
  try {
    const { centerId } = req.user;
    const { id } = req.params;

    // Fetch before delete to return name
    const existing = await db.query(
      'SELECT drug_id, drug_name FROM drug_inventory WHERE drug_id = ? AND center_id = ?',
      [id, centerId]
    );
    if (!existing.rows[0]) {
      return res.status(404).json({ error: 'Drug not found in your center' });
    }

    await db.query('DELETE FROM drug_inventory WHERE drug_id = ? AND center_id = ?', [id, centerId]);
    return res.json({ message: 'Drug removed', drug: existing.rows[0] });
  } catch (err) {
    console.error('removeDrug error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/admin/inventory/log
// ─────────────────────────────────────────────────────────────
const getInventoryLog = async (req, res) => {
  try {
    const { centerId } = req.user;
    const result = await db.query(
      `SELECT dl.*, di.drug_name, di.drug_type
       FROM drug_inventory_log dl
       JOIN drug_inventory di ON di.drug_id = dl.drug_id
       WHERE di.center_id = ?
       ORDER BY dl.changed_at DESC
       LIMIT 200`,
      [centerId]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('getInventoryLog error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/admin/deletion-requests
// ─────────────────────────────────────────────────────────────
const getDeletionRequests = async (req, res) => {
  try {
    const { centerId } = req.user;
    const result = await db.query(
      `SELECT dr.*, p.name AS patient_name, p.email AS patient_email, p.patient_type
       FROM deletion_request dr
       JOIN patient p ON p.patient_id = dr.patient_id
       WHERE dr.center_id = ? AND dr.status = 'Pending'
       ORDER BY dr.created_at DESC`,
      [centerId]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('getDeletionRequests error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ─────────────────────────────────────────────────────────────
// PUT /api/admin/deletion-requests/:id
// Body: { action: 'Completed'|'Rejected', notes? }
// ─────────────────────────────────────────────────────────────
const actionDeletionRequest = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const { centerId } = req.user;
    const { id } = req.params;
    const { action, notes } = req.body;

    if (!['Completed', 'Rejected'].includes(action)) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ error: 'action must be Completed or Rejected' });
    }

    const [reqRows] = await conn.execute(
      "SELECT * FROM deletion_request WHERE request_id = ? AND center_id = ? AND status = 'Pending'",
      [id, centerId]
    );
    if (!reqRows[0]) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ error: 'Pending deletion request not found' });
    }

    const delReq = reqRows[0];

    await conn.execute(
      `UPDATE deletion_request
       SET status = ?, notes = ?, actioned_at = NOW()
       WHERE request_id = ?`,
      [action, notes || null, id]
    );

    if (action === 'Completed') {
      // Remove all visit_records for this patient at this center
      await conn.execute(
        'DELETE FROM visit_record WHERE patient_id = ? AND center_id = ?',
        [delReq.patient_id, centerId]
      );
      // Cancel future appointments
      await conn.execute(
        `UPDATE appointment SET status = 'Cancelled'
         WHERE patient_id = ? AND center_id = ? AND status IN ('Active','CheckedIn')`,
        [delReq.patient_id, centerId]
      );
    }

    await conn.commit();
    return res.json({ message: `Deletion request ${action.toLowerCase()}` });
  } catch (err) {
    await conn.rollback();
    console.error('actionDeletionRequest error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    conn.release();
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/admin/notifications
// ─────────────────────────────────────────────────────────────
const getNotifications = async (req, res) => {
  try {
    const { centerId } = req.user;
    const result = await db.query(
      `SELECT n.*, d.name AS doctor_name, p.name AS patient_name,
              vr.visit_date, vr.diagnosis
       FROM notification n
       JOIN visit_record vr ON vr.record_id = n.record_id
       JOIN doctor d ON d.doctor_id = n.doctor_id
       JOIN patient p ON p.patient_id = vr.patient_id
       WHERE n.center_id = ?
       ORDER BY n.created_at DESC
       LIMIT 100`,
      [centerId]
    );
    return res.json({ notifications: result.rows });
  } catch (err) {
    console.error('getNotifications error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ─────────────────────────────────────────────────────────────
// PUT /api/admin/notifications/:id/read
// ─────────────────────────────────────────────────────────────
const markNotificationRead = async (req, res) => {
  try {
    const { centerId } = req.user;
    const { id } = req.params;

    const result = await db.query(
      `UPDATE notification SET status = 'Read'
       WHERE notification_id = ? AND center_id = ?`,
      [id, centerId]
    );
    if (result.rows.affectedRows === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    return res.json({ message: 'Marked as read' });
  } catch (err) {
    console.error('markNotificationRead error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/admin/notifications/:id/details
// Returns full consultation details for printing
// ─────────────────────────────────────────────────────────────
const getNotificationDetails = async (req, res) => {
  try {
    const { centerId } = req.user;
    const { id } = req.params;

    // Fetch notification and its visit_record
    const notifRes = await db.query(
      `SELECT n.*, vr.*, d.name AS doctor_name, d.specialty,
              p.name AS patient_name, p.date_of_birth, p.phone, p.patient_type
       FROM notification n
       JOIN visit_record vr ON vr.record_id = n.record_id
       JOIN doctor d ON d.doctor_id = n.doctor_id
       JOIN patient p ON p.patient_id = vr.patient_id
       WHERE n.notification_id = ? AND n.center_id = ?`,
      [id, centerId]
    );
    if (!notifRes.rows[0]) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    const record = notifRes.rows[0];
    const recordId = record.record_id;

    // Fetch prescriptions
    const prescriptions = await db.query(
      `SELECT pr.*, di.drug_name
       FROM prescription pr
       LEFT JOIN drug_inventory di ON di.drug_id = pr.drug_id
       WHERE pr.record_id = ?`,
      [recordId]
    );

    // Fetch test recommendations
    const tests = await db.query(
      'SELECT * FROM test_recommendation WHERE record_id = ?',
      [recordId]
    );

    // Fetch revisit
    const revisit = await db.query(
      'SELECT * FROM revisit WHERE record_id = ?',
      [recordId]
    );

    return res.json({
      visit: record,
      prescriptions: prescriptions.rows,
      tests: tests.rows,
      revisit: revisit.rows[0] || null
    });
  } catch (err) {
    console.error('getNotificationDetails error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/admin/patients/temporary/:patientId/appointment
// Body: { doctor_id, visit_date }
// Assigns queue number atomically and generates QR code
// ─────────────────────────────────────────────────────────────
const bookAppointmentForTemp = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const { centerId } = req.user;
    const { patientId } = req.params;
    const { doctor_id, visit_date } = req.body;

    if (!doctor_id || !visit_date) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ error: 'doctor_id and visit_date are required' });
    }

    // Verify patient is temporary and belongs to this center
    const [patientRows] = await conn.execute(
      "SELECT * FROM patient WHERE patient_id = ? AND patient_type = 'Temporary' AND center_id = ?",
      [patientId, centerId]
    );
    if (!patientRows[0]) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ error: 'Temporary patient not found in your center' });
    }

    // Verify doctor belongs to this center
    const [doctorRows] = await conn.execute(
      "SELECT * FROM doctor WHERE doctor_id = ? AND center_id = ? AND approval_status = 'Approved'",
      [doctor_id, centerId]
    );
    if (!doctorRows[0]) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ error: 'Doctor not found in your center' });
    }

    // Get schedule for the visit_date's day of week
    const visitDateObj = new Date(visit_date);
    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const dayName = days[visitDateObj.getUTCDay()];

    const [scheduleRows] = await conn.execute(
      'SELECT * FROM schedule WHERE doctor_id = ? AND day_of_week = ? AND is_active = 1',
      [doctor_id, dayName]
    );
    if (!scheduleRows[0]) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ error: `No active schedule for ${dayName}` });
    }

    const schedule = scheduleRows[0];

    // Count existing active appointments — use FOR UPDATE to lock
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

    // Generate QR code — patient_type=1 for Temporary
    const { data: qrData, qrDataUrl } = await generateQRCode(
      visit_date, 1, patientId, centerId, doctor_id, queueNo
    );

    const appointmentId = uuidv4();
    await conn.execute(
      `INSERT INTO appointment
         (appointment_id, patient_id, patient_type, doctor_id, center_id, visit_date, queue_no, qr_code_data)
       VALUES (?, ?, 1, ?, ?, ?, ?, ?)`,
      [appointmentId, patientId, doctor_id, centerId, visit_date, queueNo, qrData]
    );

    const [apptRows] = await conn.execute(
      'SELECT * FROM appointment WHERE appointment_id = ?',
      [appointmentId]
    );

    await conn.commit();

    return res.status(201).json({
      appointment: apptRows[0],
      qrDataUrl
    });
  } catch (err) {
    await conn.rollback();
    console.error('bookAppointmentForTemp error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    conn.release();
  }
};

module.exports = {
  getDashboard,
  requestDoctor,
  getDoctors,
  deactivateDoctor,
  getSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  createTemporaryPatient,
  getPatients,
  getDrugInventory,
  addDrug,
  updateDrug,
  removeDrug,
  getInventoryLog,
  getDeletionRequests,
  actionDeletionRequest,
  getNotifications,
  markNotificationRead,
  getNotificationDetails,
  bookAppointmentForTemp
};
