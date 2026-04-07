"""
CRV Controle de Acesso — Serviço de Acessos
Log de passagens: entradas, saídas, liberações e negativas.
"""
import logging
from services.base_service import BaseService

logger = logging.getLogger("crv-acesso")

_CAMPOS = (
    "funcionario_id", "equipamento_id", "credencial_id",
    "tipo", "metodo", "resultado", "motivo_negacao",
    "data", "empresa_id",
)


class AcessosService(BaseService):

    TABELA = "acessos"

    def listar(self, token: str, filtros: str = ""):
        return self.sb.select(
            self.TABELA,
            filtros=filtros,
            select="*",
            order="data.desc",
            token=token,
        )

    def buscar(self, aid: str, token: str):
        data, err = self.sb.select(
            self.TABELA, filtros=f"id=eq.{aid}", token=token
        )
        if err:
            return None, err
        if not data:
            return None, "not_found"
        return data[0], None

    def registrar(self, dados: dict, token: str):
        """Registra um evento de acesso (entrada/saída/negado)."""
        campos = {k: v for k, v in dados.items() if k in _CAMPOS}
        if not campos.get("resultado"):
            return None, "resultado é obrigatório (liberado|negado)."
        if campos.get("resultado") not in ("liberado", "negado"):
            return None, "resultado deve ser 'liberado' ou 'negado'."
        data, err = self.sb.insert(self.TABELA, campos, token=token)
        if err:
            return None, err
        logger.info(f"[ACESSOS] Registrado: resultado={campos.get('resultado')}")
        return data, None

    def stats_hoje(self, token: str, data_ref: str):
        """
        Retorna contagens de acessos para a data_ref (YYYY-MM-DD).
        Usa count() paginado para minimizar payload.
        """
        base = f"data=gte.{data_ref}T00:00:00&data=lte.{data_ref}T23:59:59"
        total, _   = self.sb.count(self.TABELA, base, token=token)
        negados, _ = self.sb.count(self.TABELA, f"{base}&resultado=eq.negado", token=token)
        return {
            "total":   total,
            "negados": negados,
            "liberados": total - negados,
        }, None
