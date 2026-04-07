"""
CRV Controle de Acesso — Rotas de Funcionários
/api/funcionarios/...
"""
from flask import Blueprint

from controllers import funcionarios_controller as ctrl
from middlewares.auth_middleware import requer_admin, requer_auth

funcionarios_bp = Blueprint("funcionarios", __name__, url_prefix="/api/funcionarios")


@funcionarios_bp.route("", methods=["GET"])
@requer_auth
def listar():
    return ctrl.listar()


@funcionarios_bp.route("/<fid>", methods=["GET"])
@requer_auth
def buscar(fid):
    return ctrl.buscar(fid)


@funcionarios_bp.route("", methods=["POST"])
@requer_admin
def criar():
    return ctrl.criar()


@funcionarios_bp.route("/<fid>", methods=["PUT"])
@requer_admin
def atualizar(fid):
    return ctrl.atualizar(fid)


@funcionarios_bp.route("/<fid>", methods=["DELETE"])
@requer_admin
def deletar(fid):
    return ctrl.deletar(fid)


@funcionarios_bp.route("/importar", methods=["POST"])
@requer_admin
def importar():
    return ctrl.importar()
