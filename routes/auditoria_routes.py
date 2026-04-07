"""
CRV Controle de Acesso — Rotas de Auditoria
/api/auditoria/...
"""
from flask import Blueprint

from controllers import auditoria_controller as ctrl
from middlewares.auth_middleware import requer_admin

auditoria_bp = Blueprint("auditoria", __name__, url_prefix="/api/auditoria")


@auditoria_bp.route("", methods=["GET"])
@requer_admin
def listar():
    return ctrl.listar()
