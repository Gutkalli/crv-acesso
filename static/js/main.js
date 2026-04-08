/* ============================================================
   CRV CONTROLE DE ACESSO — main.js
   Comportamentos globais: partials, tema, relógio, sidebar
   ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {

  // Marca início de sessão para cálculo no modal
  window._sessaoInicio = new Date();

  // inicia supabase
  if (window.initSupabase) {
    window.initSupabase();
  }

  // inicia banco offline
  if (window.initDB) {
    await window.initDB();
  }

  // resto
  await loadPartials();

  initTheme();
  initClock();
  initSidebar();
  setActivePage();
  initNavegacao();

  // Aplica dados reais do usuário no header
  const usuario = (() => {
    try { return JSON.parse(localStorage.getItem('usuario_logado') || '{}'); }
    catch { return {}; }
  })();

  if (usuario?.nome || usuario?.email) {
    const iniciais = (usuario.nome || usuario.email)
      .split(' ').map(p => p[0]).filter(c => /[A-Za-zÀ-ÿ]/.test(c)).slice(0, 2).join('').toUpperCase();
    const avatarEl = document.getElementById('user-avatar');
    if (avatarEl) { avatarEl.textContent = iniciais; avatarEl.title = usuario.nome || usuario.email; }
  }

});

/* ------------------------------------------------------------
   CARREGAR PARTIALS (header + sidebar)
   ------------------------------------------------------------ */
async function loadPartials() {
  const sidebarContainer = document.getElementById('sidebar-container');
  const headerContainer  = document.getElementById('header-container');
  if (!sidebarContainer || !headerContainer) return;

  try {
    const [sidebarRes, headerRes] = await Promise.all([
      fetch('static/partials/sidebar.html'),
      fetch('static/partials/header.html')
    ]);
    sidebarContainer.innerHTML = await sidebarRes.text();
    headerContainer.innerHTML  = await headerRes.text();

    // Aplica restrições de perfil nos itens do sidebar (data-permissao="admin" etc.)
    if (window.permissoesCRV?.aplicarPermissoesUI) {
      window.permissoesCRV.aplicarPermissoesUI();
    }
  } catch (e) {
    console.warn('Erro ao carregar partials:', e);
  }

  await aplicarLogoSalvo();
}

async function aplicarLogoSalvo() {
  try {
    const supabase = window.getSupabase?.();
    if (!supabase) return; // ← Supabase ainda não pronto, aborta silenciosamente

    const { data } = await supabase
      .from('configuracoes')
      .select('valor')
      .eq('chave', 'aparencia')
      .maybeSingle();

    const logoUrl = data?.valor?.logoUrl;
    const img = document.getElementById('logo-cliente');
    if (img && logoUrl) img.src = logoUrl;
  } catch (e) {
    console.warn('Logo salvo não aplicado:', e);
  }
}

/* ------------------------------------------------------------
   TEMA CLARO / ESCURO
   ------------------------------------------------------------ */
function initTheme() {
  // Lê do Supabase via configuracoes.js — mas como main.js carrega antes,
  // usa o data-theme já setado no <html> como fallback inicial.
  // O configuracoes.js aplica o tema correto quando a página carrega.
  const atual = document.documentElement.getAttribute('data-theme') || 'dark';
  aplicarTemaHeader(atual);

  document.addEventListener('click', (e) => {
    if (e.target.closest('#theme-toggle')) {
      const current = document.documentElement.getAttribute('data-theme');
      const novo    = current === 'dark' ? 'light' : 'dark';
      aplicarTemaHeader(novo);
      // Persiste no Supabase se getSupabase disponível
      const supabase = window.getSupabase?.();
      if (supabase) {
        supabase.from('configuracoes')
          .upsert({ chave: 'aparencia', valor: { tema: novo }, updated_at: new Date().toISOString() },
                  { onConflict: 'chave' })
          .then(() => {})
          .catch(e => console.warn('Erro ao salvar tema:', e));
      }
    }
  });
}

function aplicarTemaHeader(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const icon = document.getElementById('theme-icon');
  if (icon) icon.className = theme === 'dark' ? 'ph ph-sun' : 'ph ph-moon';
}

/* ------------------------------------------------------------
   RELÓGIO EM TEMPO REAL
   ------------------------------------------------------------ */
let _clockInterval = null;

function initClock() {
  if (_clockInterval) clearInterval(_clockInterval);

  function tick() {
    const el = document.getElementById('header-clock');
    if (!el) return;
    el.textContent = new Date().toLocaleTimeString('pt-BR');
  }

  tick();
  _clockInterval = setInterval(tick, 1000);
}

