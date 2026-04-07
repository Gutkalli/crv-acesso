"""
CRV Controle de Acesso — Controller de Exportação CSV
Gera arquivos CSV para download diretamente no servidor.
"""
from datetime import datetime, timezone

from flask import Response, g, request

from services.supabase_service import SupabaseService
from views.response import bad_request, unprocessable

_sb = SupabaseService()

_TABELAS = {
    "funcionarios": {
        "campos":    ["nome", "cpf", "matricula", "cargo", "status", "setor", "turno", "email", "telefone", "created_at"],
        "data_col":  "created_at",
    },
    "equipamentos": {
        "campos":    ["nome", "tipo", "modelo", "ip", "localizacao", "status", "created_at"],
        "data_col":  "created_at",
    },
    "credenciais": {
        "campos":    ["tipo", "identificador", "status", "validade", "created_at"],
        "data_col":  "created_at",
    },
    "ocorrencias": {
        "campos":    ["tipo", "prioridade", "status", "local", "descricao", "created_at"],
        "data_col":  "created_at",
    },
    "acessos": {
        "campos":    ["tipo", "metodo", "resultado", "motivo_negacao", "data"],
        "data_col":  "data",
    },
    "auditoria": {
        "campos":    ["usuario_email", "acao", "modulo", "descricao", "nivel", "data"],
        "data_col":  "data",
    },
}


def exportar(tabela: str):
    if tabela not in _TABELAS:
        return bad_request(f'Tabela "{tabela}" não permitida para exportação.')

    cfg      = _TABELAS[tabela]
    campos   = cfg["campos"]
    col_data = cfg["data_col"]
    data_ini = request.args.get("data_ini", "")
    data_fim = request.args.get("data_fim", "")

    query = f"&select={','.join(campos)}&order={col_data}.desc&limit=50000"
    filtros_partes = []
    if data_ini:
        filtros_partes.append(f"{col_data}=gte.{data_ini}T00:00:00")
    if data_fim:
        filtros_partes.append(f"{col_data}=lte.{data_fim}T23:59:59")
    filtros = "&".join(filtros_partes)

    dados, err = _sb.select(
        tabela,
        filtros=filtros,
        select=",".join(campos),
        order=f"{col_data}.desc",
        limit=50000,
        token=g.token,
    )
    if err:
        return unprocessable(err)

    # Monta CSV com BOM UTF-8 para compatibilidade com Excel
    linhas = [";".join(campos)]
    for row in (dados or []):
        linha = ";".join(
            '"' + str(row.get(c, "")).replace('"', '""') + '"'
            for c in campos
        )
        linhas.append(linha)

    csv_text  = "\n".join(linhas)
    filename  = f"CRV_{tabela}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"

    return Response(
        "\uFEFF" + csv_text,
        mimetype="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
