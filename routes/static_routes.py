"""
CRV Controle de Acesso — Rotas de Arquivos Estáticos / SPA
Serve o HTML, CSS e JS da interface e o health check.
"""
import os
from datetime import datetime, timezone

from flask import Blueprint, jsonify, send_from_directory

from services.supabase_service import SupabaseService

static_bp = Blueprint("static", __name__)

_BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_sb = SupabaseService()


@static_bp.route("/health")
def health():
    """Verifica se a aplicação e o Supabase estão operacionais."""
    _, err = _sb.select("usuarios", select="id", limit=1)
    sb_ok  = err is None
    return jsonify({
        "status":    "ok" if sb_ok else "degraded",
        "supabase":  "connected" if sb_ok else "error",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version":   "3.0",
    }), 200 if sb_ok else 207


@static_bp.route("/")
def index():
    return send_from_directory(_BASE_DIR, "dashboard.html")


@static_bp.route("/<path:path>")
def spa(path: str):
    """
    Serve arquivos estáticos ou redireciona para o HTML correspondente.
    Ordem de resolução:
      1. Arquivo na pasta /static/
      2. Arquivo .html na raiz
      3. Arquivo direto na raiz
      4. Fallback para dashboard.html (SPA)
    """
    # 1. Arquivo em /static/
    static_path = os.path.join(_BASE_DIR, "static", path)
    if os.path.isfile(static_path):
        return send_from_directory(os.path.join(_BASE_DIR, "static"), path)

    # 2. HTML sem extensão (ex: /funcionarios → funcionarios.html)
    if "." not in os.path.basename(path):
        html_file = os.path.join(_BASE_DIR, f"{path}.html")
        if os.path.isfile(html_file):
            return send_from_directory(_BASE_DIR, f"{path}.html")

    # 3. Arquivo na raiz
    root_file = os.path.join(_BASE_DIR, path)
    if os.path.isfile(root_file):
        return send_from_directory(_BASE_DIR, path)

    # 4. Fallback SPA
    return send_from_directory(_BASE_DIR, "dashboard.html")
