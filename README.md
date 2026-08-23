# Querly

<p align="center">
  <img src="https://img.shields.io/badge/Querly-Smart%20OPD%20Management-0D9488?style=for-the-badge" alt="Querly">
  <img src="https://img.shields.io/badge/Python-3.x-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python">
  <img src="https://img.shields.io/badge/FastAPI-Backend-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI">
  <img src="https://img.shields.io/badge/MySQL-Database-4479A1?style=for-the-badge&logo=mysql&logoColor=white" alt="MySQL">
  <img src="https://img.shields.io/badge/JavaScript-Frontend-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript">
</p>

<h3 align="center">Book. Check In. Track. Consult.</h3>

<p align="center">
  Smart OPD Appointment, Live Sine-Wave Queue & E-Slip Management System
</p>

---

## 📌 About Querly

Querly is a smart digital platform designed to simplify and optimize the complete outpatient department (OPD) workflow.

Instead of stopping at appointment booking, Querly manages the complete patient journey:

```text
Patient Registration
        ↓
Hospital / OPD Selection
        ↓
Doctor Selection
        ↓
Appointment Booking
        ↓
Token Generation
        ↓
Digital E-Slip + QR Code
        ↓
QR Check-In
        ↓
Live OPD Queue
        ↓
Waiting-Time Estimation
        ↓
Doctor Consultation
        ↓
Appointment Completion
        ↓
Analytics & Machine Learning
```

The system provides separate functionality for:

* Patients
* Doctors
* Hospital Administrators

It also includes a Data Science layer for OPD analytics, waiting-time prediction and appointment no-show prediction.

---

# ✨ Main Features

## 👤 Patient Module

* User registration and login
* Search hospitals
* Search departments / OPDs
* Search doctors
* View doctor availability
* Book appointments
* Cancel appointments
* Reschedule appointments
* View appointment history
* Generate digital E-Slip
* Generate QR code
* QR-based check-in
* Live queue tracking
* Token number
* Patients ahead
* Estimated waiting time
* Notifications
* Feedback

---

## 👨‍⚕️ Doctor Module

* Doctor login
* Today's appointments
* Current OPD queue
* Call next patient
* View patient details
* Manage availability
* Manage slots
* Complete consultation
* Consultation notes
* Daily patient statistics
* OPD workload monitoring

---

## 👨‍💼 Admin Module

* Admin login
* Hospital management
* Department / OPD management
* Doctor management
* Appointment monitoring
* Queue monitoring
* User management
* Role management
* Analytics dashboard
* OPD performance monitoring

---

## 📊 Data Science Module

MediQueue collects OPD operational data and uses it for:

* Exploratory Data Analysis
* Patient-flow analysis
* Peak-hour analysis
* Doctor workload analysis
* Waiting-time analysis
* Cancellation analysis
* No-show analysis
* Waiting-time prediction
* Appointment no-show prediction

---

# 🏗️ System Architecture

```text
                    ┌─────────────────┐
                    │     PATIENT     │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │    FRONTEND     │
                    │ HTML/CSS/JS     │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │     FASTAPI     │
                    │    BACKEND      │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
       ┌──────▼──────┐ ┌────▼─────┐ ┌─────▼─────┐
       │ APPOINTMENT │ │  QUEUE   │ │  E-SLIP   │
       │   SERVICE   │ │ SERVICE  │ │  SERVICE  │
       └──────┬──────┘ └────┬─────┘ └─────┬─────┘
              │              │              │
              └──────────────┼──────────────┘
                             │
                    ┌────────▼────────┐
                    │      MySQL      │
                    │    DATABASE     │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │   OPD DATA      │
                    │     LAYER       │
                    └───────┬─────────┘
                            │
                  ┌─────────┴─────────┐
                  │                   │
          ┌───────▼───────┐   ┌──────▼───────┐
          │   ANALYTICS   │   │      ML      │
          └───────┬───────┘   └──────┬───────┘
                  │                   │
          ┌───────▼───────┐   ┌──────▼───────┐
          │  DASHBOARDS   │   │ PREDICTIONS  │
          └───────────────┘   └──────────────┘
```

---

# 🛠️ Technology Stack

## Frontend

* HTML5
* CSS3
* JavaScript
* Bootstrap

## Backend

* Python
* FastAPI
* REST APIs
* JWT Authentication

## Database

* MySQL
* SQLAlchemy
* PyMySQL

## Data Science

* Pandas
* NumPy
* Matplotlib
* Seaborn
* Scikit-learn
* XGBoost

## Other

* QR Code generation
* PDF / E-Slip generation
* Git
* GitHub

---

# 📁 Project Structure

