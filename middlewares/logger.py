"""
CRV Controle de Acesso — Middleware de Logging
Configura o logger estruturado e registra tempo de cada requisição.
"""
import logging
import time

from flask import g, request


def init_logger(app):
    """
    Configura o handler de logging do aplicativo.
    Deve ser chamado dentro de create_app() antes de qualquer uso.
    """
    fmt = "%(asctime)s [%(levelname)s] %(name)s — %(message)s"
    datefmt = "%Y-%m-%d %H:%M:%S"

    logging.basicConfig(
        level=logging.DEBUG if app.debug else logging.INFO,
        format=fmt,
        datefmt=datefmt,
    )

    # Silencia logs barulhentos de bibliotecas externas
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("werkzeug").setLevel(logging.WARNING)

    app.logger.handlers = []  # evita duplicação com o basicConfig
    app.logger.propagate = True

    return logging.getLogger("crv-acesso")


def register_request_hooks(app):
    """
    Registra before_request e after_request para log de latência
    e cabeçalhos de segurança em todas as respostas.
    """
    logger = logging.getLogger("crv-acesso")

    @app.before_request
    def _start_timer():
        g._start = time.monotonic()

    @app.after_request
    def _log_and_headers(response):
        ms = int((time.monotonic() - getattr(g, "_start", time.monotonic())) * 1000)
        uid = getattr(g, "user_id", "-")
        logger.info(
            f"{request.method} {request.path} → {response.status_code} "
            f"[{ms}ms] uid={uid} ip={request.remote_addr}"
        )

        # Cabeçalhos de segurança
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"]        = "DENY"
        response.headers["Referrer-Policy"]        = "strict-origin-when-cross-origin"

        # Sem cache para arquivos estáticos servidos em modo desenvolvimento
        if request.path.startswith("/static/"):
            response.headers["Cache-Control"] = "no-store"

        return response
