"""
CRV Controle de Acesso — Rotas de Autenticação
/api/auth/...
"""
from flask import Blueprint

from controllers import auth_controller as ctrl
from middlewares.auth_middleware import requer_auth

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.route("/login", methods=["POST"])
def login():
    return ctrl.login()


@auth_bp.route("/logout", methods=["POST"])
@requer_auth
def logout():
    return ctrl.logout()


@auth_bp.route("/me", methods=["GET"])
@requer_auth
def me():
    return ctrl.me()


@auth_bp.route("/recuperar-senha", methods=["POST"])
def recuperar_senha():
    return ctrl.recuperar_senha()


@auth_bp.route("/alterar-senha", methods=["POST"])
@requer_auth
def alterar_senha():
    return ctrl.alterar_senha()


# ------------------------------------------------------------------ #
#  2FA
# ------------------------------------------------------------------ #

@auth_bp.route("/2fa/enroll", methods=["POST"])
@requer_auth
def enroll_2fa():
    return ctrl.enroll_2fa()


@auth_bp.route("/2fa/challenge", methods=["POST"])
@requer_auth
def challenge_2fa():
    return ctrl.challenge_2fa()


@auth_bp.route("/2fa/verify", methods=["POST"])
@requer_auth
def verify_2fa():
    return ctrl.verify_2fa()


@auth_bp.route("/2fa/unenroll", methods=["POST"])
@requer_auth
def unenroll_2fa():
    return ctrl.unenroll_2fa()
