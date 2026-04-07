"""
CRV Controle de Acesso — Rotas de Equipamentos
/api/equipamentos/...
"""
from flask import Blueprint

from controllers import equipamentos_controller as ctrl
from middlewares.auth_middleware import requer_admin, requer_auth

equipamentos_bp = Blueprint("equipamentos", __name__, url_prefix="/api/equipamentos")


@equipamentos_bp.route("", methods=["GET"])
@requer_auth
def listar():
    return ctrl.listar()


@equipamentos_bp.route("/<eid>", methods=["GET"])
@requer_auth
def buscar(eid):
    return ctrl.buscar(eid)


@equipamentos_bp.route("", methods=["POST"])
@requer_admin
def criar():
    return ctrl.criar()


@equipamentos_bp.route("/<eid>", methods=["PUT"])
@requer_admin
def atualizar(eid):
    return ctrl.atualizar(eid)


@equipamentos_bp.route("/<eid>", methods=["DELETE"])
@requer_admin
def deletar(eid):
    return ctrl.deletar(eid)


@equipamentos_bp.route("/testar-conexao", methods=["POST"])
@requer_auth
def testar_conexao():
    return ctrl.testar_conexao()
