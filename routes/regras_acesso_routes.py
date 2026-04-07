"""
CRV Controle de Acesso — Rotas de Regras de Acesso
/api/regras-acesso/...
"""
from flask import Blueprint

from controllers import regras_acesso_controller as ctrl
from middlewares.auth_middleware import requer_auth

regras_bp = Blueprint("regras", __name__, url_prefix="/api/regras-acesso")


@regras_bp.route("", methods=["GET"])
@requer_auth
def listar():
    return ctrl.listar()


@regras_bp.route("/<rid>", methods=["GET"])
@requer_auth
def buscar(rid):
    return ctrl.buscar(rid)


@regras_bp.route("", methods=["POST"])
@requer_auth
def criar():
    return ctrl.criar()


@regras_bp.route("/<rid>", methods=["PUT"])
@requer_auth
def atualizar(rid):
    return ctrl.atualizar(rid)


@regras_bp.route("/<rid>", methods=["DELETE"])
@requer_auth
def deletar(rid):
    return ctrl.deletar(rid)