```text
MediQueue/
│
├── backend/
│   ├── .env
│   ├── .env.example
│   ├── requirements.txt
│   │
│   └── app/
│       ├── __init__.py
│       ├── main.py
│       ├── config.py
│       ├── database.py
│       ├── models.py
│       ├── schemas.py
│       ├── auth.py
│       ├── seed.py
│       │
│       ├── routers/
│       │   ├── auth.py
│       │   ├── patient.py
│       │   ├── doctor.py
│       │   ├── admin.py
│       │   ├── queue.py
│       │   ├── analytics.py
│       │   └── slips.py
│       │
│       └── services/
│           ├── queue.py
│           ├── slips.py
│           └── ml.py
│
├── frontend/
│   ├── index.html
│   ├── styles.css
│   └── app.js
│
├── sql/
│   └── schema.sql
│
├── .gitignore
└── README.md
```

---

# 🚀 Installation & Setup

The following setup is intended for **Windows + PowerShell**.

---

# 1. Fork the Repository

Open the MediQueue GitHub repository.

Click:

```text
Fork
```

Select your GitHub account.

You will now have your own copy of the repository.

Your fork will look like:

```text
https://github.com/YOUR-USERNAME/MediQueue
```

---

# 2. Clone Your Fork

Open PowerShell.

Navigate to the location where you want the project:

```powershell
cd E:\
```

Clone your fork:

```powershell
git clone https://github.com/YOUR-USERNAME/MediQueue.git
```

Enter the project:

```powershell
cd MediQueue
```

Check the files:

```powershell
dir
```

You should see:

```text
backend
frontend
sql
README.md
.gitignore
```

---

# 3. Create a Virtual Environment

Go to the backend:

```powershell
cd backend
```

Create the virtual environment:

```powershell
python -m venv .venv
```

---

# 4. Activate the Virtual Environment

Run:

```powershell
.\.venv\Scripts\Activate.ps1
```

If PowerShell blocks the activation script, run:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned
```

Then:

```powershell
.\.venv\Scripts\Activate.ps1
```

You should see:

```text
(.venv) PS E:\MediQueue\backend>
```

---

# 5. Install Backend Requirements

Make sure the virtual environment is active.

Run:

```powershell
python -m pip install --upgrade pip setuptools wheel
```

Then:

```powershell
python -m pip install -r requirements.txt
```

If your `requirements.txt` contains the compatible versions used by this project, it should include:

```text
fastapi==0.116.1
uvicorn[standard]==0.35.0
sqlalchemy==2.0.43
pymysql==1.1.1
python-jose[cryptography]==3.5.0
passlib[bcrypt]==1.7.4
bcrypt==4.0.1
python-multipart==0.0.20
pydantic-settings==2.10.1
email-validator==2.3.0
qrcode[pil]==8.2
reportlab==4.4.3
pandas==2.3.3
numpy
scikit-learn
xgboost
```

### Verify the installation

Run:

```powershell
python -c "import fastapi,sqlalchemy,pandas,numpy,sklearn,xgboost,qrcode,reportlab,email_validator; print('ALL DEPENDENCIES OK')"
```

Expected:

```text
ALL DEPENDENCIES OK
```

---

# 6. Install MySQL

MediQueue uses MySQL as its database.

Make sure MySQL Server is installed and running.

Test the MySQL installation:

```powershell
mysql --version
```

You should get a MySQL version.

Then log in:

```powershell
mysql -u root -p
```

Enter your MySQL root password.

---

# 7. Create the MediQueue Database

Inside MySQL, run:

```sql
CREATE DATABASE IF NOT EXISTS mediqueue;
```

Check that it exists:

```sql
SHOW DATABASES;
```

You should see:

```text
mediqueue
```

Exit MySQL:

```sql
exit
```

---

# 8. Configure Environment Variables

Inside:

```text
backend/
```

copy:

```text
.env.example
```

to:

```text
.env
```

PowerShell:

```powershell
Copy-Item .env.example .env
```

Open:

```text
backend/.env
```

Configure the database connection.

Example:

```env
DATABASE_URL=mysql+pymysql://root:YOUR_MYSQL_PASSWORD@127.0.0.1:3306/mediqueue

SECRET_KEY=change-this-development-secret

ACCESS_TOKEN_EXPIRE_MINUTES=1440

