"""
CRV Controle de Acesso — Rotas de Acessos
/api/acessos/...
"""
from flask import Blueprint

from controllers import acessos_controller as ctrl
from middlewares.auth_middleware import requer_auth

acessos_bp = Blueprint("acessos", __name__, url_prefix="/api/acessos")


@acessos_bp.route("", methods=["GET"])
@requer_auth
def listar():
    return ctrl.listar()


@acessos_bp.route("/stats", methods=["GET"])
@requer_auth
def stats_hoje():
    return ctrl.stats_hoje()


@acessos_bp.route("/<aid>", methods=["GET"])
@requer_auth
def buscar(aid):
    return ctrl.buscar(aid)


@acessos_bp.route("", methods=["POST"])
@requer_auth
def registrar():
    return ctrl.registrar()
