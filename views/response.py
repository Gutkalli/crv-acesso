"""
CRV Controle de Acesso — Padronização de Respostas JSON

Todas as respostas da API seguem este formato:
  { success, data|error, message?, pagination?, timestamp }
"""
from datetime import datetime, timezone
from flask import jsonify


# ------------------------------------------------------------------ #
#  SUCESSO
# ------------------------------------------------------------------ #

def success(data=None, message: str = None, status: int = 200, pagination: dict = None):
    payload = {"success": True, "timestamp": _now()}
    if data is not None:
        payload["data"] = data
    if message:
        payload["message"] = message
    if pagination:
        payload["pagination"] = pagination
    return jsonify(payload), status


def created(data=None, message: str = "Recurso criado com sucesso."):
    return success(data, message, 201)


def no_content():
    return "", 204


def paginated(data, total: int, page: int, per_page: int):
    pages = max(1, (total + per_page - 1) // per_page)
    return jsonify({
        "success": True,
        "data": data,
        "pagination": {
            "total":    total,
            "page":     page,
            "per_page": per_page,
            "pages":    pages,
        },
        "timestamp": _now(),
    }), 200


# ------------------------------------------------------------------ #
#  ERRO
# ------------------------------------------------------------------ #

def error(message: str, status: int = 400, detail=None, code: str = None):
    payload = {
        "success":   False,
        "error":     message,
        "status":    status,
        "timestamp": _now(),
    }
    if detail:
        payload["detail"] = detail
    if code:
        payload["code"] = code
    return jsonify(payload), status


def bad_request(message: str = "Requisição inválida.", detail=None):
    return error(message, 400, detail)


def unauthorized(message: str = "Autenticação necessária."):
    return error(message, 401)


def forbidden(message: str = "Acesso negado. Permissão insuficiente."):
    return error(message, 403)


def not_found(resource: str = "Recurso"):
    return error(f"{resource} não encontrado.", 404)


def unprocessable(message: str, detail=None):
    return error(message, 422, detail)


def server_error(message: str = "Erro interno do servidor.", detail=None):
    return error(message, 500, detail)


# ------------------------------------------------------------------ #
#  HELPER
# ------------------------------------------------------------------ #

def _now() -> str:
    return datetime.now(timezone.utc).isoformat()
