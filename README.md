# MediCenter Network Management System (MCNMS)

A full-stack web platform for managing a network of medical centers.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router v6, Tailwind CSS, React Query |
| Backend | Node.js, Express.js, JWT Auth |
| Database | PostgreSQL |

## Project Structure

```
HFH/
├── database/
│   └── schema.sql          # Full PostgreSQL schema
├── server/                 # Node.js + Express backend
│   ├── src/
│   │   ├── config/db.js
│   │   ├── middleware/auth.js
│   │   ├── utils/
│   │   ├── routes/
│   │   └── controllers/
│   ├── .env.example
│   └── package.json
└── client/                 # React frontend
    ├── src/
    │   ├── pages/
    │   │   ├── auth/
    │   │   ├── sysadmin/
    │   │   ├── medicenteradmin/
    │   │   ├── doctor/
    │   │   └── patient/
    │   ├── components/
    │   ├── context/
    │   └── utils/
    └── package.json
```

---

## Setup Instructions

### 1. Database Setup

1. Install PostgreSQL and create the database:
```sql
CREATE DATABASE mcnms;
```

2. Run the schema:
```bash
psql -U postgres -d mcnms -f database/schema.sql
```

---

### 2. Backend Setup

```bash
cd server
npm install
```

Copy and configure environment variables:
```bash
cp .env.example .env
```

Edit `.env`:
```
PORT=5000
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/mcnms
JWT_SECRET=pick_a_long_random_secret_string
JWT_EXPIRES_IN=7d
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_gmail_app_password
FRONTEND_URL=http://localhost:3000
```

> **Gmail App Password**: Go to Google Account → Security → 2-Step Verification → App Passwords → Generate one for "Mail".

Set the SysAdmin password (one-time setup):
```bash
node -e "const b=require('bcrypt'); b.hash('Admin@1234',12).then(h=>console.log(h))"
```
Copy the hash and update the seed row in `database/schema.sql`, then re-run the schema, **OR** run this SQL directly:
```sql
UPDATE admin_user
SET password_hash = '<paste_hash_here>'
WHERE email = 'sysadmin@mcnms.com';
```

Start the backend:
```bash
npm run dev      # development (nodemon)
npm start        # production
```

Backend runs at: **http://localhost:5000**

---

### 3. Frontend Setup

```bash
cd client
npm install
npm start
```

Frontend runs at: **http://localhost:3000**

---

## Default Credentials

| Role | Email | Password |
|------|-------|----------|
| SysAdmin | sysadmin@mcnms.com | Set manually (see above) |
| MediCenterAdmin | Created by SysAdmin on center approval | Emailed temp password |
| Doctor | Created by SysAdmin on doctor approval | Emailed temp password |
| Patient | Self-registered | User-chosen |

---

## API Endpoints Summary

### Auth (`/api/auth`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/login/admin` | SysAdmin / MediCenterAdmin login |
| POST | `/login/doctor` | Doctor login |
| POST | `/login/patient` | Patient login |
| POST | `/register/patient` | Patient self-registration |
| POST | `/register/medicenter` | Center registration (public) |
| GET | `/me` | Get current user profile |

### SysAdmin (`/api/sysadmin`) — requires SysAdmin JWT
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard` | Platform stats |
| GET | `/centers/pending` | Pending center registrations |
| GET | `/centers` | All approved centers |
| PUT | `/centers/:id/approve` | Approve a center |
| PUT | `/centers/:id/reject` | Reject with reason |
| PUT | `/centers/:id/deactivate` | Deactivate center |
| GET | `/doctors/pending` | Pending doctor requests |
| PUT | `/doctors/:id/approve` | Approve doctor |
| PUT | `/doctors/:id/reject` | Reject doctor |

### MediCenter Admin (`/api/admin`) — requires MediCenterAdmin JWT
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard` | Center stats |
| GET/POST | `/doctors` | List / request doctors |
| PUT | `/doctors/:id/deactivate` | Deactivate doctor |
| GET/POST/PUT/DELETE | `/schedules` | Manage schedules |
| GET | `/patients` | List center patients |
| POST | `/patients/temporary` | Create temporary patient |
| POST | `/patients/temporary/:id/appointment` | Book appointment for temp patient |
| GET/POST/PUT/DELETE | `/inventory` | Drug inventory management |
| GET | `/inventory/log` | Inventory change history |
| GET/PUT | `/deletion-requests` | Handle deletion requests |
| GET/PUT | `/notifications` | View and mark notifications |
| GET | `/notifications/:id/details` | Full consultation for printing |

### Doctor (`/api/doctor`) — requires Doctor JWT
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard` | Today's queue summary |
| GET | `/queue` | Today's patient queue |
| POST | `/scan-qr` | Validate and check in via QR |
| GET | `/inventory` | Center drug inventory |
| GET | `/patients/:id/history` | Patient history at this center |
| GET | `/patients/:id/cross-center-history` | Cross-center history (if allowed) |
| POST | `/consultation` | Save full consultation |
| GET | `/schedules` | Own schedules |

### Patient (`/api/patient`) — requires Patient JWT
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/PUT | `/profile` | View / update profile |
| GET | `/centers/search` | Search centers (closeness, specialty, date) |
| GET/POST | `/appointments` | List / book appointments |
| PUT | `/appointments/:id/cancel` | Cancel appointment |
| GET/PUT | `/health-record` | Manage health record |
| POST | `/deletion-requests` | Request record deletion |
| GET | `/history` | Own visit history |

---

## Roles Overview

```
SysAdmin
  ├── Approves / rejects MediCenter registrations
  ├── Approves / rejects Doctor requests
  └── Manages all centers (view, update, deactivate)

MediCenterAdmin (one per center)
  ├── Requests new doctors
  ├── Sets doctor schedules & patient limits
  ├── Creates temporary patient accounts
  ├── Manages drug inventory
  ├── Receives consultation notifications → prints prescriptions
  └── Handles patient data deletion requests

Doctor (belongs to one center)
  ├── Scans patient QR code to begin consultation
  ├── Views patient history (own center + cross-center if permitted)
  ├── Prescribes drugs (center stock auto-reduced)
  ├── Recommends tests & schedules revisits
  └── Presses "Next Patient" to finalize & notify admin

Registered Patient (independent)
  ├── Searches centers by location, specialty, availability
  ├── Books appointments → receives queue number + QR code
  ├── Maintains optional health record
  └── Requests record deletion from centers

Temporary Patient (created by MediCenterAdmin)
  └── Gets queue number + QR code at the center counter
```

---

## QR Code Format

```
{VisitDate}/{PatientType}/{PatientID}/{CenterID}/{DoctorID}/{QueueNo}
```

- `PatientType`: `1` = Registered, `0` = Temporary
- Single-use, expires after visit date

---

## Key Business Rules

1. Each doctor belongs to **exactly one** MediCenter
2. Each MediCenter has **exactly one** Admin
3. Queue numbers are **unique per doctor per date**, assigned atomically
4. A cancelled patient's queue number is **skipped** (not reassigned)
5. Drug stock is **auto-reduced** on "Next Patient" using a DB transaction
6. Cross-center history sharing is **off by default** — patient must opt in
7. Only centers with valid **PHSRC** and doctors with valid **SLMC** are approved
