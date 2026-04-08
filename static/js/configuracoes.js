/* =====================================================
   CRV CONTROLE DE ACESSO
   TELA: CONFIGURAÇÕES
   ===================================================== */

/* =====================================================
   FUNÇÕES GLOBAIS DE SUPORTE
   ===================================================== */

// Obter instância Supabase (com fallback)
function getSupabaseInstance() {
  if (window.sb) return window.sb;
  if (window.getSupabase && typeof window.getSupabase === 'function') {
    return window.getSupabase();
  }
  console.warn("[CFG] Supabase não inicializado");
  return null;
}

// Registrar auditoria (inserir na tabela auditoria)
async function registrarAuditoria(dados) {
  try {
    const supabase = getSupabaseInstance();
    if (!supabase) return false;

    const usuario = await window.getUsuario?.();
    const payload = {
      usuario_id: usuario?.id || null,
      usuario: usuario?.nome || usuario?.email || "Sistema",
      acao: dados.acao || "acao",
      modulo: dados.modulo || "sistema",
      tabela: dados.tabela || null,
      descricao: dados.descricao || "",
      nivel: dados.nivel || "info",
      ip: "N/A",
      extra: dados.extra || {}
    };

    const { error } = await supabase
      .from("auditoria")
      .insert([payload]);

    if (error) {
      console.error("[AUDIT] Erro ao registrar:", error);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[AUDIT] Exceção:", e);
    return false;
  }
}

// Expor globalmente
window.registrarAuditoria = registrarAuditoria;
window.getSupabaseInstance = getSupabaseInstance;

function onReady(fn) {
  if (document.readyState !== 'loading') {
    fn();
  } else {
    document.addEventListener('DOMContentLoaded', fn);
  }
}

onReady(() => {
  initNav();
  initTemas();
  initToggles();
  initLogo();
  initIntegracao();
  initBackup();
  initAvancado();
  initAcoesCabecalho();
  initModalOperador();
  initMascaras();
  carregarConfiguracoes();
  carregarOperadores();
});


/* =====================================================
   NAVEGAÇÃO LATERAL
   ===================================================== */

function initNav() {
  document.querySelectorAll('.cfg-nav-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.cfg-nav-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      document.querySelectorAll('.cfg-secao').forEach(s => s.classList.add('cfg-hidden'));
      const secao = document.getElementById(`secao-${item.dataset.secao}`);
      if (secao) secao.classList.remove('cfg-hidden');
      document.querySelector('.cfg-conteudo')?.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}


/* =====================================================
   TEMAS — sem localStorage, persiste no Supabase
   ===================================================== */

function initTemas() {
  document.querySelectorAll('.cfg-tema-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.cfg-tema-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      aplicarTema(item.dataset.tema);
    });
  });
}

function aplicarTema(tema) {
  document.documentElement.setAttribute('data-theme', tema || 'dark');
}

function marcarTemaAtivo(tema) {
  document.querySelectorAll('.cfg-tema-item').forEach(i => i.classList.remove('active'));
  const el = document.querySelector(`.cfg-tema-item[data-tema="${tema}"]`);
  if (el) el.classList.add('active');
}


/* =====================================================
   LOGO DA EMPRESA
   ===================================================== */

function initLogo() {
  const input    = document.getElementById('cfg-logo-input');
  const btnRem   = document.getElementById('btn-remover-logo');

  input?.addEventListener('change', async function () {
    const file = this.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setLogoStatus('Arquivo muito grande. Máximo: 2MB.', 'erro');
      return;
    }

    setLogoStatus('Enviando...', 'info');

    const supabase = getSupabaseInstance();
    const ext      = file.name.split('.').pop().toLowerCase();
    const path     = `logos/logo_empresa.${ext}`;

    const { error: upErr } = await supabase.storage
      .from('crv-assets')
      .upload(path, file, { upsert: true, contentType: file.type });

    if (upErr) {
      setLogoStatus('Erro ao enviar: ' + upErr.message, 'erro');
      return;
    }

    const { data: urlData } = supabase.storage
      .from('crv-assets')
      .getPublicUrl(path);

    // Salva a URL na tabela configuracoes
    await salvarChave('aparencia', {
      ...((await lerChave('aparencia')) || {}),
      logoUrl: urlData.publicUrl,
    });

    exibirLogoPreview(urlData.publicUrl);
    aplicarLogoHeader(urlData.publicUrl);
    setLogoStatus('Logo enviado com sucesso!', 'ok');

    await registrarAuditoria({
      acao:      'editar',
      modulo:    'configuracoes',
      tabela:    'configuracoes',
      descricao: 'Logo da empresa atualizado',
      nivel:     'info',
    });
  });

  btnRem?.addEventListener('click', async () => {
    if (!confirm('Deseja remover o logo da empresa?')) return;

    const supabase = getSupabaseInstance();

    // Remove do storage
    await supabase.storage.from('crv-assets').remove([
      'logos/logo_empresa.png',
      'logos/logo_empresa.jpg',
      'logos/logo_empresa.svg',
    ]);

    // Remove da config
    const atual = (await lerChave('aparencia')) || {};
    delete atual.logoUrl;
    await salvarChave('aparencia', atual);

    // Restaura logo padrão no header
    aplicarLogoHeader(null);
    ocultarLogoPreview();
    setLogoStatus('Logo removido.', 'ok');

    await registrarAuditoria({
      acao:      'editar',
      modulo:    'configuracoes',
      tabela:    'configuracoes',
      descricao: 'Logo da empresa removido',
      nivel:     'aviso',
    });
  });
}

function exibirLogoPreview(url) {
  const img         = document.getElementById('cfg-logo-img');
  const placeholder = document.getElementById('cfg-logo-placeholder');
  const btnRem      = document.getElementById('btn-remover-logo');

  if (img)         { img.src = url; img.style.display = 'block'; }
  if (placeholder) placeholder.style.display = 'none';
  if (btnRem)      btnRem.style.display = '';
}

function ocultarLogoPreview() {
  const img         = document.getElementById('cfg-logo-img');
  const placeholder = document.getElementById('cfg-logo-placeholder');
  const btnRem      = document.getElementById('btn-remover-logo');

  if (img)         { img.src = ''; img.style.display = 'none'; }
  if (placeholder) placeholder.style.display = '';
  if (btnRem)      btnRem.style.display = 'none';
}

