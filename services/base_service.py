"""
CRV Controle de Acesso — Serviço Base
Todos os serviços de domínio herdam desta classe.
"""
from services.supabase_service import SupabaseService


class BaseService:
    def __init__(self):
        self.sb = SupabaseService()
