"""
CRV Controle de Acesso — Rotas de Usuários
/api/usuarios/...
"""
from flask import Blueprint

from controllers import usuarios_controller as ctrl
from middlewares.auth_middleware import requer_admin, requer_auth

usuarios_bp = Blueprint("usuarios", __name__, url_prefix="/api/usuarios")


@usuarios_bp.route("", methods=["GET"])
@requer_admin
def listar():
    return ctrl.listar()


@usuarios_bp.route("/<uid>", methods=["GET"])
@requer_admin
def buscar(uid):
    return ctrl.buscar(uid)


@usuarios_bp.route("", methods=["POST"])
@requer_admin
def criar():
    return ctrl.criar()


@usuarios_bp.route("/<uid>", methods=["PUT"])
@requer_admin
def atualizar(uid):
    return ctrl.atualizar(uid)


@usuarios_bp.route("/<uid>/senha", methods=["PUT"])
@requer_admin
def alterar_senha(uid):
    return ctrl.alterar_senha(uid)


@usuarios_bp.route("/<uid>", methods=["DELETE"])
@requer_admin
def deletar(uid):
    return ctrl.deletar(uid)