function setLogoStatus(msg, tipo) {
  const el = document.getElementById('cfg-logo-status');
  if (!el) return;
  const cores = { ok: 'var(--success)', erro: 'var(--danger)', info: 'var(--text-muted)' };
  el.style.color = cores[tipo] || 'var(--text-muted)';
  el.textContent = msg;
}

/**
 * Aplica o logo no header (posição exata onde está o logo da empresa).
 * O main.js renderiza o header com o elemento [data-logo-empresa].
 * Se logoUrl for null, restaura o logo padrão CRV.
 */
function aplicarLogoHeader(logoUrl) {
  // Tenta o container de logo do header injetado pelo main.js
  const logoWrap = document.querySelector('[data-logo-empresa]');
  if (!logoWrap) return;

  if (logoUrl) {
    logoWrap.innerHTML = `<img src="${logoUrl}" alt="Logo da empresa"
      style="height:40px;max-width:180px;object-fit:contain;">`;
  } else {
    // Restaura o HTML padrão que o main.js teria colocado
    logoWrap.innerHTML = logoWrap.dataset.defaultHtml || '';
  }
}


/* =====================================================
   TOGGLES — COMPORTAMENTO REATIVO
   ===================================================== */

function initToggles() {
  const deps = [
    { check: 'cfg-logout-auto',  sel: 'cfg-inatividade'    },
    { check: 'cfg-senha-expira', sel: 'cfg-prazo-senha'    },
    { check: 'cfg-sync-auto',    sel: 'cfg-sync-intervalo' },
    { check: 'cfg-backup-auto',  sel: 'cfg-backup-freq'    },
    { check: 'cfg-backup-auto',  sel: 'cfg-backup-retencao'},
  ];

  deps.forEach(({ check, sel }) => {
    const chk = document.getElementById(check);
    const s   = document.getElementById(sel);
    if (chk && s) {
      s.disabled = !chk.checked;
      chk.addEventListener('change', function () {
        s.disabled = !this.checked;
      });
    }
  });

  document.getElementById('cfg-densidade')?.addEventListener('change', function () {
    document.documentElement.classList.toggle('density-compact', this.checked);
  });

  document.getElementById('cfg-anim-reduzida')?.addEventListener('change', function () {
    document.documentElement.classList.toggle('reduce-motion', this.checked);
  });
}


/* =====================================================
   INTEGRAÇÃO — TESTAR CONEXÃO
   ===================================================== */

function initIntegracao() {
  document.getElementById('btn-testar-api')?.addEventListener('click', testarConexaoAPI);
}

async function testarConexaoAPI() {
  const url     = document.getElementById('cfg-api-url')?.value.trim();
  const porta   = document.getElementById('cfg-api-porta')?.value.trim() || '80';
  const usuario = document.getElementById('cfg-api-usuario')?.value.trim() || 'admin';
  const senha   = document.getElementById('cfg-api-senha')?.value || '';
  const status  = document.getElementById('cfg-api-status');
  const btn     = document.getElementById('btn-testar-api');

  if (!url) {
    alert('Informe a URL base da API antes de testar.');
    document.getElementById('cfg-api-url')?.focus();
    return;
  }

  btn.disabled  = true;
  btn.innerHTML = '<i class="ph ph-circle-notch"></i> Testando...';
  if (status) {
    status.className = 'cfg-integ-status testando';
    status.innerHTML = '<i class="ph ph-circle-notch"></i><span>Testando conexão...</span>';
  }

  try {
    const supabase = getSupabaseInstance();
    let token = '';
    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession().catch(() => ({ data: {} }));
      token = session?.access_token || '';
    }

    const res = await fetch('/api/equipamentos/testar-conexao', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ url, porta, usuario, senha })
    });

    const json = await res.json();

    if (json.success) {
      if (status) {
        status.className = 'cfg-integ-status ok';
        status.innerHTML = `<i class="ph ph-check-circle" style="color:var(--success)"></i>
          <span style="color:var(--success)">Equipamento online (HTTP ${json.codigo_http})</span>`;
      }
      mostrarToast('Equipamento respondeu com sucesso!', 'success');
    } else {
      if (status) {
        status.className = 'cfg-integ-status erro';
        status.innerHTML = `<i class="ph ph-x-circle" style="color:var(--danger)"></i>
          <span style="color:var(--danger)">Sem resposta: ${json.erro || 'timeout'}</span>`;
      }
      mostrarToast('Equipamento não respondeu.', 'error');
    }
  } catch (e) {
    if (status) {
      status.className = 'cfg-integ-status erro';
      status.innerHTML = `<i class="ph ph-x-circle" style="color:var(--danger)"></i>
        <span style="color:var(--danger)">Erro de conexão: ${e.message}</span>`;
    }
    mostrarToast('Erro ao testar conexão.', 'error');
  } finally {
    btn.disabled  = false;
    btn.innerHTML = '<i class="ph ph-plug"></i> Testar conexão';
  }
}


/* =====================================================
   2FA — AUTENTICAÇÃO DE DOIS FATORES (TOTP)
   ===================================================== */

async function _getAuthToken() {
  try {
    const supabase = getSupabaseInstance();
    if (!supabase) return '';
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || '';
  } catch { return ''; }
}

async function ativar2FA() {
  const token = await _getAuthToken();
  if (!token) { mostrarToast('Faça login para ativar o 2FA.', 'error'); return; }

  const btn = document.getElementById('btn-ativar-2fa') || document.getElementById('cfg-2fa');
  if (btn?.tagName === 'BUTTON') { btn.disabled = true; btn.textContent = 'Iniciando...'; }

  try {
    const res  = await fetch('/api/auth/2fa/enroll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
    });
    const json = await res.json();

    if (!json.success) {
      mostrarToast('Erro ao iniciar 2FA: ' + (json.error || 'Tente novamente'), 'error');
      return;
    }

    // Exibe modal com QR Code
    exibirModal2FA(json.qr_code, json.secret, json.id, token);

  } catch (e) {
    mostrarToast('Erro de conexão ao ativar 2FA.', 'error');
  } finally {
    if (btn?.tagName === 'BUTTON') { btn.disabled = false; btn.textContent = 'Ativar 2FA'; }
  }
}

