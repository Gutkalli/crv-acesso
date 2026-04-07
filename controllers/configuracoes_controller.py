"""
CRV Controle de Acesso — Controller de Configurações
Leitura e salvamento das configurações globais do sistema.
"""
from flask import g

from controllers.base_controller import parse_json
from middlewares.permissao import pode_alterar_configuracoes
from services.configuracoes_service import ConfiguracoesService
from views.response import forbidden, success, unprocessable

_svc = ConfiguracoesService()


def buscar():
    data, err = _svc.buscar(token=g.token, empresa_id=g.empresa_id)
    if err:
        return unprocessable(err)
    return success(data)


def salvar():
    ok, motivo = pode_alterar_configuracoes(g.user_perfil)
    if not ok:
        return forbidden(motivo)
    body = parse_json()
    data, err = _svc.salvar(body, token=g.token, empresa_id=g.empresa_id)
    if err:
        return unprocessable(err)
    return success(data, "Configurações salvas com sucesso.")
