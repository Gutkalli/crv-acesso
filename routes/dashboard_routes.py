"""
CRV Controle de Acesso — Rotas do Dashboard
/api/dashboard/...
"""
from flask import Blueprint

from controllers import dashboard_controller as ctrl
from middlewares.auth_middleware import requer_auth

dashboard_bp = Blueprint("dashboard", __name__, url_prefix="/api/dashboard")


@dashboard_bp.route("/stats", methods=["GET"])
@requer_auth
def stats():
    return ctrl.stats()