function exibirModal2FA(qrCode, secret, factorId, token) {
  const existing = document.getElementById('modal-2fa');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id    = 'modal-2fa';
  modal.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;
    display:flex;align-items:center;justify-content:center;`;

  modal.innerHTML = `
<div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;
  padding:2rem;max-width:420px;width:90%;text-align:center;">
  <h3 style="margin-bottom:1rem;"><i class="ph ph-qr-code"></i> Ativar Autenticador</h3>
  <p style="font-size:.85rem;color:var(--text-muted);margin-bottom:1rem;">
    Escaneie o QR Code no seu aplicativo autenticador (Google Authenticator, Authy, etc.)
  </p>
  ${qrCode ? `<img src="${qrCode}" alt="QR Code 2FA"
    style="width:180px;height:180px;border:4px solid var(--border);border-radius:8px;margin-bottom:1rem;">` : ''}
  ${secret ? `<div style="font-size:.75rem;color:var(--text-muted);margin-bottom:1rem;">
    Ou insira manualmente: <code style="user-select:all;font-size:.8rem;">${secret}</code>
  </div>` : ''}
  <p style="font-size:.85rem;margin-bottom:.5rem;">Digite o código gerado pelo app:</p>
  <input type="text" id="input-2fa-code" maxlength="6" inputmode="numeric"
    style="width:140px;text-align:center;font-size:1.5rem;letter-spacing:.3rem;
      border:1px solid var(--border);border-radius:8px;padding:.5rem;
      background:var(--bg);color:var(--text-primary);margin-bottom:1rem;"
    placeholder="000000">
  <div id="erro-2fa" style="color:var(--danger);font-size:.82rem;margin-bottom:.5rem;display:none;"></div>
  <div style="display:flex;gap:.5rem;justify-content:center;margin-top:.5rem;">
    <button class="btn btn-primary" id="btn-confirmar-2fa">
      <i class="ph ph-check"></i> Confirmar
    </button>
    <button class="btn btn-ghost" id="btn-cancelar-2fa">Cancelar</button>
  </div>
</div>
`;

  document.body.appendChild(modal);

  document.getElementById('btn-cancelar-2fa')?.addEventListener('click', () => modal.remove());

  document.getElementById('btn-confirmar-2fa')?.addEventListener('click', async () => {
    const code  = document.getElementById('input-2fa-code')?.value.trim();
    const errEl = document.getElementById('erro-2fa');
    const btn   = document.getElementById('btn-confirmar-2fa');

    if (!code || code.length !== 6) {
      if (errEl) { errEl.textContent = 'Digite o código de 6 dígitos.'; errEl.style.display = 'block'; }
      return;
    }

    btn.disabled    = true;
    btn.textContent = 'Verificando...';
    if (errEl) errEl.style.display = 'none';

    try {
      // Cria challenge
      const challRes  = await fetch('/api/auth/2fa/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ factor_id: factorId })
      });
      const challJson = await challRes.json();
      if (!challJson.success) throw new Error(challJson.error || 'Erro no challenge');

      // Verifica código
      const verRes  = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ factor_id: factorId, challenge_id: challJson.challenge_id, code })
      });
      const verJson = await verRes.json();

      if (verJson.success) {
        modal.remove();
        mostrarToast('2FA ativado com sucesso!', 'success');
        const chk = document.getElementById('cfg-2fa');
        if (chk) chk.checked = true;
      } else {
        if (errEl) { errEl.textContent = 'Código inválido. Tente novamente.'; errEl.style.display = 'block'; }
      }
    } catch (e) {
      if (errEl) { errEl.textContent = 'Erro: ' + e.message; errEl.style.display = 'block'; }
    } finally {
      btn.disabled    = false;
      btn.textContent = 'Confirmar';
    }
  });
}

// Handler para o toggle de 2FA
document.addEventListener('change', async (e) => {
  const chk = e.target.closest('#cfg-2fa');
  if (!chk) return;

  if (chk.checked) {
    // Usuário quer ativar 2FA
    chk.checked = false; // Volta ao estado desabilitado até confirmar
    await ativar2FA();
  } else {
    // Usuário quer desativar — requer confirmação
    const ok = confirm('Deseja realmente desativar a autenticação em dois fatores?\nIsto reduz a segurança da sua conta.');
    if (!ok) { chk.checked = true; return; }

    mostrarToast('2FA desativado. Configure novamente quando desejar.', 'info');
  }
});


/* =====================================================
   BACKUP
   ===================================================== */

function initBackup() {
  document.getElementById('btn-backup-agora')?.addEventListener('click', fazerBackup);
  document.getElementById('btn-backup-restaurar')?.addEventListener('click', restaurarBackup);
}

function fazerBackup() {
  const btn = document.getElementById('btn-backup-agora');
  btn.disabled = true;
  btn.innerHTML = '<i class="ph ph-circle-notch"></i> Gerando...';

  // Nota: backup real requer Edge Function ou serviço externo.
  setTimeout(async () => {
    btn.disabled = false;
    btn.innerHTML = '<i class="ph ph-cloud-arrow-up"></i> Fazer backup agora';

    const agora = new Date().toLocaleString('pt-BR');
    const el    = document.getElementById('cfg-backup-ultimo');
    if (el) el.innerHTML = `<i class="ph ph-check-circle" style="color:var(--success);"></i> Último backup: ${agora}`;

    const elAvancado = document.getElementById('cfg-ultimo-backup');
    if (elAvancado) elAvancado.textContent = agora;

    await registrarAuditoria({
      acao:      'exportar',
      modulo:    'backup',
      descricao: 'Backup manual solicitado',
      nivel:     'info',
    });
  }, 2000);
}

function restaurarBackup() {
  const input   = document.createElement('input');
  input.type    = 'file';
  input.accept  = '.zip,.sql,.bak';
  input.onchange = async (e) => {
    const arquivo = e.target.files[0];
    if (!arquivo) return;
    const ok = confirm(`Deseja restaurar o backup "${arquivo.name}"?\nTodos os dados atuais serão substituídos.`);
    if (!ok) return;
    await registrarAuditoria({
      acao:      'editar',
      modulo:    'backup',
      descricao: `Restauração de backup solicitada: ${arquivo.name}`,
      nivel:     'critico',
    });
    console.log('Restaurar backup:', arquivo.name, '— requer backend/Edge Function');
  };
  input.click();
}


/* =====================================================
   AVANÇADO — ZONA DE PERIGO
   ===================================================== */

function initAvancado() {
  document.getElementById('btn-limpar-logs')?.addEventListener('click', async () => {
    const ok = confirm('Deseja realmente limpar todos os logs de auditoria?\nEsta ação não pode ser desfeita.');
    if (!ok) return;

    const supabase = getSupabaseInstance();
    const { error } = await supabase.from('auditoria').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    if (error) { alert('Erro ao limpar logs: ' + error.message); return; }

    await registrarAuditoria({
      acao:      'excluir',
      modulo:    'auditoria',
      tabela:    'auditoria',
      descricao: 'Todos os logs de auditoria foram apagados',
      nivel:     'critico',
    });

    alert('Logs de auditoria removidos.');
  });

  document.getElementById('btn-reset-cfg')?.addEventListener('click', async () => {
    const ok = confirm('Deseja redefinir TODAS as configurações para os valores padrão?\nEsta ação não pode ser desfeita.');
    if (!ok) return;

    const supabase = getSupabaseInstance();
    await supabase.from('configuracoes').delete().neq('chave', '__placeholder__');

    await registrarAuditoria({
      acao:      'excluir',
      modulo:    'configuracoes',
      tabela:    'configuracoes',
      descricao: 'Todas as configurações foram redefinidas para o padrão',
      nivel:     'critico',
    });

    location.reload();
  });

  document.getElementById('btn-limpar-base')?.addEventListener('click', async () => {
    const confirmacao = prompt('ATENÇÃO: Esta ação apagará permanentemente todos os dados.\n\nDigite CONFIRMAR para prosseguir:');
    if (confirmacao !== 'CONFIRMAR') return;

    await registrarAuditoria({
      acao:      'excluir',
      modulo:    'sistema',
      descricao: 'Limpeza total da base de dados solicitada',
      nivel:     'critico',
    });

    // Requer Edge Function para executar DELETE em cascata com segurança
    alert('Solicitação registrada. Configure uma Edge Function para executar a limpeza completa.');
  });
}


/* =====================================================
   AÇÕES DO CABEÇALHO
   ===================================================== */

/* Mapa: seção → chave principal no banco, label, campos obrigatórios, grupos a salvar, campos a limpar */
const CFG_SECAO_MAP = {
  geral: {
    chave:    'empresa',
    label:    'Geral',
    required: [{ id: 'cfg-empresa-nome', msg: 'O nome da empresa é obrigatório.' }],
    grupos:   ['empresa', 'regional', 'comportamento'],
    limpar:   ['cfg-empresa-nome','cfg-empresa-cnpj','cfg-empresa-endereco','cfg-empresa-tel'],
  },
  aparencia: {
    chave:    'aparencia',
    label:    'Aparência',
    required: [],
    grupos:   ['aparencia'],
    limpar:   [],
  },
  seguranca: {
    chave:    'seguranca',
    label:    'Segurança',
    required: [],
    grupos:   ['seguranca'],
    limpar:   [],
  },
  notificacoes: {
    chave:    'notificacoes',
    label:    'Notificações',
    required: [{ id: 'cfg-email-notif', msg: 'Informe um e-mail de destino para as notificações.' }],
    grupos:   ['notificacoes'],
    limpar:   ['cfg-email-notif','cfg-email-cc'],
  },
  integracao: {
    chave:    'integracao',
    label:    'Integração',
    required: [{ id: 'cfg-api-url', msg: 'Informe a URL base da API.' }],
    grupos:   ['integracao'],
    limpar:   ['cfg-api-url','cfg-api-porta','cfg-api-usuario'],
  },
  backup: {
    chave:    'backup',
    label:    'Backup',
    required: [],
    grupos:   ['backup'],
    limpar:   [],
  },
};

/* ─────────────────────────────────────────────────────────
   COLETOR: retorna os dados de um grupo para salvar
   ───────────────────────────────────────────────────────── */
async function coletarDadosGrupo(grupo) {
  const temaAtual = document.documentElement.getAttribute('data-theme') || 'dark';
  const temaSel   = document.querySelector('.cfg-tema-item.active')?.dataset.tema || temaAtual;

  const coletores = {
    empresa:       () => ({ nome: getVal('cfg-empresa-nome'), cnpj: getVal('cfg-empresa-cnpj'), endereco: getVal('cfg-empresa-endereco'), tel: getVal('cfg-empresa-tel') }),
    regional:      () => ({ fuso: getVal('cfg-fuso'), dataFmt: getVal('cfg-data-fmt'), idioma: getVal('cfg-idioma') }),
    comportamento: () => ({ logoutAuto: getCheck('cfg-logout-auto'), inatividade: getVal('cfg-inatividade'), somAlerta: getCheck('cfg-som-alerta') }),
    aparencia:     async () => { const ap = (await lerChave('aparencia')) || {}; return { ...ap, tema: temaSel, sidebarCollapsed: getCheck('cfg-sidebar-collapsed'), animReduzida: getCheck('cfg-anim-reduzida'), densidade: getCheck('cfg-densidade') }; },
    seguranca:     () => ({ senhaForte: getCheck('cfg-senha-forte'), senhaExpira: getCheck('cfg-senha-expira'), prazoSenha: getVal('cfg-prazo-senha'), twofa: getCheck('cfg-2fa'), tentativas: getVal('cfg-tentativas') }),
    notificacoes:  () => ({ email: getVal('cfg-email-notif'), cc: getVal('cfg-email-cc'), negado: getCheck('cfg-notif-negado'), critico: getCheck('cfg-notif-critico'), offline: getCheck('cfg-notif-offline'), relatorio: getCheck('cfg-notif-relatorio') }),
    integracao:    () => ({ apiUrl: getVal('cfg-api-url'), apiPorta: getVal('cfg-api-porta'), apiUsuario: getVal('cfg-api-usuario'), syncAuto: getCheck('cfg-sync-auto'), syncIntervalo: getVal('cfg-sync-intervalo') }),
    backup:        () => ({ auto: getCheck('cfg-backup-auto'), freq: getVal('cfg-backup-freq'), retencao: getVal('cfg-backup-retencao') }),
  };
  const fn = coletores[grupo];
  return fn ? await fn() : null;
}

/* ─────────────────────────────────────────────────────────
   EXECUTAR: salva os grupos da seção sem confirmação
   ───────────────────────────────────────────────────────── */
let _secaoPendente = null;

async function executarSalvarSecao(secaoId) {
  const cfg = CFG_SECAO_MAP[secaoId];
  if (!cfg) return;

  const btn = document.getElementById('btn-cfg-salvar');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ph ph-circle-notch"></i> Salvando...'; }

  let sucesso = true;
  for (const grupo of cfg.grupos) {
    const dados = await coletarDadosGrupo(grupo);
    if (dados !== null) {
      const ok = await salvarChave(grupo, dados);
      if (!ok) { sucesso = false; break; }
    }
  }

  if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ph ph-floppy-disk"></i> Salvar alterações'; }

  if (sucesso) {
    if (secaoId === 'aparencia') {
      const t = document.querySelector('.cfg-tema-item.active')?.dataset.tema
             || document.documentElement.getAttribute('data-theme') || 'dark';
      aplicarTema(t);
    }
    await registrarAuditoria({ acao: 'editar', modulo: 'configuracoes', tabela: 'configuracoes', descricao: `Seção "${cfg.label}" atualizada`, nivel: 'info' });
    mostrarToast(`${cfg.label} salvo com sucesso!`, 'success');
  } else {
    mostrarToast(`Erro ao salvar ${cfg.label}. Tente novamente.`, 'error');
  }
}

/* ─────────────────────────────────────────────────────────
   SALVAR SEÇÃO: valida → checa existência → decide
   ───────────────────────────────────────────────────────── */
async function salvarSecao(secaoId) {
  const cfg = CFG_SECAO_MAP[secaoId];
  if (!cfg) return;

  // Validação de campos obrigatórios — abre modal de erro
  for (const { id, msg } of (cfg.required || [])) {
    const el = document.getElementById(id);
    if (!el || !el.value.trim()) {
      const descEl = document.getElementById('modal-erro-desc');
      if (descEl) descEl.textContent = msg;
      document.getElementById('modal-erro-validacao').classList.remove('cfg-hidden');
      el?.focus();
      return;
    }
  }

  // Sempre mostra modal de confirmação antes de salvar
  _secaoPendente = secaoId;

  const supabase = getSupabaseInstance();
  let jaExiste = false;
  if (supabase) {
    const { data } = await supabase.from('configuracoes').select('chave').eq('chave', cfg.chave).limit(1);
    jaExiste = data && data.length > 0;
  }

  // Atualiza descrição do modal conforme contexto
  const descEl = document.getElementById('modal-confirmar-desc');
  if (descEl) {
    if (jaExiste) {
      descEl.innerHTML = `Já existe configuração salva em <strong>${cfg.label}</strong>.<br>Deseja atualizar os dados?`;
    } else {
      descEl.innerHTML = `Você está salvando <strong>${cfg.label}</strong> pela primeira vez.<br>Deseja confirmar?`;
    }
  }

  // Botão excluir só para ADM e só quando já existe
  const btnEx = document.getElementById('btn-confirmar-excluir');
  if (btnEx) {
    const u = window.sessionCRV?.obterUsuarioLogado?.() || {};
    btnEx.style.display = (jaExiste && u.perfil === 'admin') ? '' : 'none';
  }

  document.getElementById('modal-confirmar-salvar').classList.remove('cfg-hidden');
}

/* ─────────────────────────────────────────────────────────
   INIT: botões do topo + modal de confirmação
   ───────────────────────────────────────────────────────── */
function initAcoesCabecalho() {

  // Salvar — age sobre a seção ativa no menu
  document.getElementById('btn-cfg-salvar')?.addEventListener('click', () => {
    const secaoAtiva = document.querySelector('.cfg-nav-item.active')?.dataset.secao || 'geral';
    salvarSecao(secaoAtiva);
  });

  // Restaurar — abre modal customizado
  document.getElementById('btn-cfg-restaurar')?.addEventListener('click', () => {
    const secaoAtiva = document.querySelector('.cfg-nav-item.active')?.dataset.secao || 'geral';
    const label = CFG_SECAO_MAP[secaoAtiva]?.label || secaoAtiva;
    const descEl = document.getElementById('modal-restaurar-desc');
    if (descEl) descEl.innerHTML = `Deseja restaurar <strong>${label}</strong> com os valores salvos no banco?<br>Os campos voltarão ao último valor salvo.`;
    // Guarda a seção no botão de confirmar
    const btnConf = document.getElementById('btn-restaurar-confirmar');
    if (btnConf) btnConf.dataset.secao = secaoAtiva;
    document.getElementById('modal-confirmar-restaurar').classList.remove('cfg-hidden');
  });

  // Modal Restaurar — Confirmar
  document.getElementById('btn-restaurar-confirmar')?.addEventListener('click', () => {
    document.getElementById('modal-confirmar-restaurar').classList.add('cfg-hidden');
    const secaoAtiva = document.getElementById('btn-restaurar-confirmar').dataset.secao || 'geral';
    const label = CFG_SECAO_MAP[secaoAtiva]?.label || secaoAtiva;
    carregarConfiguracoes();
    mostrarToast(`${label} restaurado com sucesso.`, 'info');
  });

  // Modal Restaurar — Cancelar
  document.getElementById('btn-restaurar-cancelar')?.addEventListener('click', () => {
    document.getElementById('modal-confirmar-restaurar').classList.add('cfg-hidden');
  });

  // Modal — Atualizar
  document.getElementById('btn-confirmar-atualizar')?.addEventListener('click', async () => {
    document.getElementById('modal-confirmar-salvar').classList.add('cfg-hidden');
    if (_secaoPendente) await executarSalvarSecao(_secaoPendente);
    _secaoPendente = null;
  });

  // Modal — Excluir (somente ADM, somente a chave da seção)
  document.getElementById('btn-confirmar-excluir')?.addEventListener('click', async () => {
    const u = window.sessionCRV?.obterUsuarioLogado?.() || {};
    if (u.perfil !== 'admin') {
      mostrarToast('Apenas administradores podem excluir configurações.', 'error');
      document.getElementById('modal-confirmar-salvar').classList.add('cfg-hidden');
      return;
    }
    const secaoId = _secaoPendente || 'geral';
    const cfg     = CFG_SECAO_MAP[secaoId];
    _secaoPendente = null;
    document.getElementById('modal-confirmar-salvar').classList.add('cfg-hidden');
    if (!cfg) return;
    const supabase = getSupabaseInstance();
    if (!supabase) return;
    const { error } = await supabase.from('configuracoes').delete().eq('chave', cfg.chave);
    if (error) { mostrarToast(`Erro ao excluir ${cfg.label}.`, 'error'); return; }
    cfg.limpar.forEach(id => setVal(id, ''));
    mostrarToast(`Dados de ${cfg.label} excluídos.`, 'success');
  });

  // Modal — Cancelar (salvar)
  document.getElementById('btn-confirmar-cancelar')?.addEventListener('click', () => {
    document.getElementById('modal-confirmar-salvar').classList.add('cfg-hidden');
    _secaoPendente = null;
  });

  // Modal erro validação — fechar
  document.getElementById('btn-erro-fechar')?.addEventListener('click', () => {
    document.getElementById('modal-erro-validacao').classList.add('cfg-hidden');
  });
}


/* =====================================================
   CARREGAR CONFIGURAÇÕES DO SUPABASE
   ===================================================== */

async function carregarConfiguracoes() {
  const supabase = getSupabaseInstance();
  if (!supabase) return;
  const { data, error } = await supabase
    .from('configuracoes')
    .select('chave, valor');

  if (error || !data) return;

  const cfg = {};
  data.forEach(r => { cfg[r.chave] = r.valor; });

  const emp  = cfg['empresa']        || {};
  const reg  = cfg['regional']       || {};
  const comp = cfg['comportamento']  || {};
  const ap   = cfg['aparencia']      || {};
  const seg  = cfg['seguranca']      || {};
  const nt   = cfg['notificacoes']   || {};
  const intg = cfg['integracao']     || {};
  const bkp  = cfg['backup']         || {};

  // Empresa
  setVal('cfg-empresa-nome',     emp.nome);
  setVal('cfg-empresa-cnpj',     formatarCNPJ(emp.cnpj || ''));
  setVal('cfg-empresa-endereco', emp.endereco);
  setVal('cfg-empresa-tel',      formatarTelefone(emp.tel || ''));

  // Regional
  setVal('cfg-fuso',     reg.fuso);
  setVal('cfg-data-fmt', reg.dataFmt);
  setVal('cfg-idioma',   reg.idioma);

  // Comportamento
  setCheck('cfg-logout-auto', comp.logoutAuto !== false);
  setVal('cfg-inatividade',   comp.inatividade || '30');
  setCheck('cfg-som-alerta',  comp.somAlerta);

  // Aparência — usa o tema salvo ou mantém o tema atual do documento
  const temaCarregado = ap.tema || document.documentElement.getAttribute('data-theme') || 'dark';
  aplicarTema(temaCarregado);
  marcarTemaAtivo(temaCarregado);
  setCheck('cfg-sidebar-collapsed', ap.sidebarCollapsed);
  setCheck('cfg-anim-reduzida',     ap.animReduzida);
  setCheck('cfg-densidade',         ap.densidade);

  // Logo salvo
  if (ap.logoUrl) {
    exibirLogoPreview(ap.logoUrl);
    aplicarLogoHeader(ap.logoUrl);
  }

  // Segurança
  setCheck('cfg-senha-forte',  seg.senhaForte !== false);
  setCheck('cfg-senha-expira', seg.senhaExpira !== false);
  setVal('cfg-prazo-senha',    seg.prazoSenha || '60');
  setCheck('cfg-2fa',          seg.twofa);
  setVal('cfg-tentativas',     seg.tentativas || '5');

  // Notificações
  setVal('cfg-email-notif',       nt.email);
  setVal('cfg-email-cc',          nt.cc);
  setCheck('cfg-notif-negado',    nt.negado !== false);
  setCheck('cfg-notif-critico',   nt.critico !== false);
  setCheck('cfg-notif-offline',   nt.offline !== false);
  setCheck('cfg-notif-relatorio', nt.relatorio);

  // Integração
  setVal('cfg-api-url',      intg.apiUrl);
  setVal('cfg-api-porta',    intg.apiPorta);
  setVal('cfg-api-usuario',  intg.apiUsuario);
  setCheck('cfg-sync-auto',  intg.syncAuto !== false);
  setVal('cfg-sync-intervalo', intg.syncIntervalo || '5');

  // Backup
  setCheck('cfg-backup-auto',      bkp.auto !== false);
  setVal('cfg-backup-freq',        bkp.freq || 'diario');
  setVal('cfg-backup-retencao',    bkp.retencao || '30');
  if (bkp.ultimoBackup) {
    const el = document.getElementById('cfg-backup-ultimo');
    const elA = document.getElementById('cfg-ultimo-backup');
    if (el)  el.innerHTML  = `<i class="ph ph-check-circle" style="color:var(--success);"></i> Último backup: ${bkp.ultimoBackup}`;
    if (elA) elA.textContent = bkp.ultimoBackup;
  }
}


/* =====================================================
   SALVAR CONFIGURAÇÕES NO SUPABASE
   ===================================================== */



/* =====================================================
   MODAL OPERADOR — CRIAR / EDITAR
   ===================================================== */

function initModalOperador() {
  const overlay   = document.getElementById('modal-operador');
  const btnNovo   = document.getElementById('btn-novo-operador');
  const btnFechar = document.getElementById('modal-operador-fechar');
  const btnCanc   = document.getElementById('btn-operador-cancelar');
  const btnSalvar = document.getElementById('btn-operador-salvar');

  console.log('[CFG] initModalOperador', { overlay, btnNovo, btnFechar, btnCanc, btnSalvar });

  const abrir = (operador = null) => {
    if (!overlay) return;
    document.getElementById('operador-id').value       = operador?.id    || '';
    document.getElementById('operador-nome').value     = operador?.nome  || '';
    document.getElementById('operador-email').value    = operador?.email || '';
    document.getElementById('operador-perfil').value   = operador?.perfil || 'operador';
    document.getElementById('modal-operador-erro').style.display = 'none';

    // Oculta campo senha ao editar
    const senhaGrupo = document.getElementById('operador-senha-grupo');
    if (senhaGrupo) senhaGrupo.style.display = operador ? 'none' : '';
    document.getElementById('operador-senha').value = '';

    const titulo = document.getElementById('modal-operador-titulo');
    titulo.innerHTML = operador
      ? '<i class="ph ph-pencil-simple"></i> Editar operador'
      : '<i class="ph ph-user-plus"></i> Novo operador';

    overlay.classList.remove('cfg-hidden');
    document.body.style.overflow = 'hidden';
  };

  const fechar = () => {
    if (!overlay) return;
    overlay.classList.add('cfg-hidden');
    document.body.style.overflow = '';
  };

  if (btnNovo) {
    btnNovo.addEventListener('click', () => abrir());
  } else {
    document.body.addEventListener('click', e => {
      if (e.target.closest('#btn-novo-operador')) {
        abrir();
      }
    });
  }

  btnFechar?.addEventListener('click', fechar);
  btnCanc?.addEventListener('click', fechar);

  btnSalvar?.addEventListener('click', async () => {
    const id     = document.getElementById('operador-id').value;
    const nome   = document.getElementById('operador-nome').value.trim();
    const email  = document.getElementById('operador-email').value.trim();
    const perfil = document.getElementById('operador-perfil').value;
    const senha  = document.getElementById('operador-senha').value;
    const erro   = document.getElementById('modal-operador-erro');

    if (!nome || !email) {
      erro.textContent   = 'Nome e e-mail são obrigatórios.';
      erro.style.display = 'block';
      return;
    }
    if (!id && senha.length < 8) {
      erro.textContent   = 'A senha deve ter no mínimo 8 caracteres.';
      erro.style.display = 'block';
      return;
    }

    const supabase = getSupabaseInstance();
    let dbError;

    if (id) {
      // Editar usuário existente
      const { error } = await supabase
        .from('usuarios')
        .update({ nome, perfil })
        .eq('id', id);
      dbError = error;
    } else {
      // Criar usuário real no Supabase Auth e registrar perfil interno
      try {
        // Obter token de autenticação (opcional para primeiro usuário)
        let authHeaders = {
          'Content-Type': 'application/json'
        };

        if (supabase) {
          try {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (!sessionError && session) {
              authHeaders['Authorization'] = `Bearer ${session.access_token}`;
            }
          } catch (e) {
            console.warn('[CFG] Erro ao obter sessão, tentando sem token:', e);
          }
        }

        const response = await fetch('/api/usuarios', {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ nome, email, perfil, senha })
        });

        const result = await response.json();
        if (!response.ok || !result.success) {
          dbError = { message: result.error || 'Erro ao criar usuário.' };
        }
      } catch (err) {
        dbError = { message: err.message || 'Erro de rede ao criar usuário.' };
      }
    }

    if (dbError) {
      erro.textContent   = 'Erro: ' + dbError.message;
      erro.style.display = 'block';
      return;
    }

    await registrarAuditoria({
      acao:      id ? 'editar' : 'criar',
      modulo:    'usuarios',
      tabela:    'usuarios',
      descricao: `${id ? 'Operador editado' : 'Novo operador cadastrado'}: ${nome} (${email}) — perfil: ${perfil}`,
      nivel:     'aviso',
    });

    fechar();
    carregarOperadores();
    mostrarToast(id ? 'Operador atualizado!' : 'Operador cadastrado!', 'success');
  });

  // Expõe para renderLinhaOperador usar
  window._abrirModalOperador = abrir;
}


/* =====================================================
   OPERADORES — LISTAR / REMOVER
   ===================================================== */

async function carregarOperadores() {
  const supabase = getSupabaseInstance();
  if (!supabase) return;
  const tbody    = document.getElementById('cfg-usuarios-tbody');
  const empty    = document.getElementById('cfg-usuarios-empty');
  const wrap     = document.getElementById('cfg-usuarios-table-wrap');

  const { data, error } = await supabase
    .from('usuarios')
    .select('id, nome, email, perfil, ativo, ultimo_login')
    .order('created_at', { ascending: false });

  if (error || !data || !data.length) {
    empty?.classList.remove('cfg-hidden');
    wrap?.classList.add('cfg-hidden');
    return;
  }

  empty?.classList.add('cfg-hidden');
  wrap?.classList.remove('cfg-hidden');
  tbody.innerHTML = '';
  data.forEach(op => renderLinhaOperador(op));
}

function renderLinhaOperador(op) {
  const tbody = document.getElementById('cfg-usuarios-tbody');
  if (!tbody) return;

  const perfilLabel = { admin: 'Administrador', operador: 'Operador', visualizador: 'Visualizador' };
  const perfilBadge = { admin: 'badge-danger',  operador: 'badge-warning', visualizador: 'badge-neutral' };

  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>
      <div style="display:flex;align-items:center;gap:.6rem;">
        <div style="width:32px;height:32px;border-radius:50%;background:var(--primary);
          display:flex;align-items:center;justify-content:center;
          font-size:.72rem;font-weight:700;color:#fff;flex-shrink:0;">
          ${iniciais(op.nome)}
        </div>
        <span>${op.nome || '—'}</span>
      </div>
    </td>
    <td class="text-sm text-muted">${op.email || '—'}</td>
    <td><span class="badge ${perfilBadge[op.perfil] || 'badge-neutral'}">
      ${perfilLabel[op.perfil] || op.perfil || '—'}
    </span></td>
    <td class="text-sm text-muted">
      ${op.ultimo_login ? new Date(op.ultimo_login).toLocaleString('pt-BR') : 'Nunca'}
    </td>
    <td>
      <span class="badge ${op.ativo ? 'badge-success' : 'badge-neutral'}">
        ${op.ativo ? 'Ativo' : 'Inativo'}
      </span>
    </td>
    <td>
      <div style="display:flex;gap:.35rem;">
        <button class="btn btn-ghost btn-sm" title="Editar"
          onclick="window._abrirModalOperador(${JSON.stringify(op).replace(/"/g, '&quot;')})">
          <i class="ph ph-pencil-simple"></i>
        </button>
        <button class="btn btn-ghost btn-sm" title="${op.ativo ? 'Desativar' : 'Ativar'}"
          onclick="alternarOperador('${op.id}', ${!op.ativo})">
          <i class="ph ph-${op.ativo ? 'prohibit' : 'check-circle'}"></i>
        </button>
      </div>
    </td>
  `;
  tbody.appendChild(tr);
}

