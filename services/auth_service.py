"""
CRV Controle de Acesso — Serviço de Autenticação
Wrapper sobre Supabase Auth (login, logout, 2FA, senha).
"""
import logging
from services.base_service import BaseService

logger = logging.getLogger("crv-acesso")


class AuthService(BaseService):

    # ------------------------------------------------------------------ #
    #  LOGIN / LOGOUT
    # ------------------------------------------------------------------ #

    def login(self, email: str, senha: str):
        """Autentica via Supabase. Retorna (session_data, erro)."""
        data, err = self.sb.post(
            "/auth/v1/token?grant_type=password",
            {"email": email, "password": senha},
        )
        if err:
            logger.warning(f"[AUTH] Falha login: {email}")
            return None, "Credenciais inválidas."
        logger.info(f"[AUTH] Login: {email}")
        return data, None

    def logout(self, token: str):
        """Invalida o token no Supabase."""
        self.sb.post("/auth/v1/logout", {}, token=token)
        return {"success": True}, None

    # ------------------------------------------------------------------ #
    #  USUÁRIO LOGADO
    # ------------------------------------------------------------------ #

    def usuario_logado(self, token: str):
        """Retorna dados do usuário a partir do JWT."""
        data, err = self.sb.get("/auth/v1/user", token=token)
        if err or not data or not data.get("id"):
            return None, "Token inválido ou expirado."
        return data, None

    def buscar_perfil_db(self, uid: str, token: str):
        """Busca perfil e empresa do usuário na tabela usuarios."""
        data, err = self.sb.select(
            "usuarios",
            filtros=f"id=eq.{uid}",
            select="id,nome,email,perfil,ativo,empresa_id",
            token=token,
        )
        if err:
            return None, err
        if not data:
            return None, "Usuário não encontrado."
        u = data[0]
        if not u.get("ativo"):
            return None, "Usuário inativo."
        return u, None

    # ------------------------------------------------------------------ #
    #  SENHA
    # ------------------------------------------------------------------ #

    def recuperar_senha(self, email: str):
        """Envia e-mail de recuperação via Supabase. Sempre retorna sucesso."""
        self.sb.post("/auth/v1/recover", {"email": email})
        logger.info(f"[AUTH] Reset solicitado: {email}")
        return {"success": True}, None

    def alterar_senha_logado(self, token: str, nova_senha: str):
        """Altera senha do próprio usuário autenticado."""
        data, err = self.sb.patch(
            "/auth/v1/user",
            {"password": nova_senha},
            token=token,
        )
        if err:
            return None, err
        return {"success": True}, None

    # ------------------------------------------------------------------ #
    #  2FA — TOTP
    # ------------------------------------------------------------------ #

    def enroll_2fa(self, token: str):
        """Inicia cadastro de fator TOTP. Retorna QR code e secret."""
        data, err = self.sb.post(
            "/auth/v1/factors",
            {"factor_type": "totp", "friendly_name": "Autenticador CRV"},
            token=token,
        )
        if err:
            return None, f"Erro ao iniciar 2FA: {err}"
        totp = (data or {}).get("totp", {})
        return {
            "id":       (data or {}).get("id"),
            "qr_code":  totp.get("qr_code"),
            "secret":   totp.get("secret"),
        }, None

    def challenge_2fa(self, token: str, factor_id: str):
        """Cria desafio para verificação do fator TOTP."""
        data, err = self.sb.post(
            f"/auth/v1/factors/{factor_id}/challenge",
            {},
            token=token,
        )
        if err:
            return None, f"Erro ao criar desafio 2FA: {err}"
        return {"challenge_id": (data or {}).get("id")}, None

    def verify_2fa(self, token: str, factor_id: str, challenge_id: str, code: str):
        """Verifica o código TOTP e ativa o fator."""
        data, err = self.sb.post(
            f"/auth/v1/factors/{factor_id}/verify",
            {"challenge_id": challenge_id, "code": code},
            token=token,
        )
        if err:
            return None, "Código inválido ou expirado."
        # Marca 2FA como ativo na tabela usuarios
        uid = (data or {}).get("user", {}).get("id")
        if uid:
            self.sb.update(
                "usuarios", f"id=eq.{uid}",
                {"twofa_ativo": True}, token=token,
            )
        return {"success": True}, None

    def unenroll_2fa(self, token: str, factor_id: str, uid: str):
        """Remove fator TOTP e atualiza flag na tabela usuarios."""
        self.sb.delete(f"/auth/v1/factors/{factor_id}", token=token)
        self.sb.update(
            "usuarios", f"id=eq.{uid}",
            {"twofa_ativo": False}, token=token,
        )
        logger.info(f"[AUTH] 2FA removido para uid={uid}")
        return {"success": True}, None