/* ------------------------------------------------------------
   SIDEBAR — colapsar / hamburger / mobile
   ------------------------------------------------------------ */
function initSidebar() {
  const wrapper = document.querySelector('.app-wrapper');
  if (!wrapper) return;

  // Restaurar estado salvo
  const saved = localStorage.getItem('crv-sidebar');
  if (saved === 'collapsed') wrapper.classList.add('sidebar-collapsed');

  // Botão hamburger
  document.addEventListener('click', (e) => {
    if (e.target.closest('#hamburger-btn')) {
      const isMobile = window.innerWidth <= 768;

      if (isMobile) {
        toggleMobileSidebar();
      } else {
        wrapper.classList.toggle('sidebar-collapsed');
        localStorage.setItem(
          'crv-sidebar',
          wrapper.classList.contains('sidebar-collapsed') ? 'collapsed' : 'open'
        );
      }
    }

    // Fechar mobile ao clicar no overlay
    if (e.target.closest('#sidebar-overlay')) {
      closeMobileSidebar();
    }
  });

  // Fechar mobile ao redimensionar para desktop
  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) closeMobileSidebar();
  });
}

function toggleMobileSidebar() {
  const sidebar  = document.getElementById('sidebar');
  const overlay  = document.getElementById('sidebar-overlay');
  if (!sidebar || !overlay) return;
  sidebar.classList.toggle('mobile-open');
  overlay.classList.toggle('active');
  document.body.style.overflow =
    sidebar.classList.contains('mobile-open') ? 'hidden' : '';
}

function closeMobileSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (!sidebar || !overlay) return;
  sidebar.classList.remove('mobile-open');
  overlay.classList.remove('active');
  document.body.style.overflow = '';
}

/* ------------------------------------------------------------
   MARCAR ITEM ATIVO NA SIDEBAR
   ------------------------------------------------------------ */
function setActivePage() {
  const page = getCurrentPage();
  document.querySelectorAll('.sidebar-item[data-page]').forEach(item => {
    item.classList.toggle('active', item.dataset.page === page);
  });
}

function getCurrentPage() {
  const path = window.location.pathname;
  const file = path.split('/').pop().replace('.html', '');
  return file || 'dashboard';
}

/* ------------------------------------------------------------
   UTILITÁRIOS GLOBAIS
   ------------------------------------------------------------ */

// Toast de notificação leve
function showToast(message, type = 'info', duration = 3500) {
  const existing = document.getElementById('crv-toast');
  if (existing) existing.remove();

  const colors = {
    success: 'var(--success)',
    danger:  'var(--danger)',
    warning: 'var(--warning)',
    info:    'var(--primary)'
  };

  const toast = document.createElement('div');
  toast.id = 'crv-toast';
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-left: 4px solid ${colors[type] || colors.info};
    border-radius: var(--radius-md);
    padding: 14px 20px;
    font-size: 0.875rem;
    color: var(--text-primary);
    box-shadow: var(--shadow-lg);
    z-index: 9999;
    max-width: 320px;
    animation: slideInToast 0.3s ease;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// Animação do toast
const toastStyle = document.createElement('style');
toastStyle.textContent = `
  @keyframes slideInToast {
    from { transform: translateY(20px); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }
`;
document.head.appendChild(toastStyle);


/* ------------------------------------------------------------
   NAVEGAÇÃO — mapeia sidebar e botões para suas páginas
   ------------------------------------------------------------ */

const ROTAS = {
  'dashboard':     'dashboard.html',
  'monitoramento': 'monitoramento.html',
  'funcionarios':  'funcionarios.html',
  'credenciais':   'credenciais.html',
  'regras_acesso': 'regras_acesso.html',
  'equipamentos':  'equipamentos.html',
  'ocorrencias':   'ocorrencias.html',
  'relatorios':    'relatorios.html',
  'auditoria':     'auditoria.html',
  'configuracoes': 'configuracoes.html',
};

function initNavegacao() {
  // Sidebar — já funciona pelos href nos <a>, mas garante via JS também
  document.querySelectorAll('.sidebar-item[data-page]').forEach(item => {
    item.addEventListener('click', (e) => {
      const rota = ROTAS[item.dataset.page];
      if (rota) {
        e.preventDefault();
        window.location.href = rota;
      }
    });
  });

  // Qualquer botão/link com data-href="nome-da-pagina"
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-href]');
    if (!el) return;
    e.preventDefault();
    const rota = ROTAS[el.dataset.href];
    if (rota) window.location.href = rota;
  });
}

/* ------------------------------------------------------------
   MODAL DE USUÁRIO (avatar header)
------------------------------------------------------------ */

