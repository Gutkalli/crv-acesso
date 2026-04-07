/* ==========================================================
   CRV CONTROLE DE ACESSO
   LGPD.JS — Conformidade com a Lei Geral de Proteção de Dados
   Lei nº 13.709/2018
   ========================================================== */

const LGPD_KEY    = 'crv_lgpd_aceito';
const LGPD_VER   = '1.0'; // Incrementar quando a política mudar

/* ==========================================================
   VERIFICAR CONSENTIMENTO
   ========================================================== */

function lgpdConsentimentoAtivo() {
    const salvo = localStorage.getItem(LGPD_KEY);
    if (!salvo) return false;
    try {
        const obj = JSON.parse(salvo);
        return obj.versao === LGPD_VER && obj.aceito === true;
    } catch {
        return false;
    }
}

/* ==========================================================
   REGISTRAR CONSENTIMENTO
   ========================================================== */

function registrarConsentimento() {
    const dados = {
        aceito:    true,
        versao:    LGPD_VER,
        timestamp: new Date().toISOString(),
        pagina:    window.location.pathname
    };
    localStorage.setItem(LGPD_KEY, JSON.stringify(dados));

    // Salva auditoria de consentimento no Supabase
    if (window.sb) {
        const usuario = (() => {
            try { return JSON.parse(localStorage.getItem('usuario_logado') || '{}'); }
            catch { return {}; }
        })();

        window.sb.from('auditoria').insert([{
            usuario_id: usuario.id || null,
            usuario:    usuario.nome || usuario.email || 'Anônimo',
            acao:       'consentimento_lgpd',
            modulo:     'lgpd',
            descricao:  `Consentimento LGPD aceito (v${LGPD_VER})`,
            nivel:      'info',
            extra:      dados
        }]).catch(() => {});
    }
}

/* ==========================================================
   EXIBIR MODAL DE CONSENTIMENTO LGPD
   ========================================================== */

function exibirModalLGPD(onAceitar) {
    if (document.getElementById('modal-lgpd')) return;

    const modal = document.createElement('div');
    modal.id    = 'modal-lgpd';
    modal.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.85);
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1rem;
    `;

    modal.innerHTML = `