window.alternarOperador = async function (id, novoStatus) {
  const supabase = getSupabaseInstance();
  await supabase.from('usuarios').update({ ativo: novoStatus }).eq('id', id);
  await registrarAuditoria({
    acao:      'editar',
    modulo:    'usuarios',
    tabela:    'usuarios',
    descricao: `Operador ${novoStatus ? 'ativado' : 'desativado'} (id: ${id})`,
    nivel:     'aviso',
  });
  carregarOperadores();
};


/* =====================================================
   HELPERS SUPABASE
   ===================================================== */

async function lerChave(chave) {
  const supabase = getSupabaseInstance();
  const { data } = await supabase
    .from('configuracoes')
    .select('valor')
    .eq('chave', chave)
    .maybeSingle();
  return data?.valor ?? null;
}

async function salvarChave(chave, valor) {
  const supabase = getSupabaseInstance();

  // Lê o valor já salvo e mescla com os novos dados
  // assim campos não presentes no formulário não são apagados
  const existente = await lerChave(chave) || {};
  const merged = { ...existente, ...valor };

  const { error } = await supabase
    .from('configuracoes')
    .upsert(
      { chave, valor: merged, updated_at: new Date().toISOString() },
      { onConflict: 'chave' }
    );

  if (error) console.error(`[CFG] Erro ao salvar chave "${chave}":`, error.message);
  return !error;
}