document.addEventListener('click', (e) => {

  const avatar = e.target.closest('#user-avatar');

  if (!avatar) return;

  abrirModalUsuario();

});

function abrirModalUsuario(){

  if(document.getElementById('user-modal')) return;

  // Lê dados reais do usuário logado
  const usuario = (() => {
    try { return JSON.parse(localStorage.getItem('usuario_logado') || '{}'); }
    catch { return {}; }
  })();

  const nome    = usuario.nome  || usuario.email || 'Usuário';
  const email   = usuario.email || '—';
  const perfil  = usuario.perfil || 'operador';

  const perfisLabel = {
    admin:    'Administrador',
    gerente:  'Gerente',
    operador: 'Operador',
    portaria: 'Portaria'
  };

  const iniciais = nome.split(' ').map(p => p[0]).filter(c => /[A-Za-zÀ-ÿ]/.test(c)).slice(0, 2).join('').toUpperCase();

  const agora   = new Date();
  const sessaoInicio = window._sessaoInicio
    ? Math.round((agora - window._sessaoInicio) / 60000)
    : null;
  const sessaoLabel = sessaoInicio !== null ? `${sessaoInicio} min` : '—';

  const modal = document.createElement('div');
  modal.id = 'user-modal';
  modal.className = 'user-modal-overlay';

  modal.innerHTML = `
<div class="user-modal">

    <button class="user-modal-close">
        <i class="ph ph-x"></i>
    </button>

    <div class="user-modal-header">

        <div class="user-modal-avatar" style="display:flex;align-items:center;justify-content:center;font-weight:700;font-size:1.1rem;">
            ${iniciais}
        </div>

        <div class="user-modal-info">
            <div class="user-modal-name">${nome}</div>
            <div class="user-modal-email">${email}</div>
        </div>

    </div>

    <div class="user-modal-body">

        <div class="user-modal-row">
            <i class="ph ph-calendar"></i>
            <span>Hoje:</span>
            <b>${agora.toLocaleDateString('pt-BR')}</b>
        </div>

        <div class="user-modal-row">
            <i class="ph ph-user-gear"></i>
            <span>Perfil:</span>
            <b>${perfisLabel[perfil] || perfil}</b>
        </div>

        <div class="user-modal-row">
            <i class="ph ph-clock"></i>
            <span>Sessão ativa há:</span>
            <b>${sessaoLabel}</b>
        </div>

    </div>

    <div class="user-modal-actions">

        <button class="btn btn-primary w-full" onclick="window.location.href='configuracoes.html'">
            <i class="ph ph-gear"></i>
            Configurações
        </button>

        <button class="btn btn-primary w-full" onclick="document.getElementById('user-modal')?.remove(); abrirModalAlterarSenha();">
            <i class="ph ph-key"></i>
            Alterar senha
        </button>

        <button class="btn btn-danger w-full" id="btn-logout">
            <i class="ph ph-sign-out"></i>
            Sair do sistema
        </button>

    </div>

    <div class="user-modal-footer">
        <i class="ph ph-shield-check"></i>
        Sessão autenticada via Supabase
    </div>

</div>
`;

  document.body.appendChild(modal);
}

function abrirModalAlterarSenha() {
  if (document.getElementById('modal-alterar-senha')) return;

  const modal = document.createElement('div');
  modal.id    = 'modal-alterar-senha';
  modal.className = 'user-modal-overlay';

  modal.innerHTML = `
<div class="user-modal">
    <button class="user-modal-close" onclick="document.getElementById('modal-alterar-senha')?.remove()">
        <i class="ph ph-x"></i>
    </button>
    <div class="user-modal-header">
        <div class="user-modal-avatar"><i class="ph ph-key"></i></div>
        <div class="user-modal-info">
            <div class="user-modal-name">Alterar senha</div>
            <div class="user-modal-email">Uma confirmação será enviada para seu e-mail</div>
        </div>
    </div>
    <div class="user-modal-body">
        <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:12px;">
            Clique em confirmar para receber um link de redefinição de senha no seu e-mail cadastrado.
        </p>
    </div>
    <div class="user-modal-actions">
        <button class="btn btn-primary w-full" id="btn-confirmar-reset-senha">
            <i class="ph ph-envelope"></i>
            Enviar link de redefinição
        </button>
        <button class="btn btn-ghost w-full" onclick="document.getElementById('modal-alterar-senha')?.remove()">
            Cancelar
        </button>
    </div>
</div>
`;

  document.body.appendChild(modal);

  document.getElementById('btn-confirmar-reset-senha')?.addEventListener('click', async () => {
    const usuario = JSON.parse(localStorage.getItem('usuario_logado') || '{}');
    if (!usuario.email) return;

    const btn = document.getElementById('btn-confirmar-reset-senha');
    btn.disabled    = true;
    btn.textContent = 'Enviando...';

    try {
      const res = await fetch('/api/auth/recuperar-senha', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: usuario.email })
      });
      const json = await res.json();
      if (json.success) {
        showToast('Link de redefinição enviado para ' + usuario.email, 'success');
        document.getElementById('modal-alterar-senha')?.remove();
      } else {
        showToast('Erro: ' + (json.error || 'Tente novamente'), 'danger');
      }
    } catch (e) {
      showToast('Erro de conexão. Tente novamente.', 'danger');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Enviar link de redefinição'; }
    }
  });
}

