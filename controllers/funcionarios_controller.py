"""
CRV Controle de Acesso — Controller de Funcionários
CRUD + importação em lote de funcionários.
"""
from flask import g, request

from controllers.base_controller import parse_filtros_data, parse_json, parse_pagination, sanitize
from services.funcionarios_service import FuncionariosService
from views.response import (
    bad_request, created, no_content, not_found, success, unprocessable,
)

_svc = FuncionariosService()


def _montar_filtros() -> str:
    partes = []
    status = request.args.get("status", "")
    setor  = request.args.get("setor", "")
    busca  = request.args.get("busca", "")
    if status:
        partes.append(f"status=eq.{status}")
    if setor:
        partes.append(f"setor=eq.{setor}")
    if busca:
        partes.append(f"nome=ilike.*{busca}*")
    return "&".join(partes)


def listar():
    limit, offset = parse_pagination()
    filtros = _montar_filtros()
    data, err = _svc.listar(token=g.token, filtros=filtros)
    if err:
        return unprocessable(err)
    # Paginação simples no Python (Supabase free tier sem header Range)
    total  = len(data)
    pagina = data[offset: offset + limit]
    return success(pagina, pagination={"total": total, "limit": limit, "offset": offset})


def buscar(fid: str):
    data, err = _svc.buscar(fid, token=g.token)
    if err == "not_found":
        return not_found("Funcionário não encontrado.")
    if err:
        return unprocessable(err)
    return success(data)


def criar():
    body = parse_json()
    if not body.get("nome"):
        return bad_request("Nome é obrigatório.")
    data, err = _svc.criar(body, token=g.token)
    if err:
        return unprocessable(err)
    return created(data)


def atualizar(fid: str):
    body = parse_json()
    data, err = _svc.atualizar(fid, body, token=g.token)
    if err == "not_found":
        return not_found("Funcionário não encontrado.")
    if err:
        return unprocessable(err)
    return success(data)


def deletar(fid: str):
    data, err = _svc.deletar(fid, token=g.token)
    if err:
        return unprocessable(err)
    return no_content()


def importar():
    """
    Recebe lista de funcionários via JSON e faz importação em lote.
    Espera: { "registros": [{nome, cpf, matricula, ...}, ...] }
    """
    body      = parse_json()
    registros = body.get("registros", [])
    if not isinstance(registros, list) or not registros:
        return bad_request("registros deve ser uma lista não-vazia.")
    if len(registros) > 5000:
        return bad_request("Limite de 5.000 registros por importação.")

    # Filtra apenas campos permitidos
    _campos = ("nome", "cpf", "matricula", "cargo", "status",
               "setor", "turno", "email", "telefone", "empresa_id")
    limpos = [{k: v for k, v in r.items() if k in _campos} for r in registros]
    limpos = [r for r in limpos if r.get("nome")]  # descarta linhas sem nome

    if not limpos:
        return bad_request("Nenhum registro válido encontrado (nome obrigatório).")

    data, err = _svc.importar(limpos, token=g.token)
    if err:
        return unprocessable(err)
    return success(data, f"{data.get('importados', 0)} registro(s) importado(s).")
