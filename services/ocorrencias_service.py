"""
CRV Controle de Acesso — Serviço de Ocorrências
Registro e acompanhamento de incidentes de segurança.
"""
import logging
from services.base_service import BaseService

logger = logging.getLogger("crv-acesso")

_CAMPOS = (
    "tipo", "prioridade", "status", "descricao",
    "local", "funcionario_id", "responsavel_id",
    "data_ocorrencia", "empresa_id",
)


class OcorrenciasService(BaseService):

    TABELA = "ocorrencias"

    def listar(self, token: str, filtros: str = ""):
        return self.sb.select(
            self.TABELA,
            filtros=filtros,
            select="*",
            order="created_at.desc",
            token=token,
        )

    def buscar(self, oid: str, token: str):
        data, err = self.sb.select(
            self.TABELA, filtros=f"id=eq.{oid}", token=token
        )
        if err:
            return None, err
        if not data:
            return None, "not_found"
        return data[0], None

    def criar(self, dados: dict, token: str):
        campos = {k: v for k, v in dados.items() if k in _CAMPOS}
        if not campos.get("tipo"):
            return None, "Tipo é obrigatório."
        if not campos.get("descricao"):
            return None, "Descrição é obrigatória."
        campos.setdefault("prioridade", "media")
        campos.setdefault("status", "aberta")
        data, err = self.sb.insert(self.TABELA, campos, token=token)
        if err:
            return None, err
        logger.info(f"[OCORRENCIAS] Criada: tipo={campos.get('tipo')}")
        return data, None

    def atualizar(self, oid: str, dados: dict, token: str):
        campos = {k: v for k, v in dados.items() if k in _CAMPOS}
        if not campos:
            return None, "Nenhum campo válido para atualizar."
        data, err = self.sb.update(
            self.TABELA, f"id=eq.{oid}", campos, token=token
        )
        if err:
            return None, err
        logger.info(f"[OCORRENCIAS] Atualizada: {oid}")
        return data, None

    def deletar(self, oid: str, token: str):
        _, err = self.sb.remove(self.TABELA, f"id=eq.{oid}", token=token)
        if err:
            return None, err
        logger.info(f"[OCORRENCIAS] Deletada: {oid}")
        return {"success": True}, None
