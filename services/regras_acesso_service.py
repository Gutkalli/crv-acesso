"""
CRV Controle de Acesso — Serviço de Regras de Acesso
Define quem pode acessar quais pontos e em quais horários.
"""
import logging
from services.base_service import BaseService

logger = logging.getLogger("crv-acesso")

_CAMPOS = (
    "nome", "descricao", "equipamento_id", "setor",
    "cargo", "turno", "horario_inicio", "horario_fim",
    "dias_semana", "ativo", "empresa_id",
)


class RegrasAcessoService(BaseService):

    TABELA = "regras_acesso"

    def listar(self, token: str, filtros: str = ""):
        return self.sb.select(
            self.TABELA,
            filtros=filtros,
            select="*",
            order="nome.asc",
            token=token,
        )

    def buscar(self, rid: str, token: str):
        data, err = self.sb.select(
            self.TABELA, filtros=f"id=eq.{rid}", token=token
        )
        if err:
            return None, err
        if not data:
            return None, "not_found"
        return data[0], None

    def criar(self, dados: dict, token: str):
        campos = {k: v for k, v in dados.items() if k in _CAMPOS}
        if not campos.get("nome"):
            return None, "Nome é obrigatório."
        campos.setdefault("ativo", True)
        data, err = self.sb.insert(self.TABELA, campos, token=token)
        if err:
            return None, err
        logger.info(f"[REGRAS] Criada: {campos.get('nome')}")
        return data, None

    def atualizar(self, rid: str, dados: dict, token: str):
        campos = {k: v for k, v in dados.items() if k in _CAMPOS}
        if not campos:
            return None, "Nenhum campo válido para atualizar."
        data, err = self.sb.update(
            self.TABELA, f"id=eq.{rid}", campos, token=token
        )
        if err:
            return None, err
        logger.info(f"[REGRAS] Atualizada: {rid}")
        return data, None

    def deletar(self, rid: str, token: str):
        _, err = self.sb.remove(self.TABELA, f"id=eq.{rid}", token=token)
        if err:
            return None, err
        logger.info(f"[REGRAS] Deletada: {rid}")
        return {"success": True}, None