<div style="
    background: var(--surface, #1e1e2e);
    border: 1px solid var(--border, #333);
    border-radius: 12px;
    padding: 2rem;
    max-width: 560px;
    width: 100%;
    color: var(--text-primary, #fff);
    font-family: inherit;
    box-shadow: 0 20px 60px rgba(0,0,0,0.5);
">
    <div style="display:flex;align-items:center;gap:.75rem;margin-bottom:1.25rem;">
        <div style="
            width:44px;height:44px;border-radius:50%;
            background:rgba(99,102,241,.15);
            display:flex;align-items:center;justify-content:center;
            flex-shrink:0;
        ">
            <i class="ph ph-shield-check" style="font-size:1.4rem;color:#6366f1;"></i>
        </div>
        <div>
            <h3 style="margin:0;font-size:1rem;font-weight:700;">Aviso de Privacidade — LGPD</h3>
            <p style="margin:0;font-size:.8rem;color:var(--text-muted,#888);">Lei nº 13.709/2018</p>
        </div>
    </div>

    <div style="
        font-size:.84rem;
        line-height:1.6;
        color:var(--text-secondary,#ccc);
        max-height:260px;
        overflow-y:auto;
        margin-bottom:1.25rem;
        padding-right:.5rem;
    ">
        <p><strong>Este sistema coleta e processa os seguintes dados pessoais:</strong></p>
        <ul style="padding-left:1.2rem;margin:.5rem 0;">
            <li>Dados cadastrais: nome, CPF, matrícula, cargo</li>
            <li>Dados biométricos: foto e dados de reconhecimento facial</li>
            <li>Dados de movimentação: registros de entrada/saída, horários, locais de acesso</li>
            <li>Logs de auditoria: ações realizadas no sistema</li>
        </ul>

        <p style="margin-top:.75rem;"><strong>Finalidade do tratamento:</strong></p>
        <p>Controle de acesso às instalações, segurança patrimonial, gestão de presença e
        cumprimento de obrigações legais e contratuais.</p>

        <p style="margin-top:.75rem;"><strong>Seus direitos (Art. 18, LGPD):</strong></p>
        <ul style="padding-left:1.2rem;margin:.5rem 0;">
            <li>Confirmação e acesso aos seus dados</li>
            <li>Correção de dados incompletos ou desatualizados</li>
            <li>Anonimização ou exclusão de dados desnecessários</li>
            <li>Portabilidade dos dados</li>
            <li>Revogação do consentimento a qualquer tempo</li>
        </ul>

        <p style="margin-top:.75rem;">
            Para exercer seus direitos ou obter informações, entre em contato com o
            Encarregado de Dados (DPO) da sua organização.
        </p>

        <p style="margin-top:.75rem;font-size:.78rem;color:var(--text-muted,#888);">
            Controlador: CRV Sistemas · Versão da política: ${LGPD_VER} ·
            Atualizado em: ${new Date().toLocaleDateString('pt-BR')}
        </p>
    </div>

    <div style="
        display:flex;
        align-items:center;
        gap:.75rem;
        flex-wrap:wrap;
        border-top:1px solid var(--border,#333);
        padding-top:1rem;
    ">
        <label style="display:flex;align-items:center;gap:.5rem;cursor:pointer;flex:1;font-size:.83rem;">
            <input type="checkbox" id="lgpd-check" style="width:16px;height:16px;cursor:pointer;">
            Li e compreendo como meus dados são tratados
        </label>
        <button id="btn-lgpd-aceitar"
            style="
                background:#6366f1;color:#fff;border:none;border-radius:8px;
                padding:.6rem 1.25rem;font-size:.85rem;font-weight:600;
                cursor:not-allowed;opacity:.5;transition:opacity .2s;
            "
            disabled>
            <i class="ph ph-check"></i> Continuar
        </button>
    </div>
</div>
`;

    document.body.appendChild(modal);

    // Habilita botão quando checkbox marcado
    const chk = document.getElementById('lgpd-check');
    const btn = document.getElementById('btn-lgpd-aceitar');

    chk?.addEventListener('change', () => {
        btn.disabled = !chk.checked;
        btn.style.opacity = chk.checked ? '1' : '.5';
        btn.style.cursor  = chk.checked ? 'pointer' : 'not-allowed';
    });

    btn?.addEventListener('click', () => {
        if (!document.getElementById('lgpd-check')?.checked) return;
        registrarConsentimento();
        modal.remove();
        if (typeof onAceitar === 'function') onAceitar();
    });
}

/* ==========================================================
   BANNER DE COOKIES (RODAPÉ DISCRETO)
   ========================================================== */

function exibirBannerCookies() {
    if (document.getElementById('banner-cookies')) return;
    if (lgpdConsentimentoAtivo()) return;

    const banner = document.createElement('div');
    banner.id    = 'banner-cookies';
    banner.style.cssText = `
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        background: var(--surface, #1e1e2e);
        border-top: 1px solid var(--border, #333);
        padding: .75rem 1.5rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        z-index: 9990;
        font-size: .82rem;
        flex-wrap: wrap;
        box-shadow: 0 -4px 20px rgba(0,0,0,0.3);
    `;

    banner.innerHTML = `
<span style="color:var(--text-secondary,#ccc);flex:1;min-width:200px;">
    <i class="ph ph-cookie" style="color:#6366f1;"></i>
    Este sistema utiliza dados de sessão para autenticação e auditoria conforme a LGPD.
</span>
<div style="display:flex;gap:.5rem;align-items:center;flex-shrink:0;">
    <button id="btn-cookies-detalhes" style="
        background:transparent;border:1px solid var(--border,#333);color:var(--text-muted,#888);
        border-radius:6px;padding:.35rem .75rem;cursor:pointer;font-size:.78rem;
    ">Ver política</button>
    <button id="btn-cookies-ok" style="
        background:#6366f1;color:#fff;border:none;
        border-radius:6px;padding:.35rem .75rem;cursor:pointer;font-size:.78rem;font-weight:600;
    ">Entendido</button>
</div>
`;

    document.body.appendChild(banner);

    document.getElementById('btn-cookies-ok')?.addEventListener('click', () => {
        registrarConsentimento();
        banner.remove();
    });

    document.getElementById('btn-cookies-detalhes')?.addEventListener('click', () => {
        banner.remove();
        exibirModalLGPD(() => {});
    });
}

/* ==========================================================
   INICIALIZAÇÃO
   ========================================================== */

document.addEventListener('DOMContentLoaded', () => {
    const paginaAtual = window.location.pathname.split('/').pop();

    // Não exibe na página de login ou recuperação de senha
    if (paginaAtual === 'login.html' || paginaAtual === 'recuperacao_senha.html') return;

    // Se já aceitou, apenas verifica versão
    if (lgpdConsentimentoAtivo()) return;

    // Primeira vez: exibe modal completo
    const primeiraVez = !localStorage.getItem(LGPD_KEY);

    if (primeiraVez) {
        // Aguarda um pouco para não bloquear o carregamento inicial
        setTimeout(() => exibirModalLGPD(() => {}), 800);
    } else {
        // Versão mudou: exibe banner
        exibirBannerCookies();
    }
});

/* ==========================================================
   EXPOR GLOBALMENTE (Para uso em configurações)
   ========================================================== */

window.lgpdCRV = {
    exibirModalLGPD,
    exibirBannerCookies,
    lgpdConsentimentoAtivo,
    registrarConsentimento
};