/* ------------------------------------------------------------
   FECHAR MODAL USUÁRIO
------------------------------------------------------------ */

document.addEventListener('click', (e)=>{

  if(e.target.closest('.user-modal-close')){
      document.getElementById('user-modal')?.remove();
  }


});

/* ------------------------------------------------------------
   LOGOUT COM CONFIRMAÇÃO
------------------------------------------------------------ */

document.addEventListener('click', (e)=>{

  const logoutBtn = e.target.closest('#btn-logout');

  if(!logoutBtn) return;

  abrirModalConfirmacaoLogout();

});

function abrirModalConfirmacaoLogout(){

  const existente = document.getElementById('logout-confirm-modal');
  if(existente) existente.remove();

  const modal = document.createElement('div');

  modal.id = 'logout-confirm-modal';
  modal.className = 'user-modal-overlay';

  modal.innerHTML = `

<div class="user-modal">

    <div class="user-modal-header">

        <div class="user-modal-avatar">
            <i class="ph ph-sign-out"></i>
        </div>

        <div class="user-modal-info">
            <div class="user-modal-name">Confirmar saída</div>
            <div class="user-modal-email">
                Deseja realmente sair do sistema?
            </div>
        </div>

    </div>

    <div class="user-modal-actions">

        <button class="btn btn-primary w-full" id="cancelar-logout">
            Cancelar
        </button>

        <button class="btn btn-danger w-full" id="confirmar-logout">
            Sair do sistema
        </button>

    </div>

</div>
`;

  document.body.appendChild(modal);

}

/* ------------------------------------------------------------
   AÇÕES DO MODAL DE LOGOUT
------------------------------------------------------------ */

document.addEventListener('click',(e)=>{

  if(e.target.closest('#cancelar-logout')){
      document.getElementById('logout-confirm-modal')?.remove();
  }

  if(e.target.closest('#confirmar-logout')){
      if (typeof fazerLogout === 'function') {
          fazerLogout();
      } else {
          localStorage.removeItem('usuario_logado');
          window.location.href = "login.html";
      }
  }

});

/* ------------------------------------------------------------
   PAINEL DE NOTIFICAÇÕES (SININHO)
------------------------------------------------------------ */

document.addEventListener('click', (e) => {

  if (e.target.closest('#btn-notificacoes')) {
    togglePainelNotificacoes();
    return;
  }

  // Fecha ao clicar fora do painel
  if (!e.target.closest('#notif-panel')) {
    document.getElementById('notif-panel')?.remove();
  }

});

function togglePainelNotificacoes() {

  const existing = document.getElementById('notif-panel');
  if (existing) { existing.remove(); return; }

  const btn  = document.getElementById('btn-notificacoes');
  if (!btn) return;
  const rect = btn.getBoundingClientRect();

  const panel = document.createElement('div');
  panel.id = 'notif-panel';
  panel.style.cssText = `
    position:fixed;
    top:${rect.bottom + 8}px;
    right:${window.innerWidth - rect.right}px;
    width:320px;
    background:var(--surface);
    border:1px solid var(--border);
    border-radius:var(--radius-lg);
    box-shadow:var(--shadow-lg);
    z-index:9000;
    overflow:hidden;
  `;

  panel.innerHTML = `
    <div style="padding:14px 18px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;">
      <span style="font-weight:600;font-size:0.9rem;color:var(--text-primary);">Notificações</span>
      <button onclick="document.getElementById('notif-panel')?.remove()"
        style="background:none;border:none;cursor:pointer;color:var(--text-secondary);font-size:0.8rem;padding:2px 6px;border-radius:4px;">
        Fechar
      </button>
    </div>
    <div style="padding:36px 20px;text-align:center;color:var(--text-muted);">
      <i class="ph ph-bell-slash" style="font-size:2.2rem;display:block;margin-bottom:10px;opacity:.5;"></i>
      <p style="font-size:0.875rem;margin:0;">Nenhuma notificação no momento</p>
    </div>
  `;

  document.body.appendChild(panel);
}