"""
CRV Controle de Acesso — Controller de Usuários
CRUD completo de usuários do sistema.
"""
from flask import g

from controllers.base_controller import parse_json, sanitize
from middlewares.permissao import (
    pode_criar_usuario,
    pode_excluir_usuario,
)
from services.usuarios_service import UsuariosService
from views.response import (
    bad_request, created, forbidden, no_content, not_found, success, unprocessable,
)

_svc  = UsuariosService()
_PERFIS = ("admin", "gerente", "operador", "portaria")


def listar():
    data, err = _svc.listar(token=g.token)
    if err:
        return unprocessable(err)
    return success(data)


def buscar(uid: str):
    data, err = _svc.buscar(uid, token=g.token)
    if err == "not_found":
        return not_found("Usuário não encontrado.")
    if err:
        return unprocessable(err)
    return success(data)


def criar():
    body   = parse_json()
    nome   = sanitize(body.get("nome", ""))
    email  = sanitize(body.get("email", ""))
    perfil = sanitize(body.get("perfil", ""))
    senha  = body.get("senha", "")

    if not all([nome, email, perfil, senha]):
        return bad_request("nome, email, perfil e senha são obrigatórios.")
    if perfil not in _PERFIS:
        return bad_request(f"Perfil inválido. Use: {', '.join(_PERFIS)}.")
    if len(senha) < 6:
        return bad_request("Senha deve ter no mínimo 6 caracteres.")

    ok, motivo = pode_criar_usuario(g.user_perfil, perfil)
    if not ok:
        return forbidden(motivo)

    dados = {
        "nome": nome, "email": email,
        "perfil": perfil, "senha": senha,
    }
    if body.get("empresa_id"):
        dados["empresa_id"] = body["empresa_id"]

    data, err = _svc.criar(dados, perfil_solicitante=g.user_perfil)
    if err:
        return unprocessable(err)
    return created(data)


def atualizar(uid: str):
    body   = parse_json()
    campos = {k: v for k, v in body.items() if k in ("nome", "perfil", "ativo", "empresa_id")}

    if "perfil" in campos:
        if campos["perfil"] not in _PERFIS:
            return bad_request(f"Perfil inválido. Use: {', '.join(_PERFIS)}.")
        ok, motivo = pode_criar_usuario(g.user_perfil, campos["perfil"])
        if not ok:
            return forbidden(motivo)

    if not campos:
        return bad_request("Nenhum campo válido para atualizar.")

    data, err = _svc.atualizar(uid, campos, token=g.token)
    if err == "not_found":
        return not_found("Usuário não encontrado.")
    if err:
        return unprocessable(err)
    return success(data)


def alterar_senha(uid: str):
    body       = parse_json()
    nova_senha = body.get("nova_senha", "")
    if not nova_senha or len(nova_senha) < 6:
        return bad_request("nova_senha deve ter no mínimo 6 caracteres.")
    data, err = _svc.alterar_senha(uid, nova_senha)
    if err:
        return unprocessable(err)
    return success(data)


def deletar(uid: str):
    ok, motivo = pode_excluir_usuario(g.user_perfil, g.user_id, uid)
    if not ok:
        return forbidden(motivo)
    data, err = _svc.deletar(uid, solicitante_id=g.user_id)
    if err:
        return unprocessable(err)
    return no_content()
