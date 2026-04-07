"""
CRV Controle de Acesso — Controller de Ocorrências
Registro e acompanhamento de incidentes de segurança.
"""
from flask import g, request

from controllers.base_controller import parse_filtros_data, parse_json, parse_pagination
from services.ocorrencias_service import OcorrenciasService
from views.response import (
    bad_request, created, no_content, not_found, success, unprocessable,
)

_svc = OcorrenciasService()


def _montar_filtros() -> str:
    partes = []
    status     = request.args.get("status", "")
    prioridade = request.args.get("prioridade", "")
    tipo       = request.args.get("tipo", "")
    filtro_data = parse_filtros_data("created_at")
    if status:
        partes.append(f"status=eq.{status}")
    if prioridade:
        partes.append(f"prioridade=eq.{prioridade}")
    if tipo:
        partes.append(f"tipo=eq.{tipo}")
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


def buscar(oid: str):
    data, err = _svc.buscar(oid, token=g.token)
    if err == "not_found":
        return not_found("Ocorrência não encontrada.")
    if err:
        return unprocessable(err)
    return success(data)


def criar():
    body = parse_json()
    if not body.get("tipo"):
        return bad_request("Tipo é obrigatório.")
    if not body.get("descricao"):
        return bad_request("Descrição é obrigatória.")
    data, err = _svc.criar(body, token=g.token)
    if err:
        return unprocessable(err)
    return created(data)


def atualizar(oid: str):
    body = parse_json()
    data, err = _svc.atualizar(oid, body, token=g.token)
    if err == "not_found":
        return not_found("Ocorrência não encontrada.")
    if err:
        return unprocessable(err)
    return success(data)


def deletar(oid: str):
    data, err = _svc.deletar(oid, token=g.token)
    if err:
        return unprocessable(err)
    return no_content()
