const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { sendEmail } = require('../utils/email');

const BCRYPT_ROUNDS = 12;
const generateTempPassword = () =>
  Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4).toUpperCase();

// GET /api/sysadmin/dashboard
const getDashboardStats = async (req, res) => {
  try {
    const [r1, r2, r3, r4] = await Promise.all([
      db.query("SELECT COUNT(*) AS cnt FROM medi_center WHERE approval_status = 'Approved'"),
      db.query("SELECT COUNT(*) AS cnt FROM medi_center WHERE approval_status = 'Pending'"),
      db.query("SELECT COUNT(*) AS cnt FROM doctor WHERE approval_status = 'Pending'"),
      db.query('SELECT COUNT(*) AS cnt FROM patient'),
    ]);
    return res.json({
      totalApprovedCenters:       r1.rows[0].cnt,
      pendingCenterRegistrations: r2.rows[0].cnt,
      pendingDoctors:             r3.rows[0].cnt,
      totalPatients:              r4.rows[0].cnt,
    });
  } catch (err) {
    console.error('getDashboardStats:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/sysadmin/centers/pending
const getPendingCenters = async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT * FROM medi_center WHERE approval_status = 'Pending' ORDER BY created_at ASC"
    );
    return res.json(rows);
  } catch (err) {
    console.error('getPendingCenters:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/sysadmin/centers
const getAllCenters = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT mc.*,
              COUNT(DISTINCT d.doctor_id) AS doctor_count,
              COUNT(DISTINCT vr.patient_id) AS patient_count
       FROM medi_center mc
       LEFT JOIN doctor d ON d.center_id = mc.center_id AND d.approval_status = 'Approved'
       LEFT JOIN visit_record vr ON vr.center_id = mc.center_id
       GROUP BY mc.center_id
       ORDER BY mc.created_at DESC`
    );
    return res.json(rows);
  } catch (err) {
    console.error('getAllCenters:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// PUT /api/sysadmin/centers/:id/approve
const approveCenter = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const { id } = req.params;

    const [centerRows] = await conn.execute(
      "SELECT * FROM medi_center WHERE center_id = ? AND approval_status = 'Pending'", [id]
    );
    const center = centerRows[0];
    if (!center) {
      await conn.rollback();
      return res.status(404).json({ error: 'Pending center not found' });
    }

    // 1. Approve center
    await conn.execute(
      "UPDATE medi_center SET approval_status = 'Approved' WHERE center_id = ?", [id]
    );

    // 2. Create MediCenterAdmin account
    const adminTempPwd = generateTempPassword();
    const adminHash    = await bcrypt.hash(adminTempPwd, BCRYPT_ROUNDS);
    const adminId      = uuidv4();
    await conn.execute(
      "INSERT INTO admin_user (admin_id, email, password_hash, role, center_id) VALUES (?, ?, ?, 'MediCenterAdmin', ?)",
      [adminId, center.email, adminHash, id]
    );

    // 3. Create registered doctor account
    const docTempPwd  = generateTempPassword();
    const docHash     = await bcrypt.hash(docTempPwd, BCRYPT_ROUNDS);
    const doctorId    = uuidv4();
    const doctorEmail = `doctor.${center.registered_doctor_slmc}@${center.email.split('@')[1]}`;

    // Check if SLMC already exists (re-registration scenario)
    const [existDoc] = await conn.execute('SELECT doctor_id FROM doctor WHERE slmc_number = ?', [center.registered_doctor_slmc]);
    if (existDoc.length > 0) {
      await conn.execute(
        "UPDATE doctor SET center_id = ?, approval_status = 'Approved', is_registered_doctor = 1, password_hash = ? WHERE slmc_number = ?",
        [id, docHash, center.registered_doctor_slmc]
      );
    } else {
      await conn.execute(
        `INSERT INTO doctor (doctor_id, name, specialty, slmc_number, email, password_hash, center_id, approval_status, is_registered_doctor)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'Approved', 1)`,
        [doctorId, center.registered_doctor_name, center.registered_doctor_specialty,
         center.registered_doctor_slmc, doctorEmail, docHash, id]
      );
    }

    await conn.commit();

    // 4. Send emails (non-critical)
    await Promise.allSettled([
      sendEmail(center.email, 'MCNMS - Center Approved',
        `<h2>Welcome to MCNMS!</h2><p>Your MediCenter <strong>${center.center_name}</strong> has been approved.</p>
         <p><strong>Admin Login:</strong> ${center.email}</p>
         <p><strong>Temporary Password:</strong> ${adminTempPwd}</p>
         <p>Please change your password after first login.</p>`),
      sendEmail(doctorEmail, 'MCNMS - Doctor Account Created',
        `<h2>Welcome Dr. ${center.registered_doctor_name}!</h2>
         <p>Your doctor account has been created for <strong>${center.center_name}</strong>.</p>
         <p><strong>Login Email:</strong> ${doctorEmail}</p>
         <p><strong>Temporary Password:</strong> ${docTempPwd}</p>`),
    ]);

    return res.json({
      message: 'Center approved successfully',
      credentials: {
        centerName:      center.center_name,
        adminEmail:      center.email,
        adminPassword:   adminTempPwd,
        doctorName:      center.registered_doctor_name,
        doctorEmail,
        doctorPassword:  docTempPwd,
      }
    });
  } catch (err) {
    await conn.rollback();
    console.error('approveCenter:', err);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    conn.release();
  }
};

// PUT /api/sysadmin/centers/:id/reject
const rejectCenter = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ error: 'Rejection reason is required' });

    const { rows: before } = await db.query(
      "SELECT * FROM medi_center WHERE center_id = ? AND approval_status = 'Pending'", [id]
    );
    if (!before[0]) return res.status(404).json({ error: 'Pending center not found' });

    await db.query(
      "UPDATE medi_center SET approval_status = 'Rejected', rejection_reason = ? WHERE center_id = ?",
      [reason, id]
    );
    const center = before[0];
    await sendEmail(center.email, 'MCNMS - Registration Rejected',
      `<p>Your center <strong>${center.center_name}</strong> was rejected.</p><p><strong>Reason:</strong> ${reason}</p>`);
    return res.json({ message: 'Center rejected', center });
  } catch (err) {
    console.error('rejectCenter:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// PUT /api/sysadmin/centers/:id
const updateCenter = async (req, res) => {
  try {
    const { id } = req.params;
    const { center_name, location, latitude, longitude } = req.body;
    await db.query(
      `UPDATE medi_center
       SET center_name = COALESCE(?, center_name),
           location    = COALESCE(?, location),
           latitude    = COALESCE(?, latitude),
           longitude   = COALESCE(?, longitude)
       WHERE center_id = ?`,
      [center_name || null, location || null, latitude || null, longitude || null, id]
    );
    const { rows } = await db.query('SELECT * FROM medi_center WHERE center_id = ?', [id]);
    if (!rows[0]) return res.status(404).json({ error: 'Center not found' });
    return res.json(rows[0]);
  } catch (err) {
    console.error('updateCenter:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// PUT /api/sysadmin/centers/:id/deactivate
const deactivateCenter = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("UPDATE medi_center SET approval_status = 'Deactivated' WHERE center_id = ?", [id]);
    const { rows } = await db.query('SELECT * FROM medi_center WHERE center_id = ?', [id]);
    return res.json({ message: 'Center deactivated', center: rows[0] });
  } catch (err) {
    console.error('deactivateCenter:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/sysadmin/doctors/pending
const getPendingDoctors = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT d.*, mc.center_name FROM doctor d
       JOIN medi_center mc ON mc.center_id = d.center_id
       WHERE d.approval_status = 'Pending' ORDER BY d.created_at ASC`
    );
    return res.json(rows);
  } catch (err) {
    console.error('getPendingDoctors:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// PUT /api/sysadmin/doctors/:id/approve
const approveDoctor = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const { id } = req.params;

    const [doctorRows] = await conn.execute(
      "SELECT * FROM doctor WHERE doctor_id = ? AND approval_status = 'Pending'", [id]
    );
    const doctor = doctorRows[0];
    if (!doctor) {
      await conn.rollback();
      return res.status(404).json({ error: 'Pending doctor not found' });
    }

    const tempPwd = generateTempPassword();
    const hash    = await bcrypt.hash(tempPwd, BCRYPT_ROUNDS);

    await conn.execute(
      "UPDATE doctor SET approval_status = 'Approved', password_hash = ? WHERE doctor_id = ?",
      [hash, id]
    );
    await conn.commit();

    await Promise.allSettled([
      sendEmail(doctor.email, 'MCNMS - Doctor Account Approved',
        `<h2>Welcome Dr. ${doctor.name}!</h2>
         <p><strong>Login Email:</strong> ${doctor.email}</p>
         <p><strong>Temporary Password:</strong> ${tempPwd}</p>`),
    ]);

    const { rows: centerRows } = await db.query('SELECT email FROM medi_center WHERE center_id = ?', [doctor.center_id]);
    if (centerRows[0]) {
      await sendEmail(centerRows[0].email, 'MCNMS - Doctor Request Approved',
        `<p>Dr. <strong>${doctor.name}</strong>'s request has been approved.</p>`);
    }

    return res.json({ message: 'Doctor approved successfully' });
  } catch (err) {
    await conn.rollback();
    console.error('approveDoctor:', err);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    conn.release();
  }
};

// PUT /api/sysadmin/doctors/:id/reject
const rejectDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ error: 'Rejection reason is required' });

    const { rows: before } = await db.query(
      "SELECT * FROM doctor WHERE doctor_id = ? AND approval_status = 'Pending'", [id]
    );
    if (!before[0]) return res.status(404).json({ error: 'Pending doctor not found' });

    await db.query(
      "UPDATE doctor SET approval_status = 'Rejected', rejection_reason = ? WHERE doctor_id = ?",
      [reason, id]
    );
    const doctor = before[0];
    const { rows: cr } = await db.query('SELECT email, center_name FROM medi_center WHERE center_id = ?', [doctor.center_id]);
    if (cr[0]) {
      await sendEmail(cr[0].email, 'MCNMS - Doctor Request Rejected',
        `<p>Request for Dr. <strong>${doctor.name}</strong> rejected.</p><p><strong>Reason:</strong> ${reason}</p>`);
    }
    return res.json({ message: 'Doctor rejected', doctor });
  } catch (err) {
    console.error('rejectDoctor:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getDashboardStats, getPendingCenters, getAllCenters,
  approveCenter, rejectCenter, updateCenter, deactivateCenter,
  getPendingDoctors, approveDoctor, rejectDoctor
};
