const bcrypt = require('bcrypt');
const jwt    = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db     = require('../config/db');

const BCRYPT_ROUNDS = 12;

const signToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });

// ─────────────────────────────────────────────────────────────
// POST /api/auth/login/admin
// ─────────────────────────────────────────────────────────────
const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required' });

    const { rows } = await db.query(
      'SELECT * FROM admin_user WHERE email = ?',
      [email.toLowerCase().trim()]
    );
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    if (user.role === 'MediCenterAdmin' && user.center_id) {
      const { rows: cr } = await db.query(
        'SELECT approval_status FROM medi_center WHERE center_id = ?',
        [user.center_id]
      );
      if (!cr[0] || cr[0].approval_status !== 'Approved')
        return res.status(403).json({ error: 'Your center is not active' });
    }

    const token = signToken({
      id: user.admin_id, role: user.role,
      centerId: user.center_id || null, email: user.email
    });
    return res.json({
      token,
      user: { id: user.admin_id, email: user.email, role: user.role, centerId: user.center_id || null }
    });
  } catch (err) {
    console.error('loginAdmin error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/auth/login/doctor
// ─────────────────────────────────────────────────────────────
const loginDoctor = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required' });

    const { rows } = await db.query(
      `SELECT d.*, mc.approval_status AS center_status
       FROM doctor d
       JOIN medi_center mc ON mc.center_id = d.center_id
       WHERE d.email = ?`,
      [email.toLowerCase().trim()]
    );
    const doctor = rows[0];
    if (!doctor || !doctor.password_hash)
      return res.status(401).json({ error: 'Invalid credentials' });
    if (doctor.approval_status !== 'Approved')
      return res.status(403).json({ error: 'Your account is not approved yet' });
    if (doctor.center_status !== 'Approved')
      return res.status(403).json({ error: 'Your center is not active' });

    const valid = await bcrypt.compare(password, doctor.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken({
      id: doctor.doctor_id, role: 'Doctor',
      centerId: doctor.center_id, email: doctor.email
    });
    return res.json({
      token,
      user: {
        id: doctor.doctor_id, email: doctor.email, role: 'Doctor',
        centerId: doctor.center_id, name: doctor.name, specialty: doctor.specialty
      }
    });
  } catch (err) {
    console.error('loginDoctor error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/auth/login/patient
// ─────────────────────────────────────────────────────────────
const loginPatient = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required' });

    const { rows } = await db.query(
      "SELECT * FROM patient WHERE email = ? AND patient_type = 'Registered'",
      [email.toLowerCase().trim()]
    );
    const patient = rows[0];
    if (!patient || !patient.password_hash)
      return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, patient.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken({ id: patient.patient_id, role: 'Patient', email: patient.email });
    return res.json({
      token,
      user: { id: patient.patient_id, email: patient.email, role: 'Patient', name: patient.name }
    });
  } catch (err) {
    console.error('loginPatient error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/auth/register/patient
// ─────────────────────────────────────────────────────────────
const registerPatient = async (req, res) => {
  try {
    const { name, email, password, date_of_birth, phone } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: 'Name, email, and password are required' });

    const { rows: ex } = await db.query(
      'SELECT patient_id FROM patient WHERE email = ?',
      [email.toLowerCase().trim()]
    );
    if (ex.length > 0)
      return res.status(409).json({ error: 'An account with this email already exists' });

    const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const patientId = uuidv4();

    await db.query(
      `INSERT INTO patient (patient_id, name, email, password_hash, date_of_birth, phone, patient_type)
       VALUES (?, ?, ?, ?, ?, ?, 'Registered')`,
      [patientId, name.trim(), email.toLowerCase().trim(), password_hash, date_of_birth || null, phone || null]
    );

    // Create empty health record
    await db.query(
      'INSERT INTO health_record (health_record_id, patient_id) VALUES (?, ?)',
      [uuidv4(), patientId]
    );

    const token = signToken({ id: patientId, role: 'Patient', email: email.toLowerCase().trim() });
    return res.status(201).json({
      token,
      user: { id: patientId, email: email.toLowerCase().trim(), role: 'Patient', name: name.trim() }
    });
  } catch (err) {
    console.error('registerPatient error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/auth/register/medicenter
// ─────────────────────────────────────────────────────────────
const registerMediCenter = async (req, res) => {
  try {
    const {
      center_name, email, location, latitude, longitude,
      phsrc_number, registered_doctor_name,
      registered_doctor_specialty, registered_doctor_slmc
    } = req.body;

    if (!center_name || !email || !location || !phsrc_number ||
        !registered_doctor_name || !registered_doctor_specialty || !registered_doctor_slmc)
      return res.status(400).json({ error: 'All required fields must be provided' });

    const { rows: dp } = await db.query('SELECT center_id FROM medi_center WHERE phsrc_number = ?', [phsrc_number.trim()]);
    if (dp.length > 0) return res.status(409).json({ error: 'A center with this PHSRC number already exists' });

    const { rows: de } = await db.query('SELECT center_id FROM medi_center WHERE email = ?', [email.toLowerCase().trim()]);
    if (de.length > 0) return res.status(409).json({ error: 'A center with this email already exists' });

    const { rows: ds } = await db.query('SELECT doctor_id FROM doctor WHERE slmc_number = ?', [registered_doctor_slmc.trim()]);
    if (ds.length > 0) return res.status(409).json({ error: 'A doctor with this SLMC number is already registered' });

    const centerId = uuidv4();
    await db.query(
      `INSERT INTO medi_center
         (center_id, center_name, email, location, latitude, longitude, phsrc_number,
          registered_doctor_name, registered_doctor_specialty, registered_doctor_slmc)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        centerId, center_name.trim(), email.toLowerCase().trim(), location.trim(),
        latitude || null, longitude || null, phsrc_number.trim(),
        registered_doctor_name.trim(), registered_doctor_specialty.trim(), registered_doctor_slmc.trim()
      ]
    );

    const { rows: center } = await db.query('SELECT * FROM medi_center WHERE center_id = ?', [centerId]);
    return res.status(201).json({
      message: 'Center registration submitted. Awaiting SysAdmin approval.',
      center: center[0]
    });
  } catch (err) {
    console.error('registerMediCenter error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/auth/me
// ─────────────────────────────────────────────────────────────
const getMe = async (req, res) => {
  try {
    const { id, role } = req.user;

    if (role === 'SysAdmin' || role === 'MediCenterAdmin') {
      const { rows } = await db.query(
        `SELECT a.admin_id, a.email, a.role, a.center_id, a.created_at,
                mc.center_name, mc.approval_status AS center_status
         FROM admin_user a
         LEFT JOIN medi_center mc ON mc.center_id = a.center_id
         WHERE a.admin_id = ?`,
        [id]
      );
      if (!rows[0]) return res.status(404).json({ error: 'User not found' });
      return res.json(rows[0]);
    }

    if (role === 'Doctor') {
      const { rows } = await db.query(
        `SELECT d.doctor_id, d.name, d.specialty, d.slmc_number, d.email,
                d.center_id, d.approval_status, d.is_registered_doctor, d.created_at,
                mc.center_name
         FROM doctor d
         JOIN medi_center mc ON mc.center_id = d.center_id
         WHERE d.doctor_id = ?`,
        [id]
      );
      if (!rows[0]) return res.status(404).json({ error: 'Doctor not found' });
      return res.json(rows[0]);
    }

    if (role === 'Patient') {
      const { rows } = await db.query(
        'SELECT patient_id, name, email, date_of_birth, phone, patient_type, created_at FROM patient WHERE patient_id = ?',
        [id]
      );
      if (!rows[0]) return res.status(404).json({ error: 'Patient not found' });
      return res.json(rows[0]);
    }

    return res.status(400).json({ error: 'Unknown role' });
  } catch (err) {
    console.error('getMe error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { loginAdmin, loginDoctor, loginPatient, registerPatient, registerMediCenter, getMe };
