"""
CRV Controle de Acesso — Serviço de Credenciais
Gerencia cartões, biometria, QR codes e PINs dos funcionários.
"""
import logging
from services.base_service import BaseService

logger = logging.getLogger("crv-acesso")

_CAMPOS = (
    "funcionario_id", "tipo", "identificador",
    "status", "validade", "empresa_id",
)


class CredenciaisService(BaseService):

    TABELA = "credenciais"

    def listar(self, token: str, filtros: str = ""):
        return self.sb.select(
            self.TABELA,
            filtros=filtros,
            select="*",
            order="created_at.desc",
            token=token,
        )

    def buscar(self, cid: str, token: str):
        data, err = self.sb.select(
            self.TABELA, filtros=f"id=eq.{cid}", token=token
        )
        if err:
            return None, err
        if not data:
            return None, "not_found"
        return data[0], None

    def criar(self, dados: dict, token: str):
        campos = {k: v for k, v in dados.items() if k in _CAMPOS}
        if not campos.get("funcionario_id"):
            return None, "funcionario_id é obrigatório."
        if not campos.get("tipo"):
            return None, "Tipo é obrigatório."
        if not campos.get("identificador"):
            return None, "Identificador é obrigatório."
        campos.setdefault("status", "ativo")
        data, err = self.sb.insert(self.TABELA, campos, token=token)
        if err:
            return None, err
        logger.info(f"[CREDENCIAIS] Criada para funcionario_id={campos.get('funcionario_id')}")
        return data, None

    def atualizar(self, cid: str, dados: dict, token: str):
        campos = {k: v for k, v in dados.items() if k in _CAMPOS}
        if not campos:
            return None, "Nenhum campo válido para atualizar."
        data, err = self.sb.update(
            self.TABELA, f"id=eq.{cid}", campos, token=token
        )
        if err:
            return None, err
        logger.info(f"[CREDENCIAIS] Atualizada: {cid}")
        return data, None

    def deletar(self, cid: str, token: str):
        _, err = self.sb.remove(self.TABELA, f"id=eq.{cid}", token=token)
        if err:
            return None, err
        logger.info(f"[CREDENCIAIS] Deletada: {cid}")
        return {"success": True}, None
