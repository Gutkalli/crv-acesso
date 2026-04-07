"""
CRV Controle de Acesso — Rotas de Exportação CSV
/api/exportar/...
"""
from flask import Blueprint

from controllers import exportar_controller as ctrl
from middlewares.auth_middleware import requer_auth

exportar_bp = Blueprint("exportar", __name__, url_prefix="/api/exportar")


@exportar_bp.route("/<tabela>", methods=["GET"])
@requer_auth
def exportar(tabela: str):
    return ctrl.exportar(tabela)
