"""
CRV Controle de Acesso — Controller de Acessos
Log de passagens e registro manual de eventos de acesso.
"""
from datetime import datetime, timezone

from flask import g, request

from controllers.base_controller import parse_filtros_data, parse_json, parse_pagination
from services.acessos_service import AcessosService
from views.response import bad_request, created, not_found, success, unprocessable

_svc = AcessosService()


def _montar_filtros() -> str:
    partes = []
    resultado    = request.args.get("resultado", "")
    equipamento  = request.args.get("equipamento_id", "")
    funcionario  = request.args.get("funcionario_id", "")
    filtro_data  = parse_filtros_data("data")
    if resultado:
        partes.append(f"resultado=eq.{resultado}")
    if equipamento:
        partes.append(f"equipamento_id=eq.{equipamento}")
    if funcionario:
        partes.append(f"funcionario_id=eq.{funcionario}")
    if filtro_data:
        partes.append(filtro_data)
    return "&".join(partes)


def listar():
    limit, offset = parse_pagination()
    filtros = _montar_filtros()
    data, err = _svc.listar(token=g.token, filtros=filtros)
    if err:
        return unprocessable(err)
    total  = len(data)
    pagina = data[offset: offset + limit]
    return success(pagina, pagination={"total": total, "limit": limit, "offset": offset})


def buscar(aid: str):
    data, err = _svc.buscar(aid, token=g.token)
    if err == "not_found":
        return not_found("Registro de acesso não encontrado.")
    if err:
        return unprocessable(err)
    return success(data)


def registrar():
    body = parse_json()
    if body.get("resultado") not in ("liberado", "negado"):
        return bad_request("resultado deve ser 'liberado' ou 'negado'.")
    data, err = _svc.registrar(body, token=g.token)
    if err:
        return unprocessable(err)
    return created(data)


def stats_hoje():
    hoje = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    data, err = _svc.stats_hoje(token=g.token, data_ref=hoje)
    if err:
        return unprocessable(err)
    return success(data)
