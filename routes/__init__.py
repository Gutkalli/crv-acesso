"""
CRV Controle de Acesso — Registro de Rotas
Importa todos os Blueprints e os registra na aplicação Flask.
"""
from routes.auth_routes          import auth_bp
from routes.usuarios_routes      import usuarios_bp
from routes.funcionarios_routes  import funcionarios_bp
from routes.equipamentos_routes  import equipamentos_bp
from routes.credenciais_routes   import credenciais_bp
from routes.ocorrencias_routes   import ocorrencias_bp
from routes.acessos_routes       import acessos_bp
from routes.auditoria_routes     import auditoria_bp
from routes.regras_acesso_routes import regras_bp
from routes.configuracoes_routes import config_bp
from routes.dashboard_routes     import dashboard_bp
from routes.exportar_routes      import exportar_bp
from routes.static_routes        import static_bp


def register_routes(app):
    """Registra todos os Blueprints na aplicação."""
    blueprints = [
        auth_bp,
        usuarios_bp,
        funcionarios_bp,
        equipamentos_bp,
        credenciais_bp,
        ocorrencias_bp,
        acessos_bp,
        auditoria_bp,
        regras_bp,
        config_bp,
        dashboard_bp,
        exportar_bp,
        static_bp,
    ]
    for bp in blueprints:
        app.register_blueprint(bp)