/* =====================================================
   TOAST — FEEDBACK VISUAL
   ===================================================== */

function mostrarToast(msg, tipo = 'success') {
  const cores  = { success: 'var(--success)', error: 'var(--danger)', info: 'var(--primary)' };
  const icones = { success: 'ph-check-circle', error: 'ph-x-circle', info: 'ph-info' };

  const toast = document.createElement('div');
  toast.style.cssText = `
    position:fixed;bottom:1.5rem;right:1.5rem;z-index:9999;
    background:var(--surface);border:1px solid var(--border);
    border-left:3px solid ${cores[tipo]};
    border-radius:var(--radius-md,8px);
    padding:.75rem 1.25rem;
    display:flex;align-items:center;gap:.6rem;
    box-shadow:var(--shadow-md);
    font-size:.875rem;color:var(--text-primary);
    animation:slideInToast .25s ease;
  `;
  toast.innerHTML = `<i class="ph ${icones[tipo]}" style="color:${cores[tipo]};font-size:1.1rem;"></i>${msg}`;

  if (!document.getElementById('toast-style')) {
    const s = document.createElement('style');
    s.id = 'toast-style';
    s.textContent = `@keyframes slideInToast{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`;
    document.head.appendChild(s);
  }

  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity .3s'; }, 2800);
  setTimeout(() => toast.remove(), 3200);
}


