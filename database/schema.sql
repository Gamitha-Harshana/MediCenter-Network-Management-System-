-- ============================================================
-- MCNMS - MediCenter Network Management System
-- MySQL 8.0+ Database Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS mcnms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE mcnms;

-- MEDI_CENTER
CREATE TABLE IF NOT EXISTS medi_center (
  center_id                    CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  center_name                  VARCHAR(255) NOT NULL,
  email                        VARCHAR(255) NOT NULL UNIQUE,
  location                     VARCHAR(500) NOT NULL,
  latitude                     DECIMAL(10,8),
  longitude                    DECIMAL(11,8),
  phsrc_number                 VARCHAR(100) NOT NULL UNIQUE,
  approval_status              VARCHAR(20)  NOT NULL DEFAULT 'Pending',
  rejection_reason             TEXT,
  registered_doctor_name       VARCHAR(255) NOT NULL,
  registered_doctor_specialty  VARCHAR(255) NOT NULL,
  registered_doctor_slmc       VARCHAR(100) NOT NULL,
  created_at                   DATETIME     NOT NULL DEFAULT NOW(),
  updated_at                   DATETIME     NOT NULL DEFAULT NOW() ON UPDATE NOW()
);

-- ADMIN USER (SysAdmin + MediCenterAdmin)
CREATE TABLE IF NOT EXISTS admin_user (
  admin_id      CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(20)  NOT NULL,
  center_id     CHAR(36),
  created_at    DATETIME     NOT NULL DEFAULT NOW(),
  FOREIGN KEY (center_id) REFERENCES medi_center(center_id) ON DELETE CASCADE
);

-- DOCTOR
CREATE TABLE IF NOT EXISTS doctor (
  doctor_id           CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  name                VARCHAR(255) NOT NULL,
  specialty           VARCHAR(255) NOT NULL,
  slmc_number         VARCHAR(100) NOT NULL UNIQUE,
  email               VARCHAR(255) NOT NULL UNIQUE,
  password_hash       VARCHAR(255),
  center_id           CHAR(36)     NOT NULL,
  approval_status     VARCHAR(20)  NOT NULL DEFAULT 'Pending',
  rejection_reason    TEXT,
  is_registered_doctor TINYINT(1)  NOT NULL DEFAULT 0,
  created_at          DATETIME     NOT NULL DEFAULT NOW(),
  FOREIGN KEY (center_id) REFERENCES medi_center(center_id) ON DELETE CASCADE
);

-- PATIENT
CREATE TABLE IF NOT EXISTS patient (
  patient_id    CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  name          VARCHAR(255) NOT NULL,
  email         VARCHAR(255),
  date_of_birth DATE,
  phone         VARCHAR(20),
  password_hash VARCHAR(255),
  patient_type  VARCHAR(15)  NOT NULL,
  center_id     CHAR(36),
  created_at    DATETIME     NOT NULL DEFAULT NOW(),
  FOREIGN KEY (center_id) REFERENCES medi_center(center_id) ON DELETE CASCADE
);

-- HEALTH_RECORD
CREATE TABLE IF NOT EXISTS health_record (
  health_record_id    CHAR(36)    NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  patient_id          CHAR(36)    NOT NULL UNIQUE,
  viewable_by_doctors TINYINT(1)  NOT NULL DEFAULT 0,
  notes               TEXT,
  share_cross_center  TINYINT(1)  NOT NULL DEFAULT 0,
  updated_at          DATETIME    NOT NULL DEFAULT NOW() ON UPDATE NOW(),
  FOREIGN KEY (patient_id) REFERENCES patient(patient_id) ON DELETE CASCADE
);

-- SCHEDULE
CREATE TABLE IF NOT EXISTS schedule (
  schedule_id    CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  doctor_id      CHAR(36)     NOT NULL,
  day_of_week    VARCHAR(10)  NOT NULL,
  start_time     TIME         NOT NULL,
  end_time       TIME         NOT NULL,
  patient_amount INT          NOT NULL DEFAULT 25,
  is_active      TINYINT(1)  NOT NULL DEFAULT 1,
  created_at     DATETIME     NOT NULL DEFAULT NOW(),
  FOREIGN KEY (doctor_id) REFERENCES doctor(doctor_id) ON DELETE CASCADE
);

-- DRUG_INVENTORY
CREATE TABLE IF NOT EXISTS drug_inventory (
  drug_id      CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  center_id    CHAR(36)     NOT NULL,
  drug_name    VARCHAR(255) NOT NULL,
  drug_type    VARCHAR(50)  NOT NULL,
  dosage_unit  VARCHAR(50)  NOT NULL,
  quantity     DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at   DATETIME     NOT NULL DEFAULT NOW(),
  updated_at   DATETIME     NOT NULL DEFAULT NOW() ON UPDATE NOW(),
  UNIQUE KEY uq_center_drug (center_id, drug_name),
  FOREIGN KEY (center_id) REFERENCES medi_center(center_id) ON DELETE CASCADE
);

-- DRUG_INVENTORY_LOG
CREATE TABLE IF NOT EXISTS drug_inventory_log (
  log_id           CHAR(36)    NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  drug_id          CHAR(36)    NOT NULL,
  change_type      VARCHAR(20) NOT NULL,
  quantity_changed DECIMAL(10,2) NOT NULL,
  notes            TEXT,
  changed_by       CHAR(36),
  changed_at       DATETIME    NOT NULL DEFAULT NOW(),
  FOREIGN KEY (drug_id) REFERENCES drug_inventory(drug_id) ON DELETE CASCADE
);

