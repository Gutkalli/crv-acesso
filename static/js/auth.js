/* ==========================================================
   CRV CONTROLE DE ACESSO
   AUTH.JS — Login e autenticação via Supabase
   ========================================================== */

const ROTA_DASHBOARD = "dashboard.html";
const ROTA_LOGIN     = "login.html";

/* ==========================================================
   HELPERS
   ========================================================== */

function mostrarErro(msg) {
    const box  = document.getElementById("login-error");
    const text = document.getElementById("login-error-message");
    if (!box || !text) { alert(msg); return; }
    text.textContent = msg;
    box.style.display = "flex";
}

function esconderErro() {
    const box = document.getElementById("login-error");
    if (box) box.style.display = "none";
}

function salvarUsuarioLocal(usuario) {
    localStorage.setItem("usuario_logado", JSON.stringify(usuario));
    window.usuarioLogado = usuario;
}

function limparUsuarioLocal() {
    localStorage.removeItem("usuario_logado");
    localStorage.removeItem("lembrar_me");
    window.usuarioLogado = null;
}

/* ==========================================================
   LOGIN VIA SUPABASE
   ========================================================== */

async function fazerLogin(email, senha, lembrar) {
    try {
        esconderErro();

        // ── DEV-ONLY BYPASS (localhost apenas) ──────────────────────────
        const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
        if (isLocalhost && email === 'admin@crv.local' && senha === 'Admin@123') {
            const usuarioDev = {
                id:         'dev-00000000-0000-0000-0000-000000000001',
                auth_id:    'dev-00000000-0000-0000-0000-000000000001',
                empresa_id: '00000000-0000-0000-0000-000000000000',
                email:      'admin@crv.local',
                nome:       'Admin Dev',
                perfil:     'admin',
                token:      'dev-token-local'
            };
            salvarUsuarioLocal(usuarioDev);
            if (lembrar) localStorage.setItem('lembrar_me', 'true');
            window.location.href = ROTA_DASHBOARD;
            return;
        }
        // ────────────────────────────────────────────────────────────────

        if (!window.sb) {
            throw new Error("Serviço de autenticação indisponível. Verifique sua conexão.");
        }

        const { data, error } = await window.sb.auth.signInWithPassword({
            email,
            password: senha
        });

        if (error) {
            throw new Error("E-mail ou senha inválidos.");
        }

        if (!data?.user) {
            throw new Error("Falha ao obter dados do usuário.");
        }

        // Busca perfil na tabela usuarios
        const { data: perfilData, error: perfilError } = await window.sb
            .from("usuarios")
            .select("id, nome, perfil, ativo, empresa_id")
            .eq("id", data.user.id)
            .single();

        if (perfilError || !perfilData) {
            await window.sb.auth.signOut();
            throw new Error("Usuário não possui acesso ao sistema. Contate o administrador.");
        }

        if (!perfilData.ativo) {
            await window.sb.auth.signOut();
            throw new Error("Usuário inativo. Contate o administrador.");
        }

        const usuario = {
            id:         perfilData.id,
            auth_id:    data.user.id,
            empresa_id: perfilData.empresa_id,
            email:      data.user.email,
            nome:       perfilData.nome,
            perfil:     perfilData.perfil,
            token:      data.session?.access_token
        };

        salvarUsuarioLocal(usuario);

        if (lembrar) {
            localStorage.setItem("lembrar_me", "true");
        }

        // Registrar login na auditoria
        await _registrarLoginAuditoria(perfilData.id, perfilData.nome, data.user.email);

        window.location.href = ROTA_DASHBOARD;

    } catch (err) {
        console.error("❌ Erro login:", err);
        mostrarErro(err.message || "Erro ao fazer login.");
    }
}

