"""
CRV Controle de Acesso — Serviço de Funcionários
"""
import logging
from services.base_service import BaseService

logger = logging.getLogger("crv-acesso")


class FuncionariosService(BaseService):

    TABELA = "funcionarios"

    def listar(self, token: str, filtros: str = ""):
        return self.sb.select(
            self.TABELA,
            filtros=filtros,
            select="*",
            order="nome.asc",
            token=token,
        )

    def buscar(self, fid: str, token: str):
        data, err = self.sb.select(
            self.TABELA, filtros=f"id=eq.{fid}", token=token
        )
        if err:
            return None, err
        if not data:
            return None, "not_found"
        return data[0], None

    def criar(self, dados: dict, token: str):
        campos = {
            k: v for k, v in dados.items()
            if k in ("nome", "cpf", "matricula", "cargo", "status",
                     "setor", "turno", "email", "telefone", "empresa_id")
        }
        if not campos.get("nome"):
            return None, "Nome é obrigatório."
        campos.setdefault("status", "ativo")
        data, err = self.sb.insert(self.TABELA, campos, token=token)
        if err:
            return None, err
        logger.info(f"[FUNCIONARIOS] Criado: {campos.get('nome')}")
        return data, None

    def atualizar(self, fid: str, dados: dict, token: str):
        campos = {
            k: v for k, v in dados.items()
            if k in ("nome", "cpf", "matricula", "cargo", "status",
                     "setor", "turno", "email", "telefone", "empresa_id")
        }
        if not campos:
            return None, "Nenhum campo válido para atualizar."
        data, err = self.sb.update(self.TABELA, f"id=eq.{fid}", campos, token=token)
        if err:
            return None, err
        logger.info(f"[FUNCIONARIOS] Atualizado: {fid}")
        return data, None

    def deletar(self, fid: str, token: str):
        _, err = self.sb.remove(self.TABELA, f"id=eq.{fid}", token=token)
        if err:
            return None, err
        logger.info(f"[FUNCIONARIOS] Deletado: {fid}")
        return {"success": True}, None

    def importar(self, registros: list, token: str):
        if not registros:
            return None, "Nenhum registro para importar."
        sucesso, erros = 0, 0
        lote = 50
        for i in range(0, len(registros), lote):
            _, err = self.sb.insert(self.TABELA, registros[i:i+lote], token=token)
            if err:
                erros += len(registros[i:i+lote])
            else:
                sucesso += len(registros[i:i+lote])
        return {"importados": sucesso, "erros": erros}, None