CORS_ORIGINS=http://127.0.0.1:5500,http://localhost:5500
```

## Important

If your MySQL password contains special characters such as:

```text
@
#
%
:
/
?
&
```

those characters may need URL encoding inside `DATABASE_URL`.

For example:

```text
@
```

becomes:

```text
%40
```

So a password like:

```text
Example@123
```

would become:

```text
Example%40123
```

Never commit `.env` to GitHub.

---

# 9. Seed the Database

From:

```text
E:\MediQueue\backend
```

with the virtual environment activated:

```powershell
python -m app.seed
```

Or explicitly:

```powershell
.\.venv\Scripts\python.exe -m app.seed
```

Expected output:

```text
Seeded MediQueue demo data.
```

This creates the demo data required to test the application.

---

# 10. Start the FastAPI Backend

From:

```text
E:\MediQueue\backend
```

run:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

Expected output:

```text
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete.
```

Keep this terminal running.

Do not close it while using the application.

---

# 11. Test the Backend

Open your browser:

```text
http://127.0.0.1:8000
```

You should receive the MediQueue backend response.

For the interactive API documentation:

```text
http://127.0.0.1:8000/docs
```

This opens the FastAPI Swagger interface.

You can test the APIs directly from there.

---

# 12. Start the Frontend

Open a **second PowerShell terminal**.

Go to the frontend:

```powershell
cd E:\MediQueue\frontend
```

Check that the files exist:

```powershell
dir
```

You should have:

```text
index.html
styles.css
app.js
```

Start the frontend server:

```powershell
python -m http.server 5500 --bind 127.0.0.1
```

Expected:

```text
Serving HTTP on 127.0.0.1 port 5500
```

Keep this terminal running.

---

# 13. Open the MediQueue Frontend

Open:

```text
http://127.0.0.1:5500
```

Do **not** open:

```text
http://[::]:5500
```

The `::` address is the IPv6 unspecified address and should not be used as the browser destination.

Your local setup should be:

```text
Frontend
http://127.0.0.1:5500

Backend
http://127.0.0.1:8000

API Documentation
http://127.0.0.1:8000/docs
```

---

# 🖥️ Running Both Servers

You need **two terminals**.

## Terminal 1 - Backend

```powershell
cd E:\MediQueue\backend

.\.venv\Scripts\Activate.ps1

.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

Keep this running.

---

## Terminal 2 - Frontend

```powershell
cd E:\MediQueue\frontend

python -m http.server 5500 --bind 127.0.0.1
```

Keep this running.

---

# 🔐 Demo Accounts

The database seed creates demo accounts.

## Patient

```text
Email:
patient@querly.local

Password:
Patient@123
```

## Doctor

```text
Email:
doctor@querly.local

Password:
Doctor@123
```

## Admin

```text
Email:
admin@querly.local

Password:
Admin@123
```

---

# 🧪 Recommended Demo Flow

For a complete demonstration, use the following workflow:

```text
Patient Login
      ↓
Search Doctor
      ↓
Select OPD
      ↓
View Available Slot
      ↓
Book Appointment
      ↓
Generate Token
      ↓
Generate E-Slip
      ↓
Display QR Code
      ↓
Check-In
      ↓
Enter Live Queue
      ↓
Doctor Calls Next Patient
      ↓
Consultation
      ↓
Complete Appointment
      ↓
Analytics Updated
      ↓
ML Predictions
```

---

# 📊 Data Science Workflow

The Data Science layer uses OPD operational data.

Example features:

```text
Current queue size
Doctor
OPD
Day of week
Time of day
Average consultation duration
Available doctors
Historical waiting time
```

## Waiting-Time Prediction

The system predicts:

```text
Estimated Waiting Time: 34 minutes
```

Possible evaluation metrics:

```text
MAE
RMSE
R² Score
```

## No-Show Prediction

The model can use:

```text
Appointment lead time
Day of week
Appointment time
Previous appointment history
Previous no-show behavior
Cancellation history
```

Output:

```text
No-show probability: 68%
```

The ML layer is intended for **hospital operational analysis**, not diagnosis or medical treatment decisions.

---

# 📈 Analytics

MediQueue can analyze:

* Number of patients
* Patient flow
* Peak OPD hours
* Doctor workload
* Average waiting time
* OPD-wise patient distribution
* Appointment cancellations
* No-show rates
* Waiting-time distribution
* Daily patient trends

---

# 👥 Team Git Workflow

For a team project, do not have everyone directly push to `main`.

Create a branch for each member.

Example:

```powershell
git checkout -b feature/patient-frontend
```

Other examples:

```text
feature/backend-api
feature/doctor-admin
feature/queue-management
feature/data-science
feature/ppt-documentation
```

After completing the work:

```powershell
git add .
git commit -m "Add patient appointment module"
git push origin feature/patient-frontend
```

Then create a Pull Request on GitHub.

---

# 🔄 Sync Your Fork

Before starting new work:

```powershell
git checkout main
git pull origin main
```

If the main repository has changed and you have configured an upstream repository:

```powershell
git remote -v
```

You can update your local repository with:

```powershell
git fetch upstream
git merge upstream/main
```

---

# 🛑 Common Problems

