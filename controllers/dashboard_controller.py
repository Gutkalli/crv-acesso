"""
CRV Controle de Acesso — Controller do Dashboard
Agrega estatísticas de múltiplas tabelas em uma única chamada.
"""
from datetime import datetime, timezone

from flask import g

from services.acessos_service import AcessosService
from services.equipamentos_service import EquipamentosService
from services.funcionarios_service import FuncionariosService
from services.ocorrencias_service import OcorrenciasService
from views.response import success

_func  = FuncionariosService()
_equip = EquipamentosService()
_acess = AcessosService()
_ocorr = OcorrenciasService()


def stats():
    hoje  = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    token = g.token

    func_data,  _ = _func.listar(token=token, filtros="")
    equip_data, _ = _equip.listar(token=token, filtros="")
    ocorr_data, _ = _ocorr.listar(token=token, filtros="status=eq.aberta")
    acess_stats, _ = _acess.stats_hoje(token=token, data_ref=hoje)

    funcionarios = func_data  or []
    equipamentos = equip_data or []
    ocorrencias  = ocorr_data or []
    astat        = acess_stats or {}

    return success({
        "totalFuncionarios":   len(funcionarios),
        "ativos":              sum(1 for f in funcionarios if f.get("status") == "ativo"),
        "inativos":            sum(1 for f in funcionarios if f.get("status") != "ativo"),
        "acessosHoje":         astat.get("total", 0),
        "acessosNegados":      astat.get("negados", 0),
        "acessosLiberados":    astat.get("liberados", 0),
        "equipamentosOnline":  sum(1 for e in equipamentos if e.get("status") == "online"),
        "equipamentosOffline": sum(1 for e in equipamentos if e.get("status") == "offline"),
        "ocorrenciasAbertas":  len(ocorrencias),
        "timestamp":           datetime.now(timezone.utc).isoformat(),
    })
