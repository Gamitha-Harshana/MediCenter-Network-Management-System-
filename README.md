# 🏥 MediCenter Network Management System (MCNMS)

A full-stack web application for managing a network of medical centers — handling center registrations, doctor onboarding, patient appointments, drug inventory, QR-based check-ins, and consultation workflows across multiple centers.

---

## ✨ Features

### 🔐 Four Role Portals
| Role | Capabilities |
|------|-------------|
| **SysAdmin** | Approve/reject center registrations and doctor requests, view all centers and patients |
| **MediCenter Admin** | Manage doctors, schedules, drug inventory, patients, deletion requests, and view consultation notifications |
| **Doctor** | View daily queue, QR check-in patients, record consultations with prescriptions and test recommendations |
| **Patient** | Find nearby centers, book appointments (with QR code), view visit history and health records |

### 🏥 Core Modules
- **QR-based Check-in** — Patients receive a QR code on booking; doctor scans it to check in
- **Drug Inventory** — Track stock, log additions/reductions, alert on low stock
- **Consultation Workflow** — Diagnoses, prescriptions (internal/external drugs), test recommendations, revisit scheduling
- **Cross-center History** — Patients can share visit history across all centers
- **Deletion Requests** — Patients can request data deletion from a center
- **Email Notifications** — Powered by [Resend](https://resend.com)

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, React Router v6, Tailwind CSS, TanStack Query, Axios |
| **Backend** | Node.js, Express.js, JWT Authentication, bcrypt |
| **Database** | MySQL 8.0+ |
| **Email** | Resend |
| **QR Codes** | `qrcode` npm package |

---

## 📁 Project Structure

```
HFH/
├── client/                  # React frontend
│   └── src/
│       ├── pages/
│       │   ├── auth/        # Login, Register
│       │   ├── sysadmin/    # SysAdmin portal
│       │   ├── medicenteradmin/  # Center Admin portal
│       │   ├── doctor/      # Doctor portal
│       │   └── patient/     # Patient portal
│       ├── components/      # Shared UI components
│       ├── context/         # Auth context
│       └── utils/           # Axios API client
├── server/                  # Node.js backend
│   └── src/
│       ├── controllers/     # Business logic
│       ├── routes/          # Express routes
│       ├── middleware/       # JWT auth middleware
│       ├── config/          # MySQL connection pool
│       └── utils/           # Email, QR code helpers
└── database/
    └── schema.sql           # Full MySQL schema + seed
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) v18+
- [MySQL](https://dev.mysql.com/downloads/) 8.0+
- [Resend](https://resend.com) account (free tier works)

---

### 1. Clone the Repository

```bash
git clone https://github.com/Gamitha-Harshana/MediCenter-Network-Management-System-.git
cd MediCenter-Network-Management-System-
```

---

### 2. Set Up the Database

Open **MySQL Workbench** (or any MySQL client) and run:

```sql
SOURCE /path/to/database/schema.sql;
```

Or import it via: **File → Open SQL Script → `database/schema.sql` → Execute ⚡**

This creates the `mcnms` database, all 14 tables, and seeds a SysAdmin account.

---

### 3. Configure the Backend

```bash
cd server
cp .env.example .env
```

Edit `server/.env`:

```env
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=mcnms
JWT_SECRET=change_this_to_a_long_random_secret
JWT_EXPIRES_IN=7d
RESEND_API_KEY=re_your_api_key_here
EMAIL_FROM=onboarding@resend.dev
FRONTEND_URL=http://localhost:3000
```

> Get your Resend API key from [resend.com/api-keys](https://resend.com/api-keys)

---

### 4. Install Dependencies & Start the Backend

```bash
# In the server/ directory
npm install
npm run dev
```

Server runs at **http://localhost:5000**

---

### 5. Install Dependencies & Start the Frontend

```bash
# In a new terminal, from the client/ directory
cd client
npm install
npm start
```

Frontend runs at **http://localhost:3000**

---

## 🔑 Default Credentials

| Role | Email | Password |
|------|-------|----------|
| **SysAdmin** | `sysadmin@mcnms.com` | `admin@123` |

> MediCenter Admin and Doctor accounts are created automatically when SysAdmin approves a center registration. Credentials are shown in a popup at the time of approval.

---

## 📋 API Overview

| Prefix | Description |
|--------|-------------|
| `POST /api/auth/*` | Login (admin/doctor/patient), register patient/center |
| `GET/PUT /api/sysadmin/*` | SysAdmin — centers, doctors approval |
| `GET/POST/PUT /api/admin/*` | Center Admin — doctors, schedules, inventory, patients |
| `GET/POST /api/doctor/*` | Doctor — queue, QR scan, consultation, inventory |
| `GET/POST/PUT /api/patient/*` | Patient — appointments, health record, centers search |

---

## 🗄️ Database Schema

14 tables:

```
medi_center        admin_user         doctor
patient            health_record      schedule
drug_inventory     drug_inventory_log appointment
visit_record       prescription       test_recommendation
revisit            notification       deletion_request
```

---

## 📸 Screenshots

> _Add screenshots here after deployment_

---

## 📄 License

This project is licensed under the **MIT License**.

---

## 👤 Author

**Gamitha Harshana**
- GitHub: [@Gamitha-Harshana](https://github.com/Gamitha-Harshana)
