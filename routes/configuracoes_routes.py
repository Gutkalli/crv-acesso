"""
CRV Controle de Acesso — Rotas de Configurações
/api/configuracoes/...
"""
from flask import Blueprint

from controllers import configuracoes_controller as ctrl
from middlewares.auth_middleware import requer_auth

config_bp = Blueprint("configuracoes", __name__, url_prefix="/api/configuracoes")


@config_bp.route("", methods=["GET"])
@requer_auth
def buscar():
    return ctrl.buscar()


@config_bp.route("", methods=["POST", "PUT"])
@requer_auth
def salvar():
    return ctrl.salvar()
