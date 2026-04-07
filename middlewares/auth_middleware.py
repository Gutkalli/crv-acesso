"""
CRV Controle de Acesso — Middleware de Autenticação
Decoradores que validam JWT e populam flask.g com o contexto do usuário.

Todos os decoradores inliniam a validação do token para evitar
conflitos de @wraps ao encadear decoradores no Flask.
"""
import logging
from functools import wraps

from flask import g, request

from auth.supabase_auth import buscar_perfil, extrair_token, validar_token
from views.response import forbidden, unauthorized

logger = logging.getLogger("crv-acesso")


def _autenticar():
    """
    Valida o token e popula g.* com os dados do usuário.
    Retorna (True, None) em caso de sucesso ou (False, response) em caso de erro.
    """
    token, err = extrair_token(request.headers.get("Authorization", ""))
    if err:
        return False, unauthorized(err)

    auth_data, err = validar_token(token)
    if err:
        return False, unauthorized(err)

    perfil_data, err = buscar_perfil(auth_data["id"], token)
    if err:
        return False, unauthorized(err)

    g.token       = token
    g.user_id     = auth_data["id"]
    g.user_email  = auth_data.get("email", "")
    g.user_perfil = perfil_data.get("perfil", "")
    g.empresa_id  = perfil_data.get("empresa_id")
    return True, None


def requer_auth(f):
    """
    Exige apenas que o usuário esteja autenticado (qualquer perfil).
    Popula g.token, g.user_id, g.user_email, g.user_perfil, g.empresa_id.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        ok, resp = _autenticar()
        if not ok:
            return resp
        return f(*args, **kwargs)
    return decorated


def requer_perfil(*perfis):
    """
    Exige autenticação + perfil específico.
    Uso:
        @requer_perfil("admin", "gerente")
        def minha_rota(): ...
    """
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            ok, resp = _autenticar()
            if not ok:
                return resp
            if g.user_perfil not in perfis:
                return forbidden(
                    f"Acesso negado. Requer perfil: {', '.join(perfis)}."
                )
            return f(*args, **kwargs)
        return decorated
    return decorator


def requer_admin(f):
    """Atalho: requer perfil admin ou gerente."""
    @wraps(f)
    def decorated(*args, **kwargs):
        ok, resp = _autenticar()
        if not ok:
            return resp
        if g.user_perfil not in ("admin", "gerente"):
            return forbidden("Acesso negado. Requer perfil: admin ou gerente.")
        return f(*args, **kwargs)
    return decorated


def somente_admin(f):
    """Atalho: requer perfil admin exclusivamente."""
    @wraps(f)
    def decorated(*args, **kwargs):
        ok, resp = _autenticar()
        if not ok:
            return resp
        if g.user_perfil != "admin":
            return forbidden("Acesso negado. Apenas administradores.")
        return f(*args, **kwargs)
    return decorated
