"""
CRV Controle de Acesso — Controller de Auditoria
Leitura do log de auditoria (somente admin e gerente).
"""
from flask import g, request

from controllers.base_controller import parse_filtros_data, parse_pagination
from middlewares.permissao import pode_ver_auditoria
from services.auditoria_service import AuditoriaService
from views.response import forbidden, success, unprocessable

_svc = AuditoriaService()


def _montar_filtros() -> str:
    partes = []
    nivel       = request.args.get("nivel", "")
    modulo      = request.args.get("modulo", "")
    usuario_id  = request.args.get("usuario_id", "")
    filtro_data = parse_filtros_data("data")
    if nivel:
        partes.append(f"nivel=eq.{nivel}")
    if modulo:
        partes.append(f"modulo=eq.{modulo}")
    if usuario_id:
        partes.append(f"usuario_id=eq.{usuario_id}")
    if filtro_data:
        partes.append(filtro_data)
    return "&".join(partes)


def listar():
    ok, motivo = pode_ver_auditoria(g.user_perfil)
    if not ok:
        return forbidden(motivo)

    limit, offset = parse_pagination()
    filtros = _montar_filtros()
    data, err = _svc.listar(token=g.token, filtros=filtros)
    if err:
        return unprocessable(err)
    total  = len(data)
    pagina = data[offset: offset + limit]
    return success(pagina, pagination={"total": total, "limit": limit, "offset": offset})
