"""
CRV Controle de Acesso — Serviço de Auditoria
Registro imutável de todas as ações sensíveis do sistema.
Sempre usa service_role para garantir que o log não passe por RLS.
"""
import logging
from datetime import datetime, timezone

from services.base_service import BaseService

logger = logging.getLogger("crv-acesso")

NIVEIS = ("info", "aviso", "critico")


class AuditoriaService(BaseService):

    TABELA = "auditoria"

    def listar(self, token: str, filtros: str = ""):
        return self.sb.select(
            self.TABELA,
            filtros=filtros,
            select="*",
            order="data.desc",
            token=token,
        )

    def registrar(
        self,
        usuario_id: str,
        usuario_email: str,
        acao: str,
        modulo: str,
        descricao: str = "",
        nivel: str = "info",
        dados_extras: dict = None,
    ):
        """
        Insere um registro de auditoria via service_role (sem token de usuário).
        Isso garante que mesmo usuários sem permissão não possam bloquear o log.
        """
        if nivel not in NIVEIS:
            nivel = "info"
        payload = {
            "usuario_id":    usuario_id,
            "usuario_email": usuario_email,
            "acao":          acao,
            "modulo":        modulo,
            "descricao":     descricao,
            "nivel":         nivel,
            "data":          datetime.now(timezone.utc).isoformat(),
        }
        if dados_extras and isinstance(dados_extras, dict):
            payload["dados_extras"] = dados_extras
        data, err = self.sb.insert(self.TABELA, payload)  # sem token = service_role
        if err:
            logger.error(f"[AUDITORIA] Falha ao registrar: {err}")
        return data, err
