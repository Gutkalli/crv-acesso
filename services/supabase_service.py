"""
CRV Controle de Acesso — Supabase HTTP Client
Camada base de comunicação com o Supabase REST API.
Utiliza apenas urllib (stdlib) — sem dependências extras.
"""
import json
import logging
import urllib.error
import urllib.request
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger("crv-acesso")

# Tipos auxiliares
Data   = Optional[Any]
ErrMsg = Optional[str]
Result = Tuple[Data, ErrMsg]


class SupabaseService:
    """
    Cliente HTTP para Supabase REST API.
    Gerencia autenticação via service_role (operações admin)
    e user_token (operações autenticadas pelo usuário logado).
    """

    def __init__(self):
        from config import Config
        self._url     = Config.SUPABASE_URL
        self._anon    = Config.SUPABASE_ANON_KEY
        self._service = Config.SUPABASE_SERVICE_ROLE_KEY

    # ------------------------------------------------------------------ #
    #  HEADERS
    # ------------------------------------------------------------------ #

    def _headers(
        self,
        token: Optional[str] = None,
        prefer: Optional[str] = None,
    ) -> Dict:
        """
        Se token for None → usa service_role (admin total).
        Se token for fornecido → usa token do usuário (respeita RLS).
        """
        if token:
            api_key = self._anon
            bearer  = token
        else:
            api_key = self._service
            bearer  = self._service

        h = {
            "apikey":        api_key,
            "Authorization": f"Bearer {bearer}",
            "Content-Type":  "application/json",
        }
        if prefer:
            h["Prefer"] = prefer
        return h

    # ------------------------------------------------------------------ #
    #  HTTP PRIMITIVO
    # ------------------------------------------------------------------ #

    def _request(
        self,
        method:  str,
        path:    str,
        payload: Any = None,
        token:   Optional[str] = None,
        prefer:  Optional[str] = None,
    ) -> Result:
        url     = f"{self._url}{path}"
        headers = self._headers(token, prefer)
        body    = json.dumps(payload).encode() if payload is not None else None

        req = urllib.request.Request(
            url, data=body, headers=headers, method=method
        )
        try:
            with urllib.request.urlopen(req, timeout=10) as r:
                text = r.read().decode()
                return (json.loads(text) if text.strip() else {}), None

        except urllib.error.HTTPError as e:
            err = e.read().decode()
            logger.error(f"[SB] {method} {path} → HTTP {e.code}: {err[:300]}")
            return None, err

        except Exception as e:
            logger.error(f"[SB] {method} {path} → {e}")
            return None, str(e)

    # ------------------------------------------------------------------ #
    #  MÉTODOS PÚBLICOS
    # ------------------------------------------------------------------ #

    def get(self, path: str, token=None) -> Result:
        return self._request("GET", path, token=token)

    def post(
        self,
        path:    str,
        payload: Any,
        token:   Optional[str] = None,
        prefer:  str = "return=representation",
    ) -> Result:
        return self._request("POST", path, payload=payload, token=token, prefer=prefer)

    def patch(self, path: str, payload: Any, token=None) -> Result:
        return self._request(
            "PATCH", path, payload=payload, token=token,
            prefer="return=representation"
        )

    def delete(self, path: str, token=None) -> Result:
        return self._request("DELETE", path, token=token)

    # ------------------------------------------------------------------ #
    #  ATALHOS PARA TABELAS REST
    # ------------------------------------------------------------------ #

    def select(
        self,
        tabela:  str,
        filtros: str = "",
        select:  str = "*",
        order:   Optional[str] = None,
        limit:   Optional[int] = None,
        offset:  Optional[int] = None,
        token:   Optional[str] = None,
    ) -> Result:
        path = f"/rest/v1/{tabela}?select={select}"
        if filtros:
            path += f"&{filtros}"
        if order:
            path += f"&order={order}"
        if limit is not None:
            path += f"&limit={limit}"
        if offset is not None:
            path += f"&offset={offset}"
        return self.get(path, token=token)

    def insert(self, tabela: str, payload: Any, token=None) -> Result:
        return self.post(f"/rest/v1/{tabela}", payload, token=token)

    def update(
        self, tabela: str, filtro: str, payload: Any, token=None
    ) -> Result:
        return self.patch(f"/rest/v1/{tabela}?{filtro}", payload, token=token)

    def remove(self, tabela: str, filtro: str, token=None) -> Result:
        return self.delete(f"/rest/v1/{tabela}?{filtro}", token=token)

    def count(self, tabela: str, filtros: str = "", token=None) -> Tuple[int, ErrMsg]:
        path = f"/rest/v1/{tabela}?select=id"
        if filtros:
            path += f"&{filtros}"
        data, err = self.get(path, token=token)
        if err:
            return 0, err
        return len(data) if isinstance(data, list) else 0, None
