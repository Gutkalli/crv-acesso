"""
CRV Controle de Acesso — Configuração Central
Todas as variáveis de ambiente e constantes da aplicação.
"""
import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    # ------------------------------------------------------------------ #
    #  SUPABASE
    # ------------------------------------------------------------------ #
    SUPABASE_URL              = os.environ.get("SUPABASE_URL", "")
    SUPABASE_ANON_KEY         = os.environ.get("SUPABASE_ANON_KEY", "")
    SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

    # ------------------------------------------------------------------ #
    #  FLASK
    # ------------------------------------------------------------------ #
    SECRET_KEY = os.environ.get("SECRET_KEY", "crv-secret-dev-2025")
    DEBUG      = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
    PORT       = int(os.environ.get("PORT", 10000))

    # ------------------------------------------------------------------ #
    #  CORS
    # ------------------------------------------------------------------ #
    CORS_ORIGINS = os.environ.get(
        "CORS_ORIGINS",
        "http://localhost:10000,http://127.0.0.1:10000",
    ).split(",")

    # ------------------------------------------------------------------ #
    #  RATE LIMITING
    # ------------------------------------------------------------------ #
    RATE_LIMIT_DEFAULT   = "200 per minute"
    RATE_LIMIT_AUTH      = "10 per minute"
    RATE_LIMIT_SENSITIVE = "5 per minute"
    RATE_LIMIT_EXPORT    = "20 per minute"

    # ------------------------------------------------------------------ #
    #  PERFIS VÁLIDOS
    # ------------------------------------------------------------------ #
    PERFIS_VALIDOS = ("admin", "gerente", "operador", "portaria")
