from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text
from .config import settings
from .database import Base,engine
from .routers import auth,patient,doctor,queue,admin,analytics,slips
app=FastAPI(title='MediQueue API',version='1.0.0',description='Smart OPD Appointment, Queue & E-Slip Management System')
app.add_middleware(CORSMiddleware,allow_origins=[x.strip() for x in settings.CORS_ORIGINS.split(',') if x.strip()],allow_credentials=True,allow_methods=['*'],allow_headers=['*'])
Base.metadata.create_all(bind=engine)
if 'symptoms' not in {column['name'] for column in inspect(engine).get_columns('appointments')}:
	with engine.begin() as connection:
		connection.execute(text('ALTER TABLE appointments ADD COLUMN symptoms TEXT'))
for r in [auth.router,patient.router,doctor.router,queue.router,admin.router,analytics.router,slips.router]: app.include_router(r)
@app.get('/')
def root(): return {'name':'MediQueue','status':'running','docs':'/docs'}
@app.get('/health')
def health(): return {'status':'ok'}
