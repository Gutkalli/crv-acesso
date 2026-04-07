"""
CRV Controle de Acesso — Rotas de Ocorrências
/api/ocorrencias/...
"""
from flask import Blueprint

from controllers import ocorrencias_controller as ctrl
from middlewares.auth_middleware import requer_admin, requer_auth

ocorrencias_bp = Blueprint("ocorrencias", __name__, url_prefix="/api/ocorrencias")


@ocorrencias_bp.route("", methods=["GET"])
@requer_auth
def listar():
    return ctrl.listar()


@ocorrencias_bp.route("/<oid>", methods=["GET"])
@requer_auth
def buscar(oid):
    return ctrl.buscar(oid)


@ocorrencias_bp.route("", methods=["POST"])
@requer_auth
def criar():
    return ctrl.criar()


@ocorrencias_bp.route("/<oid>", methods=["PUT"])
@requer_auth
def atualizar(oid):
    return ctrl.atualizar(oid)


@ocorrencias_bp.route("/<oid>", methods=["DELETE"])
@requer_admin
def deletar(oid):
    return ctrl.deletar(oid)
