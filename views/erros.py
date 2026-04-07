"""
CRV Controle de Acesso — Handlers de Erro HTTP Globais
Registra tratamentos centralizados para todos os códigos de erro.
"""
import logging
from flask import jsonify

logger = logging.getLogger("crv-acesso")


def register_error_handlers(app):

    @app.errorhandler(400)
    def bad_request(e):
        return jsonify({"success": False, "error": "Requisição inválida.", "status": 400}), 400

    @app.errorhandler(401)
    def unauthorized(e):
        return jsonify({"success": False, "error": "Autenticação necessária.", "status": 401}), 401

    @app.errorhandler(403)
    def forbidden(e):
        return jsonify({"success": False, "error": "Acesso negado.", "status": 403}), 403

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"success": False, "error": "Recurso não encontrado.", "status": 404}), 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        return jsonify({"success": False, "error": "Método não permitido.", "status": 405}), 405

    @app.errorhandler(422)
    def unprocessable(e):
        return jsonify({"success": False, "error": "Dados inválidos.", "status": 422}), 422

    @app.errorhandler(429)
    def rate_limit(e):
        logger.warning(f"[RATE LIMIT] {e}")
        return jsonify({
            "success": False,
            "error":   "Muitas requisições. Aguarde e tente novamente.",
            "status":  429,
        }), 429

    @app.errorhandler(500)
    def server_error(e):
        logger.error(f"[500] {e}")
        return jsonify({"success": False, "error": "Erro interno do servidor.", "status": 500}), 500
