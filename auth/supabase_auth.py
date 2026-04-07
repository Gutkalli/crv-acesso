"""
CRV Controle de Acesso — Validação de Token Supabase
Responsável por verificar JWTs e montar o contexto do usuário logado.
"""
import logging
from typing import Optional, Tuple

from services.supabase_service import SupabaseService

logger = logging.getLogger("crv-acesso")

_sb = SupabaseService()


def validar_token(token: str) -> Tuple[Optional[dict], Optional[str]]:
    """
    Valida o JWT junto ao Supabase Auth.
    Retorna (user_auth_data, erro).
    user_auth_data contém: id, email, role, etc.
    """
    if not token or not token.strip():
        return None, "Token ausente."

    data, err = _sb.get("/auth/v1/user", token=token)
    if err:
        return None, "Token inválido ou expirado."
    if not data or not data.get("id"):
        return None, "Token inválido: sem ID de usuário."

    return data, None


def buscar_perfil(user_id: str, token: str) -> Tuple[Optional[dict], Optional[str]]:
    """
    Busca o perfil completo do usuário na tabela `usuarios`.
    Retorna (usuario_dict, erro).
    usuario_dict contém: id, nome, email, perfil, ativo, empresa_id.
    """
    data, err = _sb.select(
        "usuarios",
        filtros=f"id=eq.{user_id}",
        select="id,nome,email,perfil,ativo,empresa_id",
        token=token,
    )
    if err:
        logger.error(f"[AUTH] Erro ao buscar perfil uid={user_id}: {err}")
        return None, "Erro ao verificar permissões."
    if not data:
        return None, "Usuário não registrado no sistema."
    usuario = data[0]
    if not usuario.get("ativo", True):
        return None, "Conta desativada."
    return usuario, None


def extrair_token(authorization_header: str) -> Tuple[Optional[str], Optional[str]]:
    """
    Extrai o Bearer token do header Authorization.
    Retorna (token, erro).
    """
    if not authorization_header:
        return None, "Header Authorization ausente."
    partes = authorization_header.split(" ", 1)
    if len(partes) != 2 or partes[0].lower() != "bearer":
        return None, "Formato inválido. Use: Bearer <token>"
    token = partes[1].strip()
    if not token:
        return None, "Token vazio."
    return token, None
