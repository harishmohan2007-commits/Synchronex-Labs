from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from .routes.import_schedule import router as import_router
from .routes.schedule import router as schedule_router
from .routes.capture import router as capture_router
from .routes.review import router as review_router
from .routes.settings import router as settings_router

app=FastAPI(title='Synchronex Execution Bridge API',version='2.0.0')

# Direct Render access is still supported. Vercel production normally uses the
# same-origin /api proxy, but explicit origins can be supplied for direct calls.
_allowed_origins = [x.strip() for x in os.environ.get('ALLOWED_ORIGINS', '').split(',') if x.strip()]
if not _allowed_origins:
    _allowed_origins = ['*']

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=False,
    allow_methods=['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allow_headers=['*'],
    expose_headers=['*'],
    max_age=600,
)
app.include_router(import_router)
app.include_router(schedule_router)
app.include_router(capture_router)
app.include_router(review_router)
app.include_router(settings_router)

@app.get('/')
def root():
    return {'service':'Synchronex execution bridge','sources':['ProjectLibre POD','Microsoft Project MPP/MSPDI','Primavera P6 XER'],'persistence':'Supabase'}

@app.get('/health')
def health():
    configured=bool(os.environ.get('SUPABASE_URL') and os.environ.get('SUPABASE_SERVICE_ROLE_KEY'))
    return {'status':'ok','supabase_configured':configured}
