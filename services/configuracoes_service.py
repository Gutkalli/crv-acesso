"""
CRV Controle de Acesso — Serviço de Configurações
Gerencia as configurações globais do sistema (registro único por empresa).
"""
import logging
from services.base_service import BaseService

logger = logging.getLogger("crv-acesso")

_CAMPOS = (
    "empresa_nome", "empresa_cnpj", "empresa_id",
    "smtp_host", "smtp_porta", "smtp_usuario", "smtp_ssl",
    "notif_email", "notif_whatsapp", "notif_sistema",
    "backup_automatico", "backup_intervalo",
    "tentativas_bloqueio", "tempo_sessao",
    "logo_url", "tema",
)


class ConfiguracoesService(BaseService):

    TABELA = "configuracoes"

    def buscar(self, token: str, empresa_id: str = None):
        """Retorna as configurações. Filtra por empresa_id se fornecido."""
        filtros = f"empresa_id=eq.{empresa_id}" if empresa_id else ""
        data, err = self.sb.select(
            self.TABELA, filtros=filtros, select="*", token=token
        )
        if err:
            return None, err
        if not data:
            return {}, None  # Ainda não configurado — retorna objeto vazio
        return data[0], None

    def salvar(self, dados: dict, token: str, empresa_id: str = None):
        """
        Upsert das configurações.
        Se já existe um registro para a empresa, faz PATCH; caso contrário, INSERT.
        """
        campos = {k: v for k, v in dados.items() if k in _CAMPOS}
        if not campos:
            return None, "Nenhum campo válido para salvar."

        filtros = f"empresa_id=eq.{empresa_id}" if empresa_id else ""
        existente, _ = self.sb.select(
            self.TABELA, filtros=filtros, select="id", token=token
        )

        if existente:
            rid = existente[0]["id"]
            data, err = self.sb.update(
                self.TABELA, f"id=eq.{rid}", campos, token=token
            )
        else:
            if empresa_id:
                campos["empresa_id"] = empresa_id
            data, err = self.sb.insert(self.TABELA, campos, token=token)

        if err:
            return None, err
        logger.info("[CONFIG] Configurações salvas.")
        return data, None
