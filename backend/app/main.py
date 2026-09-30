from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes.import_schedule import router as import_router
from .routes.schedule import router as schedule_router
from .routes.capture import router as capture_router
from .routes.review import router as review_router
from .routes.settings import router as settings_router
from .services.supabase_service import get_supabase

app=FastAPI(title='Synchronex Execution Bridge API',version='2.0.0')
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
    import os
    configured = bool(os.environ.get('SUPABASE_URL') and os.environ.get('SUPABASE_SERVICE_ROLE_KEY'))
    if not configured:
        return {'status':'degraded','supabase_configured':False,'supabase_reachable':False}
    try:
        sb = get_supabase()
        sb.table('projects').select('id').limit(1).execute()
        return {'status':'ok','supabase_configured':True,'supabase_reachable':True}
    except Exception as exc:
        return {'status':'degraded','supabase_configured':True,'supabase_reachable':False,'error':str(exc)}


# Wrap the fully configured FastAPI application only after all routes have been registered.
# This keeps CORS headers on normal and error responses without replacing the FastAPI
# object before route decorators are evaluated.
app = CORSMiddleware(
    app=app,
    allow_origins=['*'],
    allow_credentials=False,
    allow_methods=['*'],
    allow_headers=['*'],
    expose_headers=['*'],
)