/* =====================================================
   UTILITÁRIOS
   ===================================================== */

function setVal(id, val) {
  const el = document.getElementById(id);
  if (el && val !== undefined && val !== null) el.value = val;
}

function getVal(id) {
  return document.getElementById(id)?.value ?? '';
}

function setCheck(id, val) {
  const el = document.getElementById(id);
  if (el) el.checked = !!val;
}

function getCheck(id) {
  return document.getElementById(id)?.checked ?? false;
}

function iniciais(nome) {
  if (!nome) return '?';
  return nome.split(' ').filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('');
}


/* =====================================================
   MÁSCARAS DE ENTRADA
   ===================================================== */

/**
 * Formata string como CNPJ: XX.XXX.XXX/XXXX-XX
 * Aceita dígitos brutos ou já parcialmente formatados.
 */
function formatarCNPJ(valor) {
  const d = valor.replace(/\D/g, '').slice(0, 14);
  if (d.length === 0) return '';
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2}\.\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{2}\.\d{3}\.\d{3})(\d)/, '$1/$2')
    .replace(/^(\d{2}\.\d{3}\.\d{3}\/\d{4})(\d)/, '$1-$2');
}

/**
 * Formata string como telefone brasileiro.
 * 10 dígitos → (XX) XXXX-XXXX
 * 11 dígitos → (XX) XXXXX-XXXX
 */
