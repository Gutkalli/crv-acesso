"""
CRV Controle de Acesso — Serviço de Usuários
CRUD completo de usuários do sistema com suporte a Auth Supabase.
"""
import logging
from services.base_service import BaseService

logger = logging.getLogger("crv-acesso")


class UsuariosService(BaseService):

    TABELA = "usuarios"

    # ------------------------------------------------------------------ #
    #  LISTAR
    # ------------------------------------------------------------------ #

    def listar(self, token: str):
        return self.sb.select(
            self.TABELA,
            select="id,nome,email,perfil,ativo,empresa_id,created_at",
            order="nome.asc",
            token=token,
        )

    # ------------------------------------------------------------------ #
    #  BUSCAR POR ID
    # ------------------------------------------------------------------ #

    def buscar(self, uid: str, token: str):
        data, err = self.sb.select(
            self.TABELA,
            filtros=f"id=eq.{uid}",
            select="id,nome,email,perfil,ativo,empresa_id,created_at",
            token=token,
        )
        if err:
            return None, err
        if not data:
            return None, "not_found"
        return data[0], None

    # ------------------------------------------------------------------ #
    #  CRIAR
    # ------------------------------------------------------------------ #

    def criar(self, dados: dict, perfil_solicitante: str):
        """
        Cria usuário no Auth Supabase e insere registro na tabela usuarios.
        Faz rollback do Auth se a inserção na tabela falhar.
        """
        email  = dados["email"]
        senha  = dados["senha"]
        nome   = dados["nome"]
        perfil = dados["perfil"]

        # 1. Cria no Auth (service_role)
        auth_data, err = self.sb.post(
            "/auth/v1/admin/users",
            {"email": email, "password": senha, "email_confirm": True},
        )
        if err:
            logger.error(f"[USUARIOS] Auth create error: {err}")
            return None, f"Erro ao criar credencial de acesso: {err}"

        auth_id = (auth_data or {}).get("id")
        if not auth_id:
            return None, "ID não retornado pelo autenticador."

        # 2. Insere na tabela usuarios
        payload = {
            "id":     auth_id,
            "nome":   nome,
            "email":  email,
            "perfil": perfil,
            "ativo":  True,
        }
        if dados.get("empresa_id"):
            payload["empresa_id"] = dados["empresa_id"]

        db_data, err = self.sb.insert(self.TABELA, payload)
        if err:
            # Rollback: remove do Auth
            self.sb.delete(f"/auth/v1/admin/users/{auth_id}")
            logger.error(f"[USUARIOS] DB insert error (rollback auth): {err}")
            return None, f"Erro ao salvar usuário no banco: {err}"

        logger.info(f"[USUARIOS] Criado: {email}")
        return db_data, None

    # ------------------------------------------------------------------ #
    #  ATUALIZAR
    # ------------------------------------------------------------------ #

    def atualizar(self, uid: str, dados: dict, token: str):
        campos = {
            k: v for k, v in dados.items()
            if k in ("nome", "perfil", "ativo", "empresa_id")
        }
        if not campos:
            return None, "Nenhum campo válido para atualizar."

        data, err = self.sb.update(
            self.TABELA, f"id=eq.{uid}", campos, token=token
        )
        if err:
            return None, err

        logger.info(f"[USUARIOS] Atualizado: {uid}")
        return data, None

    # ------------------------------------------------------------------ #
    #  ALTERAR SENHA
    # ------------------------------------------------------------------ #

    def alterar_senha(self, uid: str, nova_senha: str):
        data, err = self.sb.patch(
            f"/auth/v1/admin/users/{uid}",
            {"password": nova_senha},
        )
        if err:
            return None, err
        logger.info(f"[USUARIOS] Senha alterada: {uid}")
        return {"success": True}, None

    # ------------------------------------------------------------------ #
    #  DELETAR
    # ------------------------------------------------------------------ #

    def deletar(self, uid: str, solicitante_id: str):
        if uid == solicitante_id:
            return None, "Não é possível excluir seu próprio usuário."

        self.sb.remove(self.TABELA, f"id=eq.{uid}")
        self.sb.delete(f"/auth/v1/admin/users/{uid}")

        logger.info(f"[USUARIOS] Deletado: {uid}")
        return {"success": True}, None
