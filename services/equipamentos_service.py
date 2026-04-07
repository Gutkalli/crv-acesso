"""
CRV Controle de Acesso — Serviço de Equipamentos
CRUD de catracas, câmeras, leitores e demais equipamentos.
"""
import base64
import logging
import urllib.error
import urllib.request

from services.base_service import BaseService

logger = logging.getLogger("crv-acesso")

_CAMPOS = (
    "nome", "tipo", "modelo", "fabricante",
    "ip", "porta", "localizacao", "status",
    "usuario_dispositivo", "empresa_id",
)


class EquipamentosService(BaseService):

    TABELA = "equipamentos"

    def listar(self, token: str, filtros: str = ""):
        return self.sb.select(
            self.TABELA,
            filtros=filtros,
            select="*",
            order="nome.asc",
            token=token,
        )

    def buscar(self, eid: str, token: str):
        data, err = self.sb.select(
            self.TABELA, filtros=f"id=eq.{eid}", token=token
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
        if not campos.get("tipo"):
            return None, "Tipo é obrigatório."
        campos.setdefault("status", "offline")
        data, err = self.sb.insert(self.TABELA, campos, token=token)
        if err:
            return None, err
        logger.info(f"[EQUIPAMENTOS] Criado: {campos.get('nome')}")
        return data, None

    def atualizar(self, eid: str, dados: dict, token: str):
        campos = {k: v for k, v in dados.items() if k in _CAMPOS}
        if not campos:
            return None, "Nenhum campo válido para atualizar."
        data, err = self.sb.update(
            self.TABELA, f"id=eq.{eid}", campos, token=token
        )
        if err:
            return None, err
        logger.info(f"[EQUIPAMENTOS] Atualizado: {eid}")
        return data, None

    def deletar(self, eid: str, token: str):
        _, err = self.sb.remove(self.TABELA, f"id=eq.{eid}", token=token)
        if err:
            return None, err
        logger.info(f"[EQUIPAMENTOS] Deletado: {eid}")
        return {"success": True}, None

    # ------------------------------------------------------------------ #
    #  TESTE DE CONEXÃO (comunicação direta com o dispositivo)
    # ------------------------------------------------------------------ #

    def testar_conexao(self, ip: str, porta: int, usuario: str = "admin", senha: str = ""):
        """
        Tenta estabelecer conexão HTTP com o dispositivo.
        Retorna dict com status e código HTTP.
        """
        url = f"http://{ip}:{porta}/systemManager.fcgi?session=0"
        req = urllib.request.Request(url, method="POST")
        req.add_header("Content-Type", "application/x-www-form-urlencoded")
        if usuario:
            cred = base64.b64encode(f"{usuario}:{senha}".encode()).decode()
            req.add_header("Authorization", f"Basic {cred}")
        try:
            with urllib.request.urlopen(req, timeout=5) as resp:
                return {"online": True, "codigo_http": resp.status}, None
        except urllib.error.HTTPError as e:
            # Código HTTP ≠ 2xx mas o dispositivo respondeu → online
            return {"online": True, "codigo_http": e.code}, None
        except urllib.error.URLError as e:
            return {"online": False, "erro": str(e.reason)}, None
        except Exception as e:
            return {"online": False, "erro": str(e)}, None
