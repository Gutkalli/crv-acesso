"""
CRV Controle de Acesso — Rotas de Credenciais
/api/credenciais/...
"""
from flask import Blueprint

from controllers import credenciais_controller as ctrl
from middlewares.auth_middleware import requer_admin, requer_auth

credenciais_bp = Blueprint("credenciais", __name__, url_prefix="/api/credenciais")


@credenciais_bp.route("", methods=["GET"])
@requer_auth
def listar():
    return ctrl.listar()


@credenciais_bp.route("/<cid>", methods=["GET"])
@requer_auth
def buscar(cid):
    return ctrl.buscar(cid)


@credenciais_bp.route("", methods=["POST"])
@requer_admin
def criar():
    return ctrl.criar()


@credenciais_bp.route("/<cid>", methods=["PUT"])
@requer_admin
def atualizar(cid):
    return ctrl.atualizar(cid)


@credenciais_bp.route("/<cid>", methods=["DELETE"])
@requer_admin
def deletar(cid):
    return ctrl.deletar(cid)