## 1. `ModuleNotFoundError`

Example:

```text
ModuleNotFoundError: No module named 'fastapi'
```

Make sure the virtual environment is active:

```powershell
.\.venv\Scripts\Activate.ps1
```

Then:

```powershell
python -m pip install -r requirements.txt
```

---

## 2. Pandas Installation Error

If pip tries to build Pandas from source, make sure the requirements use a version available as a binary wheel.

The project currently uses:

```text
pandas==2.3.3
```

You can install it directly with:

```powershell
python -m pip install --only-binary=:all: pandas==2.3.3
```

---

## 3. Bcrypt / Passlib Error

If you see:

```text
AttributeError: module 'bcrypt' has no attribute '__about__'
```

or:

```text
ValueError: password cannot be longer than 72 bytes
```

make sure the project uses:

```text
passlib[bcrypt]==1.7.4
bcrypt==4.0.1
```

Then reinstall:

```powershell
python -m pip uninstall bcrypt -y
python -m pip install bcrypt==4.0.1
```

---

## 4. MySQL Access Denied

Example:

```text
Access denied for user 'root'@'localhost'
```

Check:

```text
backend/.env
```

Make sure the MySQL username and password are correct.

Also verify that MySQL is running:

```powershell
mysql -u root -p
```

---

## 5. Database Does Not Exist

Run:

```sql
CREATE DATABASE IF NOT EXISTS mediqueue;
```

Then:

```powershell
python -m app.seed
```

---

## 6. Frontend Does Not Open

Make sure you are inside:

```text
E:\MediQueue\frontend
```

Check:

```powershell
dir
```

You should see:

```text
index.html
styles.css
app.js
```

Then run:

```powershell
python -m http.server 5500 --bind 127.0.0.1
```

Open:

```text
http://127.0.0.1:5500
```

---

## 7. `ERR_ADDRESS_INVALID` for Port 5500

Do not open:

```text
http://[::]:5500
```

Use:

```text
http://127.0.0.1:5500
```

---

## 8. Backend Works but Frontend Cannot Connect

Check that FastAPI is running:

```text
http://127.0.0.1:8000
```

Then check:

```text
http://127.0.0.1:8000/docs
```

Make sure the frontend API base URL points to:

```text
http://127.0.0.1:8000
```

Also verify the CORS configuration in `.env`.

---

# 🔒 Security Notes

The `.env` file contains sensitive configuration and must never be committed.

The following should remain ignored:

```text
.env
.venv/
__pycache__/
*.pyc
```

Never commit:

* MySQL passwords
* JWT secret keys
* Production credentials
* Real patient information

For the academic prototype, use synthetic/demo patient data.

---

# 🧹 Stop the Servers

To stop either server:

```text
CTRL + C
```

The backend and frontend run independently, so stop them separately.

---

# 📋 Quick Start

For someone who has already cloned the repository:

## Terminal 1

```powershell
cd MediQueue\backend

python -m venv .venv

.\.venv\Scripts\Activate.ps1

python -m pip install --upgrade pip setuptools wheel

python -m pip install -r requirements.txt

Copy-Item .env.example .env

python -m app.seed

python -m uvicorn app.main:app --reload
```

## Terminal 2

```powershell
cd MediQueue\frontend

python -m http.server 5500 --bind 127.0.0.1
```

Then open:

```text
http://127.0.0.1:5500
```

Backend:

```text
http://127.0.0.1:8000
```

API Docs:

```text
http://127.0.0.1:8000/docs
```

---

# 🎯 Project Goal

MediQueue is designed to digitize the complete OPD journey:

```text
BOOK
  ↓
E-SLIP
  ↓
QR CHECK-IN
  ↓
TOKEN
  ↓
LIVE QUEUE
  ↓
WAITING-TIME PREDICTION
  ↓
CONSULTATION
  ↓
ANALYTICS
```

The goal is not simply to create an appointment-booking website.

MediQueue combines:

```text
Appointment Management
        +
Queue Management
        +
Digital E-Slip
        +
QR Check-In
        +
OPD Analytics
        +
Machine Learning
```

to create a complete smart OPD management platform.

---

# 👨‍💻 Development Team

Developed as an academic Data Science / Software Engineering project.

### Contributions

Each team member should work through a dedicated feature branch and submit changes through Pull Requests.

---

# ⚠️ Academic Prototype Disclaimer

MediQueue is an academic prototype intended for demonstration and development purposes.

It does not provide:

* Medical diagnosis
* Medical treatment recommendations
* Prescription decisions
* Clinical decision-making

Production deployment would require appropriate security, privacy, authorization, infrastructure, testing and regulatory compliance.

---

# 📜 License

This project is developed for academic and educational purposes.
