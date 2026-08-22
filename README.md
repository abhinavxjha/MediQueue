# MediQueue

Smart OPD Appointment, Queue & E-Slip Management System.

MediQueue follows the supplied project write-up and UI reference: patients book appointments, receive E-Slips with QR codes, check in, track live queues and waiting time; doctors manage today's queue and consultations; administrators manage hospitals, OPDs, doctors and analytics. The project also includes an operational Data Science layer for waiting-time and no-show prediction.

## Stack

- Frontend: HTML, CSS, JavaScript, Bootstrap 5, Chart.js
- Backend: Python, FastAPI, SQLAlchemy, JWT authentication
- Database: MySQL
- Data Science: Pandas, NumPy, scikit-learn, XGBoost-compatible model interface
- Utilities: QRCode, ReportLab

## Run

### 1. Create MySQL database

```sql
CREATE DATABASE mediqueue CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Import `sql/schema.sql` if you want the complete schema manually. The API also creates ORM tables on startup.

### 2. Backend

```bash
cd backend
python -m venv .venv
# Windows
.venv\\Scripts\\activate
# Linux/macOS
source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env   # Windows
# cp .env.example .env  # Linux/macOS
uvicorn app.main:app --reload
```

API: http://127.0.0.1:8000
Swagger: http://127.0.0.1:8000/docs

### 3. Frontend

Serve the frontend instead of opening files directly:

```bash
cd frontend
python -m http.server 5500
```

Open http://127.0.0.1:5500

The frontend expects the API at `http://127.0.0.1:8000/api`. Change `API_BASE` in `frontend/app.js` if required.

## Demo accounts

The seed script creates demo users:

- Patient: `patient@mediqueue.local` / `Patient@123`
- Doctor: `doctor@mediqueue.local` / `Doctor@123`
- Admin: `admin@mediqueue.local` / `Admin@123`

Run:

```bash
cd backend
python -m app.seed
```

## Project structure

```text
mediqueue/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── auth.py
│   │   ├── seed.py
│   │   ├── routers/
│   │   │   ├── auth.py
│   │   │   ├── patient.py
│   │   │   ├── doctor.py
│   │   │   ├── admin.py
│   │   │   ├── queue.py
│   │   │   ├── slips.py
│   │   │   └── analytics.py
│   │   └── services/
│   │       ├── queue.py
│   │       ├── slips.py
│   │       └── ml.py
│   └── requirements.txt
├── frontend/
│   ├── index.html
│   ├── app.js
│   └── styles.css
├── sql/schema.sql
└── data/.gitkeep
```

## Notes

This is an academic prototype. Use synthetic/demo patient data, not real patient records. It does not diagnose, prescribe medicines, or provide treatment recommendations. Payment is represented as an extensible data model; no real payment gateway is connected.
