"""
CRV Controle de Acesso — Entry Point
Versão: 3.0

Arquitetura em camadas:
  routes/ → middlewares/ → controllers/ → services/ → Supabase REST API

Para iniciar: python app.py
"""
from flask import Flask
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

from config import Config
from middlewares.logger import init_logger, register_request_hooks
from routes import register_routes
from views.erros import register_error_handlers


def create_app() -> Flask:
    """
    Application Factory Pattern.
    Constrói a aplicação Flask com todas as extensões,
    middlewares e blueprints registrados.
    """
    app = Flask(__name__, static_folder="static")
    app.secret_key = Config.SECRET_KEY
    app.debug      = Config.DEBUG

    # ------------------------------------------------------------------ #
    #  Logging estruturado
    # ------------------------------------------------------------------ #
    init_logger(app)
    register_request_hooks(app)

    # ------------------------------------------------------------------ #
    #  CORS — apenas origens explícitas, nunca wildcard
    # ------------------------------------------------------------------ #
    CORS(app, resources={
        r"/api/*": {
            "origins":       Config.CORS_ORIGINS,
            "methods":       ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
        }
    })

    # ------------------------------------------------------------------ #
    #  Rate Limiting (memória — troque por Redis em produção)
    # ------------------------------------------------------------------ #
    limiter = Limiter(
        app=app,
        key_func=get_remote_address,
        default_limits=[Config.RATE_LIMIT_DEFAULT],
        storage_uri="memory://",
    )
    app.extensions["limiter"] = limiter  # disponível para blueprints via current_app

    # ------------------------------------------------------------------ #
    #  Tratadores de erro padronizados
    # ------------------------------------------------------------------ #
    register_error_handlers(app)

    # ------------------------------------------------------------------ #
    #  Rotas (todos os Blueprints)
    # ------------------------------------------------------------------ #
    register_routes(app)

    return app


# ------------------------------------------------------------------ #
#  Ponto de entrada
# ------------------------------------------------------------------ #
app = create_app()

if __name__ == "__main__":
    import logging
    logger = logging.getLogger("crv-acesso")
    logger.info(
        f"CRV Controle de Acesso v3.0 — porta {Config.PORT} "
        f"(debug={Config.DEBUG})"
    )
    app.run(host="0.0.0.0", port=Config.PORT, debug=Config.DEBUG)
