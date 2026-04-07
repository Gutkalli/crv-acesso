"""
CRV Controle de Acesso — Controller de Autenticação
Login, logout, perfil do usuário logado, senha e 2FA.
"""
from flask import g

from controllers.base_controller import parse_json, sanitize
from services.auth_service import AuthService
from views.response import bad_request, created, error, success, unauthorized

_svc = AuthService()


def login():
    body  = parse_json()
    email = sanitize(body.get("email", ""))
    senha = body.get("senha", "")

    if not email or not senha:
        return bad_request("E-mail e senha são obrigatórios.")

    data, err = _svc.login(email, senha)
    if err:
        return unauthorized(err)
    return success(data)


def logout():
    data, err = _svc.logout(g.token)
    if err:
        return error(err)
    return success(data)


def me():
    """Retorna dados do usuário autenticado (já extraídos pelo middleware)."""
    return success({
        "id":         g.user_id,
        "email":      g.user_email,
        "perfil":     g.user_perfil,
        "empresa_id": g.empresa_id,
    })


def recuperar_senha():
    body  = parse_json()
    email = sanitize(body.get("email", ""))
    if not email or "@" not in email:
        return bad_request("E-mail inválido.")
    data, _ = _svc.recuperar_senha(email)  # nunca revela se existe
    return success(data, "Se o e-mail estiver cadastrado, você receberá as instruções.")


def alterar_senha():
    body       = parse_json()
    nova_senha = body.get("nova_senha", "")
    if not nova_senha or len(nova_senha) < 6:
        return bad_request("A nova senha deve ter no mínimo 6 caracteres.")
    data, err = _svc.alterar_senha_logado(g.token, nova_senha)
    if err:
        return error(err)
    return success(data)


# ------------------------------------------------------------------ #
#  2FA
# ------------------------------------------------------------------ #

def enroll_2fa():
    data, err = _svc.enroll_2fa(g.token)
    if err:
        return error(err)
    return created(data)


def challenge_2fa():
    body      = parse_json()
    factor_id = sanitize(body.get("factor_id", ""))
    if not factor_id:
        return bad_request("factor_id é obrigatório.")
    data, err = _svc.challenge_2fa(g.token, factor_id)
    if err:
        return error(err)
    return success(data)


def verify_2fa():
    body         = parse_json()
    factor_id    = sanitize(body.get("factor_id", ""))
    challenge_id = sanitize(body.get("challenge_id", ""))
    code         = sanitize(body.get("code", ""))
    if not all([factor_id, challenge_id, code]):
        return bad_request("factor_id, challenge_id e code são obrigatórios.")
    data, err = _svc.verify_2fa(g.token, factor_id, challenge_id, code)
    if err:
        return error(err, 422)
    return success(data)


def unenroll_2fa():
    body      = parse_json()
    factor_id = sanitize(body.get("factor_id", ""))
    if not factor_id:
        return bad_request("factor_id é obrigatório.")
    data, err = _svc.unenroll_2fa(g.token, factor_id, g.user_id)
    if err:
        return error(err)
    return success(data)
