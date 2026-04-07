"""
CRV Controle de Acesso — Regras de Negócio de Permissão
Funções puras que verificam se uma ação é permitida para um determinado perfil.
"""

# Hierarquia de perfis: admin > gerente > operador > portaria
_HIERARQUIA = {"admin": 4, "gerente": 3, "operador": 2, "portaria": 1}


def _nivel(perfil: str) -> int:
    return _HIERARQUIA.get(perfil, 0)


def pode_criar_usuario(perfil_solicitante: str, perfil_alvo: str) -> tuple[bool, str]:
    """
    Gerente pode criar operador e portaria.
    Admin pode criar qualquer perfil.
    Nenhum perfil pode criar um nível igual ou superior ao seu (exceto admin).
    """
    if perfil_solicitante == "admin":
        return True, ""
    if perfil_solicitante == "gerente":
        if _nivel(perfil_alvo) >= _nivel("gerente"):
            return False, "Gerente não pode criar usuário com perfil igual ou superior."
        return True, ""
    return False, "Apenas admin e gerente podem criar usuários."


def pode_editar_usuario(perfil_solicitante: str, perfil_alvo: str) -> tuple[bool, str]:
    """Mesma regra da criação para edição."""
    return pode_criar_usuario(perfil_solicitante, perfil_alvo)


def pode_excluir_usuario(
    perfil_solicitante: str,
    uid_solicitante: str,
    uid_alvo: str,
) -> tuple[bool, str]:
    """
    Somente admin pode excluir.
    Ninguém pode excluir a si mesmo.
    """
    if uid_solicitante == uid_alvo:
        return False, "Não é possível excluir seu próprio usuário."
    if perfil_solicitante != "admin":
        return False, "Somente admin pode excluir usuários."
    return True, ""


def pode_ver_auditoria(perfil: str) -> tuple[bool, str]:
    if perfil not in ("admin", "gerente"):
        return False, "Auditoria disponível apenas para admin e gerente."
    return True, ""


def pode_alterar_configuracoes(perfil: str) -> tuple[bool, str]:
    if perfil != "admin":
        return False, "Somente admin pode alterar configurações do sistema."
    return True, ""


def pode_gerenciar_regras(perfil: str) -> tuple[bool, str]:
    if perfil not in ("admin", "gerente"):
        return False, "Apenas admin e gerente podem gerenciar regras de acesso."
    return True, ""
