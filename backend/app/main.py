from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes.import_schedule import router as import_router
from .routes.schedule import router as schedule_router
from .routes.capture import router as capture_router
from .routes.review import router as review_router
from .routes.settings import router as settings_router

app=FastAPI(title='Synchronex Execution Bridge API',version='2.0.0')
app.add_middleware(CORSMiddleware,allow_origins=['*'],allow_credentials=False,allow_methods=['*'],allow_headers=['*'])
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
    configured=bool(__import__('os').environ.get('SUPABASE_URL') and __import__('os').environ.get('SUPABASE_SERVICE_ROLE_KEY'))
    return {'status':'ok','supabase_configured':configured}