async function _registrarLoginAuditoria(userId, nome, email) {
    try {
        await window.sb?.from("auditoria").insert([{
            usuario_id: userId,
            usuario:    nome || email,
            acao:       "login",
            modulo:     "auth",
            descricao:  `Login realizado: ${email}`,
            nivel:      "info"
        }]);
    } catch (e) {
        // Não bloquear login se auditoria falhar
        console.warn("Auditoria de login falhou:", e);
    }
}

/* ==========================================================
   LOGOUT
   ========================================================== */

async function fazerLogout() {
    try {
        const usuario = JSON.parse(localStorage.getItem("usuario_logado") || "{}");

        // Registrar logout na auditoria
        if (window.sb && usuario?.id) {
            try {
                await window.sb.from("auditoria").insert([{
                    usuario_id: usuario.id,
                    usuario:    usuario.nome || usuario.email,
                    acao:       "logout",
                    modulo:     "auth",
                    descricao:  `Logout realizado: ${usuario.email}`,
                    nivel:      "info"
                }]);
            } catch (e) {
                console.warn("Auditoria de logout falhou:", e);
            }

            await window.sb.auth.signOut().catch(() => {});
        }

    } catch (e) {
        console.warn("Erro no logout:", e);
    } finally {
        limparUsuarioLocal();
        window.location.href = ROTA_LOGIN;
    }
}

/* ==========================================================
   PROTEGER PÁGINAS (SE NÃO ESTIVER LOGADO)
   ========================================================== */

function protegerPagina() {
    const usuario = localStorage.getItem("usuario_logado");

    if (!usuario) {
        window.location.href = ROTA_LOGIN;
        return;
    }

    try {
        window.usuarioLogado = JSON.parse(usuario);
        atualizarHeaderUsuario(window.usuarioLogado);
    } catch (e) {
        limparUsuarioLocal();
        window.location.href = ROTA_LOGIN;
    }
}

/* ==========================================================
   ATUALIZAR HEADER COM DADOS REAIS DO USUÁRIO
   ========================================================== */

function atualizarHeaderUsuario(usuario) {
    if (!usuario) return;

    // Avatar com iniciais reais
    const avatarEl = document.getElementById("user-avatar");
    if (avatarEl) {
        const iniciais = (usuario.nome || usuario.email || "?")
            .split(" ")
            .map(p => p[0])
            .filter(c => /[A-Za-zÀ-ÿ]/.test(c))
            .slice(0, 2)
            .join("")
            .toUpperCase();
        avatarEl.textContent = iniciais;
        avatarEl.title       = usuario.nome || usuario.email;
    }
}

/* ==========================================================
   EXPOR FUNÇÕES GLOBAIS
   ========================================================== */

window.fazerLogin    = fazerLogin;
window.fazerLogout   = fazerLogout;
window.protegerPagina = protegerPagina;

/* ==========================================================
   INICIALIZAÇÃO
   ========================================================== */

document.addEventListener("DOMContentLoaded", () => {
    const paginaAtual = window.location.pathname.split("/").pop();
    const ehLogin     = paginaAtual === "login.html" || paginaAtual === "";

    if (!ehLogin) {
        protegerPagina();
        return;
    }

    // Se já logado, redireciona
    if (localStorage.getItem("usuario_logado")) {
        window.location.href = ROTA_DASHBOARD;
        return;
    }

    const form = document.getElementById("loginForm");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email  = document.getElementById("email")?.value.trim();
        const senha  = document.getElementById("senha")?.value;
        const lembrar = document.getElementById("lembrar-me")?.checked || false;

        if (!email || !senha) {
            mostrarErro("Preencha e-mail e senha.");
            return;
        }

        const btnSubmit = form.querySelector('[type="submit"]');
        if (btnSubmit) {
            btnSubmit.disabled    = true;
            btnSubmit.textContent = "Entrando...";
        }

        await fazerLogin(email, senha, lembrar);

        if (btnSubmit) {
            btnSubmit.disabled    = false;
            btnSubmit.textContent = "Entrar";
        }
    });
});
