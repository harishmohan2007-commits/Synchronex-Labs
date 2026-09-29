from __future__ import annotations
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime, timezone
from ..services.supabase_service import get_supabase
router=APIRouter(prefix='/api/settings',tags=['settings'])
class Settings(BaseModel):
    confidence_threshold:float=0.90; date_format:str='DD MMM YYYY'; timezone:str='Asia/Kolkata'; retention:str='project'; auto_save:bool=True; email_notifications:bool=True; in_app_notifications:bool=True
@router.get('/{project_id}')
def get_settings(project_id:str):
    sb=get_supabase(); r=sb.table('workspace_settings').select('*').eq('project_id',project_id).execute().data
    return r[0] if r else Settings().model_dump() | {'project_id':project_id}
@router.put('/{project_id}')
def put_settings(project_id:str, body:Settings):
    sb=get_supabase(); row=body.model_dump() | {'project_id':project_id,'updated_at':datetime.now(timezone.utc).isoformat()}
    r=sb.table('workspace_settings').upsert(row).execute().data
    return r[0] if r else row