-- APPOINTMENT
CREATE TABLE IF NOT EXISTS appointment (
  appointment_id CHAR(36)    NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  patient_id     CHAR(36)    NOT NULL,
  patient_type   TINYINT(1)  NOT NULL,
  doctor_id      CHAR(36)    NOT NULL,
  center_id      CHAR(36)    NOT NULL,
  visit_date     DATE        NOT NULL,
  queue_no       INT         NOT NULL,
  status         VARCHAR(20) NOT NULL DEFAULT 'Active',
  qr_code_data   TEXT,
  created_at     DATETIME    NOT NULL DEFAULT NOW(),
  UNIQUE KEY uq_doctor_date_queue (doctor_id, visit_date, queue_no),
  FOREIGN KEY (patient_id) REFERENCES patient(patient_id),
  FOREIGN KEY (doctor_id)  REFERENCES doctor(doctor_id),
  FOREIGN KEY (center_id)  REFERENCES medi_center(center_id)
);

-- VISIT_RECORD
CREATE TABLE IF NOT EXISTS visit_record (
  record_id      CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  patient_id     CHAR(36) NOT NULL,
  doctor_id      CHAR(36) NOT NULL,
  center_id      CHAR(36) NOT NULL,
  appointment_id CHAR(36),
  visit_date     DATE     NOT NULL,
  symptoms       TEXT,
  diagnosis      TEXT,
  created_at     DATETIME NOT NULL DEFAULT NOW(),
  FOREIGN KEY (patient_id)     REFERENCES patient(patient_id),
  FOREIGN KEY (doctor_id)      REFERENCES doctor(doctor_id),
  FOREIGN KEY (center_id)      REFERENCES medi_center(center_id),
  FOREIGN KEY (appointment_id) REFERENCES appointment(appointment_id)
);

-- PRESCRIPTION
CREATE TABLE IF NOT EXISTS prescription (
  prescription_id  CHAR(36)      NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  record_id        CHAR(36)      NOT NULL,
  drug_id          CHAR(36),
  external_drug_name VARCHAR(255),
  drug_type        VARCHAR(50)   NOT NULL,
  times_per_day    INT           NOT NULL,
  dosage_per_time  DECIMAL(10,2) NOT NULL,
  dosage_unit      VARCHAR(50)   NOT NULL,
  number_of_days   INT           NOT NULL,
  is_external      TINYINT(1)    NOT NULL DEFAULT 0,
  FOREIGN KEY (record_id) REFERENCES visit_record(record_id) ON DELETE CASCADE,
  FOREIGN KEY (drug_id)   REFERENCES drug_inventory(drug_id)
);

-- TEST_RECOMMENDATION
CREATE TABLE IF NOT EXISTS test_recommendation (
  test_id   CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  record_id CHAR(36)     NOT NULL,
  test_name VARCHAR(255) NOT NULL,
  notes     TEXT,
  FOREIGN KEY (record_id) REFERENCES visit_record(record_id) ON DELETE CASCADE
);

-- REVISIT
CREATE TABLE IF NOT EXISTS revisit (
  revisit_id   CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  record_id    CHAR(36) NOT NULL,
  revisit_date DATE     NOT NULL,
  notes        TEXT,
  FOREIGN KEY (record_id) REFERENCES visit_record(record_id) ON DELETE CASCADE
);

-- NOTIFICATION
CREATE TABLE IF NOT EXISTS notification (
  notification_id CHAR(36)    NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  center_id       CHAR(36)    NOT NULL,
  record_id       CHAR(36)    NOT NULL,
  doctor_id       CHAR(36)    NOT NULL,
  created_at      DATETIME    NOT NULL DEFAULT NOW(),
  status          VARCHAR(10) NOT NULL DEFAULT 'Unread',
  FOREIGN KEY (center_id) REFERENCES medi_center(center_id),
  FOREIGN KEY (record_id) REFERENCES visit_record(record_id),
  FOREIGN KEY (doctor_id) REFERENCES doctor(doctor_id)
);

-- DELETION_REQUEST
CREATE TABLE IF NOT EXISTS deletion_request (
  request_id  CHAR(36)    NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  patient_id  CHAR(36)    NOT NULL,
  center_id   CHAR(36)    NOT NULL,
  status      VARCHAR(20) NOT NULL DEFAULT 'Pending',
  notes       TEXT,
  created_at  DATETIME    NOT NULL DEFAULT NOW(),
  actioned_at DATETIME,
  FOREIGN KEY (patient_id) REFERENCES patient(patient_id),
  FOREIGN KEY (center_id)  REFERENCES medi_center(center_id)
);

-- AUDIT_LOG
CREATE TABLE IF NOT EXISTS audit_log (
  log_id      CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  actor_id    CHAR(36),
  actor_role  VARCHAR(30),
  action      VARCHAR(255),
  target_type VARCHAR(100),
  target_id   CHAR(36),
  created_at  DATETIME     NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_doctor_center        ON doctor(center_id);
CREATE INDEX idx_appt_doctor_date     ON appointment(doctor_id, visit_date);
CREATE INDEX idx_visit_patient        ON visit_record(patient_id);
CREATE INDEX idx_visit_center         ON visit_record(center_id);
CREATE INDEX idx_notif_center_status  ON notification(center_id, status);

-- Seed SysAdmin (password = 'admin@123')
INSERT INTO admin_user (admin_id, email, password_hash, role)
VALUES (
  UUID(),
  'sysadmin@mcnms.com',
  '$2b$12$I8qOcPTUU2wiADfvcQbB5uo3aJKC7915srYNnHrqXOV6MqLYd654y',
  'SysAdmin'
);