function formatarTelefone(valor) {
  const d = valor.replace(/\D/g, '').slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 10) {
    return d
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d{1,4})$/, '$1-$2');
  }
  return d
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d{1,4})$/, '$1-$2');
}

/**
 * Inicializa as máscaras dos campos do formulário de empresa.
 */
function initMascaras() {
  // ── CNPJ ──────────────────────────────────────────
  const cnpjEl = document.getElementById('cfg-empresa-cnpj');
  if (cnpjEl) {
    cnpjEl.setAttribute('maxlength', '18');   // XX.XXX.XXX/XXXX-XX = 18 chars
    cnpjEl.setAttribute('inputmode', 'numeric');
    cnpjEl.addEventListener('input', function () {
      const pos = this.selectionStart;
      const prev = this.value.length;
      this.value = formatarCNPJ(this.value);
      // Mantém cursor em posição razoável após formatação
      const diff = this.value.length - prev;
      this.setSelectionRange(pos + diff, pos + diff);
    });
  }

  // ── Telefone ───────────────────────────────────────
  const telEl = document.getElementById('cfg-empresa-tel');
  if (telEl) {
    telEl.setAttribute('maxlength', '15');    // (XX) XXXXX-XXXX = 15 chars
    telEl.setAttribute('inputmode', 'numeric');
    telEl.addEventListener('input', function () {
      const pos = this.selectionStart;
      const prev = this.value.length;
      this.value = formatarTelefone(this.value);
      const diff = this.value.length - prev;
      this.setSelectionRange(pos + diff, pos + diff);
    });
  }
}