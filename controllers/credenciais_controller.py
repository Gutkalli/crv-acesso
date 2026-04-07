"""
CRV Controle de Acesso — Controller de Credenciais
Gerencia cartões, biometria, QR codes e PINs.
"""
from flask import g, request

from controllers.base_controller import parse_json, parse_pagination
from services.credenciais_service import CredenciaisService
from views.response import (
    bad_request, created, no_content, not_found, success, unprocessable,
)

_svc = CredenciaisService()


def _montar_filtros() -> str:
    partes = []
    tipo   = request.args.get("tipo", "")
    status = request.args.get("status", "")
    fid    = request.args.get("funcionario_id", "")
    if tipo:
        partes.append(f"tipo=eq.{tipo}")
    if status:
        partes.append(f"status=eq.{status}")
    if fid:
        partes.append(f"funcionario_id=eq.{fid}")
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


def buscar(cid: str):
    data, err = _svc.buscar(cid, token=g.token)
    if err == "not_found":
        return not_found("Credencial não encontrada.")
    if err:
        return unprocessable(err)
    return success(data)


def criar():
    body = parse_json()
    if not body.get("funcionario_id"):
        return bad_request("funcionario_id é obrigatório.")
    if not body.get("tipo"):
        return bad_request("Tipo é obrigatório.")
    if not body.get("identificador"):
        return bad_request("Identificador é obrigatório.")
    data, err = _svc.criar(body, token=g.token)
    if err:
        return unprocessable(err)
    return created(data)


def atualizar(cid: str):
    body = parse_json()
    data, err = _svc.atualizar(cid, body, token=g.token)
    if err == "not_found":
        return not_found("Credencial não encontrada.")
    if err:
        return unprocessable(err)
    return success(data)


def deletar(cid: str):
    data, err = _svc.deletar(cid, token=g.token)
    if err:
        return unprocessable(err)
    return no_content()
