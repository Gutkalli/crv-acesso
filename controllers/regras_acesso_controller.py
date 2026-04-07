"""
CRV Controle de Acesso — Controller de Regras de Acesso
Define quem pode acessar quais pontos e horários.
"""
from flask import g, request

from controllers.base_controller import parse_json, parse_pagination, sanitize
from middlewares.permissao import pode_gerenciar_regras
from services.regras_acesso_service import RegrasAcessoService
from views.response import (
    bad_request, created, forbidden, no_content, not_found, success, unprocessable,
)

_svc = RegrasAcessoService()


def _montar_filtros() -> str:
    partes = []
    ativo        = request.args.get("ativo", "")
    equipamento  = request.args.get("equipamento_id", "")
    if ativo in ("true", "false"):
        partes.append(f"ativo=eq.{ativo}")
    if equipamento:
        partes.append(f"equipamento_id=eq.{equipamento}")
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


def buscar(rid: str):
    data, err = _svc.buscar(rid, token=g.token)
    if err == "not_found":
        return not_found("Regra não encontrada.")
    if err:
        return unprocessable(err)
    return success(data)


def criar():
    ok, motivo = pode_gerenciar_regras(g.user_perfil)
    if not ok:
        return forbidden(motivo)
    body = parse_json()
    if not body.get("nome"):
        return bad_request("Nome é obrigatório.")
    data, err = _svc.criar(body, token=g.token)
    if err:
        return unprocessable(err)
    return created(data)


def atualizar(rid: str):
    ok, motivo = pode_gerenciar_regras(g.user_perfil)
    if not ok:
        return forbidden(motivo)
    body = parse_json()
    data, err = _svc.atualizar(rid, body, token=g.token)
    if err == "not_found":
        return not_found("Regra não encontrada.")
    if err:
        return unprocessable(err)
    return success(data)


def deletar(rid: str):
    ok, motivo = pode_gerenciar_regras(g.user_perfil)
    if not ok:
        return forbidden(motivo)
    data, err = _svc.deletar(rid, token=g.token)
    if err:
        return unprocessable(err)
    return no_content()
