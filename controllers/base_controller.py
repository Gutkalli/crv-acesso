"""
CRV Controle de Acesso — Controller Base
Utilitários compartilhados por todos os controllers.
"""
from flask import request


def parse_json() -> dict:
    """Lê o corpo JSON da requisição de forma segura."""
    return request.get_json(force=True, silent=True) or {}


def parse_pagination() -> tuple[int, int]:
    """
    Extrai parâmetros de paginação da query string.
    Retorna (limit, offset).
    """
    try:
        limit  = max(1, min(int(request.args.get("limit",  50)), 500))
        offset = max(0, int(request.args.get("offset", 0)))
    except (ValueError, TypeError):
        limit, offset = 50, 0
    return limit, offset


def parse_filtros_data(campo: str = "created_at") -> str:
    """
    Monta filtro de intervalo de datas a partir de data_ini e data_fim na query string.
    Retorna string pronta para usar em sb.select(filtros=...).
    """
    partes = []
    data_ini = request.args.get("data_ini", "")
    data_fim = request.args.get("data_fim", "")
    if data_ini:
        partes.append(f"{campo}=gte.{data_ini}T00:00:00")
    if data_fim:
        partes.append(f"{campo}=lte.{data_fim}T23:59:59")
    return "&".join(partes)


def sanitize(valor: str, maxlen: int = 255) -> str:
    """Remove espaços extras e trunca o valor."""
    return str(valor or "").strip()[:maxlen]
