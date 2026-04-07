"""
CRV Controle de Acesso — Controller de Equipamentos
CRUD de catracas, câmeras e leitores + teste de conexão ao dispositivo.
"""
from flask import g, request

from controllers.base_controller import parse_json, parse_pagination, sanitize
from services.equipamentos_service import EquipamentosService
from views.response import (
    bad_request, created, no_content, not_found, success, unprocessable,
)

_svc = EquipamentosService()


def _montar_filtros() -> str:
    partes = []
    status = request.args.get("status", "")
    tipo   = request.args.get("tipo", "")
    if status:
        partes.append(f"status=eq.{status}")
    if tipo:
        partes.append(f"tipo=eq.{tipo}")
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


def buscar(eid: str):
    data, err = _svc.buscar(eid, token=g.token)
    if err == "not_found":
        return not_found("Equipamento não encontrado.")
    if err:
        return unprocessable(err)
    return success(data)


def criar():
    body = parse_json()
    if not body.get("nome"):
        return bad_request("Nome é obrigatório.")
    if not body.get("tipo"):
        return bad_request("Tipo é obrigatório.")
    data, err = _svc.criar(body, token=g.token)
    if err:
        return unprocessable(err)
    return created(data)


def atualizar(eid: str):
    body = parse_json()
    data, err = _svc.atualizar(eid, body, token=g.token)
    if err == "not_found":
        return not_found("Equipamento não encontrado.")
    if err:
        return unprocessable(err)
    return success(data)


def deletar(eid: str):
    data, err = _svc.deletar(eid, token=g.token)
    if err:
        return unprocessable(err)
    return no_content()


def testar_conexao():
    body    = parse_json()
    ip      = sanitize(body.get("ip", body.get("url", "")))
    porta   = int(body.get("porta", 80))
    usuario = sanitize(body.get("usuario", "admin"))
    senha   = body.get("senha", "")
    if not ip:
        return bad_request("IP do equipamento é obrigatório.")
    data, err = _svc.testar_conexao(ip, porta, usuario, senha)
    if err:
        return unprocessable(err)
    return success(data)
