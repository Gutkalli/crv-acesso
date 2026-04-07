/* =====================================================
   CRV CONTROLE DE ACESSO
   TELA: AUDITORIA
   ===================================================== */

document.addEventListener('DOMContentLoaded', () => {
  preencherDatas();
  initFiltros();
  initModalDetalhe();
  initPaginacao();
  initAcoes();
  carregarTudo();
});

/* =====================================================
   ESTADO
   ===================================================== */

const estado = {
  pagina: 1,
  itensPorPagina: 20,
  totalRegistros: 0,
  totalPaginas: 1,
};

function getFiltros() {
  return {
    busca:    document.getElementById('busca-audit')?.value.trim()          || '',
    modulo:   document.getElementById('filtro-modulo-audit')?.value         || '',
    acao:     document.getElementById('filtro-acao-audit')?.value           || '',
    nivel:    document.getElementById('filtro-nivel-audit')?.value          || '',
    dataIni:  document.getElementById('filtro-data-ini-audit')?.value       || '',
    dataFim:  document.getElementById('filtro-data-fim-audit')?.value       || '',
  };
}

/* =====================================================
   CARGA PRINCIPAL
   ===================================================== */

async function carregarTudo() {
  await Promise.all([
    carregarKpis(),
    carregarLogs(),
    carregarResumoDia(),
  ]);
}

/* =====================================================
   KPIs
   ===================================================== */

async function carregarKpis() {
  const supabase = window.getSupabase();
  if (!supabase) return;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const hojeISO = hoje.toISOString();

  // Total geral
  const { count: total } = await supabase
    .from('auditoria')
    .select('*', { count: 'exact', head: true });

  // Ações hoje
  const { count: acoesHoje } = await supabase
    .from('auditoria')
    .select('*', { count: 'exact', head: true })
    .gte('data', hojeISO);

  // Críticos (nivel = 'critico') hoje
  const { count: criticos } = await supabase
    .from('auditoria')
    .select('*', { count: 'exact', head: true })
    .eq('nivel', 'critico')
    .gte('data', hojeISO);

  // Usuários distintos hoje — busca os registros e conta client-side
  const { data: usuariosHoje } = await supabase
    .from('auditoria')
    .select('usuario_id')
    .gte('data', hojeISO);

  const usuariosUnicos = new Set(
    (usuariosHoje || []).map(r => r.usuario_id).filter(Boolean)
  ).size;

  document.getElementById('kpi-total-logs').textContent    = total        ?? 0;
  document.getElementById('kpi-acoes-hoje').textContent    = acoesHoje    ?? 0;
  document.getElementById('kpi-criticos').textContent      = criticos     ?? 0;
  document.getElementById('kpi-usuarios-ativos').textContent = usuariosUnicos;
}

/* =====================================================
   LOGS — QUERY PRINCIPAL
   ===================================================== */

async function carregarLogs() {
  const supabase = window.getSupabase();
  if (!supabase) return;
  const f = getFiltros();

  const from = (estado.pagina - 1) * estado.itensPorPagina;
  const to   = from + estado.itensPorPagina - 1;

  // JOIN com usuarios para trazer o nome
  let query = supabase
    .from('auditoria')
    .select(`
      id,
      acao,
      modulo,
      descricao,
      ip,
      nivel,
      extra,
      registro_id,
      data,
      usuario_id,
      usuarios ( nome, email )
    `, { count: 'exact' })
    .order('data', { ascending: false })
    .range(from, to);

  // Filtros
  if (f.modulo)  query = query.eq('modulo', f.modulo);
  if (f.acao)    query = query.eq('acao',   f.acao);
  if (f.nivel)   query = query.eq('nivel',  f.nivel);

  if (f.dataIni) query = query.gte('data', new Date(f.dataIni + 'T00:00:00').toISOString());
  if (f.dataFim) query = query.lte('data', new Date(f.dataFim + 'T23:59:59').toISOString());

  if (f.busca) {
    // Busca em descricao, modulo e ip
    query = query.or(
      `descricao.ilike.%${f.busca}%,modulo.ilike.%${f.busca}%,ip.ilike.%${f.busca}%`
    );
  }

  const { data, count, error } = await query;

  if (error) {
    console.error('Erro ao carregar auditoria:', error.message);
    return;
  }

  estado.totalRegistros = count || 0;
  estado.totalPaginas   = Math.max(1, Math.ceil(estado.totalRegistros / estado.itensPorPagina));

  renderTabela(data || []);
  atualizarPaginacao();
}

/* =====================================================
   RENDERIZAÇÃO DA TABELA
   ===================================================== */

function renderTabela(logs) {
  const tbody = document.getElementById('audit-tbody');
  const empty = document.getElementById('audit-empty');
  const wrap  = document.getElementById('audit-table-wrap');
  const pag   = document.getElementById('audit-paginacao');
  const label = document.getElementById('audit-total-label');

  tbody.innerHTML = '';

  if (!logs.length) {
    empty.classList.remove('audit-hidden');
    wrap.classList.add('audit-hidden');
    pag.classList.add('audit-hidden');
    label.textContent = '0 registros';
    return;
  }

  empty.classList.add('audit-hidden');
  wrap.classList.remove('audit-hidden');
  pag.classList.remove('audit-hidden');
  label.textContent = `${estado.totalRegistros} registro${estado.totalRegistros !== 1 ? 's' : ''}`;

  logs.forEach(log => renderLinhaAudit(normalizar(log)));
}

/**
 * Normaliza o objeto vindo do Supabase para o formato
 * que as funções de renderização esperam.
 */
function normalizar(raw) {
  return {
    id:        raw.id,
    usuario:   raw.usuarios?.nome || raw.usuarios?.email || raw.usuario_id || '—',
    acao:      raw.acao,
    modulo:    raw.modulo    || '—',
    descricao: raw.descricao || '—',
    ip:        raw.ip        || '—',
    nivel:     raw.nivel     || 'info',
    dataHora:  raw.data ? formatarData(raw.data) : '—',
    payload:   raw.extra     || null,
    avatarColor: corAvatar(raw.usuario_id),
  };
}

/* =====================================================
   TIMELINE — RESUMO DO DIA
   ===================================================== */

async function carregarResumoDia() {
  const supabase = window.getSupabase();
  if (!supabase) return;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const { data } = await supabase
    .from('auditoria')
    .select('acao, modulo, descricao, data, nivel')
    .gte('data', hoje.toISOString())
    .order('data', { ascending: false })
    .limit(8);

  const lista = document.getElementById('audit-resumo-list');
  lista.innerHTML = '';

  if (!data || !data.length) {
    lista.innerHTML = `
      <div class="audit-resumo-item">
        <div class="audit-resumo-hora">—</div>
        <div class="audit-resumo-dot muted"></div>
        <div class="audit-resumo-info">
          <div class="audit-resumo-titulo">Nenhuma ação hoje</div>
          <div class="audit-resumo-sub">Sistema aguardando eventos</div>
        </div>
      </div>`;
    return;
  }

  const corNivel = { info: 'primary', aviso: 'warning', critico: 'danger' };

  data.forEach(r => {
    renderResumoItem({
      hora:   formatarHora(r.data),
      titulo: `${r.acao || '—'}${r.modulo ? ` — ${r.modulo}` : ''}`,
      sub:    r.descricao || '',
      cor:    corNivel[r.nivel] || 'muted',
    });
  });
}

/* =====================================================
   FILTROS
   ===================================================== */

function initFiltros() {
  let debounce;

  document.getElementById('busca-audit')?.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      estado.pagina = 1;
      carregarLogs();
    }, 350);
  });

  ['filtro-modulo-audit', 'filtro-acao-audit', 'filtro-nivel-audit'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', () => {
      estado.pagina = 1;
      carregarLogs();
    });
  });

  document.getElementById('filtro-data-ini-audit')?.addEventListener('change', () => {
    estado.pagina = 1;
    carregarLogs();
  });

  document.getElementById('filtro-data-fim-audit')?.addEventListener('change', () => {
    estado.pagina = 1;
    carregarLogs();
  });
}

function preencherDatas() {
  const hoje = new Date().toISOString().split('T')[0];
  const ini  = document.getElementById('filtro-data-ini-audit');
  const fim  = document.getElementById('filtro-data-fim-audit');

  // Padrão: últimos 7 dias → hoje
  const seteDias = new Date();
  seteDias.setDate(seteDias.getDate() - 7);
  if (ini) ini.value = seteDias.toISOString().split('T')[0];
  if (fim) fim.value = hoje;
}

/* =====================================================
   PAGINAÇÃO
   ===================================================== */

function initPaginacao() {
  document.getElementById('audit-pag-ant')?.addEventListener('click', () => {
    if (estado.pagina <= 1) return;
    estado.pagina--;
    carregarLogs();
  });

  document.getElementById('audit-pag-prox')?.addEventListener('click', () => {
    if (estado.pagina >= estado.totalPaginas) return;
    estado.pagina++;
    carregarLogs();
  });
}

function atualizarPaginacao() {
  const info    = document.getElementById('audit-pag-info');
  const btnAnt  = document.getElementById('audit-pag-ant');
  const btnProx = document.getElementById('audit-pag-prox');

  if (info)    info.textContent = `Página ${estado.pagina} de ${estado.totalPaginas}`;
  if (btnAnt)  btnAnt.disabled  = estado.pagina <= 1;
  if (btnProx) btnProx.disabled = estado.pagina >= estado.totalPaginas;
}

/* =====================================================
   MODAL — DETALHE DO LOG
   ===================================================== */

function initModalDetalhe() {
  const overlay    = document.getElementById('modal-audit-detalhe');
  const btnFechar  = document.getElementById('modal-audit-fechar');
  const btnFechar2 = document.getElementById('btn-audit-fechar');
  const btnCopiar  = document.getElementById('btn-audit-copiar');

  const fechar = () => {
    overlay.classList.add('audit-hidden');
    document.body.style.overflow = '';
  };

  btnFechar?.addEventListener('click',  fechar);
  btnFechar2?.addEventListener('click', fechar);

  btnCopiar?.addEventListener('click', () => {
    const pre = document.querySelector('.audit-json-pre');
    if (!pre) return;
    navigator.clipboard.writeText(pre.textContent)
      .then(() => {
        btnCopiar.innerHTML = '<i class="ph ph-check"></i> Copiado!';
        setTimeout(() => {
          btnCopiar.innerHTML = '<i class="ph ph-copy"></i> Copiar JSON';
        }, 2000);
      })
      .catch(() => console.warn('Clipboard indisponível'));
  });
}

function abrirDetalheLog(log) {
  const overlay = document.getElementById('modal-audit-detalhe');
  const body    = document.getElementById('modal-audit-body');
  if (!overlay || !body) return;

  const nivelBadge = {
    info:    '<span class="audit-nivel-badge info"><i class="ph ph-info"></i>Info</span>',
    aviso:   '<span class="audit-nivel-badge aviso"><i class="ph ph-warning"></i>Aviso</span>',
    critico: '<span class="audit-nivel-badge critico"><i class="ph ph-warning-circle"></i>Crítico</span>',
  }[log.nivel] || '';

  const jsonPayload = log.payload
    ? JSON.stringify(log.payload, null, 2)
    : JSON.stringify({ info: 'Nenhum dado adicional registrado.' }, null, 2);

  body.innerHTML = `
    <div class="audit-detalhe-grid">
      <div class="audit-detalhe-row">
        <span class="audit-detalhe-label">Usuário</span>
        <div class="audit-user">
          <div class="audit-user-avatar" style="background:${log.avatarColor};">
            ${iniciais(log.usuario)}
          </div>
          <span class="audit-detalhe-valor">${log.usuario}</span>
        </div>
      </div>
      <div class="audit-detalhe-row">
        <span class="audit-detalhe-label">Ação</span>
        <span class="audit-detalhe-valor">${gerarAcaoBadge(log.acao)}</span>
      </div>
      <div class="audit-detalhe-row">
        <span class="audit-detalhe-label">Módulo</span>
        <span class="audit-detalhe-valor">${log.modulo}</span>
      </div>
      <div class="audit-detalhe-row">
        <span class="audit-detalhe-label">Descrição</span>
        <span class="audit-detalhe-valor">${log.descricao}</span>
      </div>
      <div class="audit-detalhe-row">
        <span class="audit-detalhe-label">IP</span>
        <span class="audit-detalhe-valor" style="font-family:monospace;">${log.ip}</span>
      </div>
      <div class="audit-detalhe-row">
        <span class="audit-detalhe-label">Data / Hora</span>
        <span class="audit-detalhe-valor">${log.dataHora}</span>
      </div>
      <div class="audit-detalhe-row">
        <span class="audit-detalhe-label">Nível</span>
        <span class="audit-detalhe-valor">${nivelBadge}</span>
      </div>
    </div>

    <div class="audit-json-wrap">
      <div class="audit-json-titulo"><i class="ph ph-code"></i> Payload (extra)</div>
      <pre class="audit-json-pre">${escapeHtml(jsonPayload)}</pre>
    </div>
  `;

  overlay.classList.remove('audit-hidden');
  document.body.style.overflow = 'hidden';
}

/* =====================================================
   AÇÕES DO CABEÇALHO
   ===================================================== */

function initAcoes() {
  document.getElementById('btn-audit-exportar')?.addEventListener('click', exportarCSV);
}

async function exportarCSV() {
  const supabase = window.getSupabase();
  if (!supabase) return;
  const f = getFiltros();
  const btn = document.getElementById('btn-audit-exportar');

  btn.disabled = true;
  btn.innerHTML = '<i class="ph ph-spinner"></i> Exportando...';

  let query = supabase
    .from('auditoria')
    .select(`
      id, acao, modulo, descricao, ip, nivel, registro_id, data,
      usuarios ( nome, email )
    `)
    .order('data', { ascending: false });

  if (f.modulo)  query = query.eq('modulo', f.modulo);
  if (f.acao)    query = query.eq('acao',   f.acao);
  if (f.nivel)   query = query.eq('nivel',  f.nivel);
  if (f.dataIni) query = query.gte('data', new Date(f.dataIni + 'T00:00:00').toISOString());
  if (f.dataFim) query = query.lte('data', new Date(f.dataFim + 'T23:59:59').toISOString());

  const { data } = await query;

  if (!data || !data.length) {
    alert('Nenhum dado para exportar com os filtros aplicados.');
    btn.disabled = false;
    btn.innerHTML = '<i class="ph ph-download-simple"></i> Exportar';
    return;
  }

  const colunas = ['Data/Hora', 'Usuário', 'Ação', 'Módulo', 'Descrição', 'IP', 'Nível'];
  const linhas  = data.map(r => [
    formatarData(r.data),
    r.usuarios?.nome || r.usuarios?.email || '—',
    r.acao    || '—',
    r.modulo  || '—',
    (r.descricao || '—').replace(/"/g, '""'),
    r.ip      || '—',
    r.nivel   || '—',
  ].map(v => `"${v}"`).join(','));

  const csv  = [colunas.join(','), ...linhas].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `auditoria_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);

  btn.disabled = false;
  btn.innerHTML = '<i class="ph ph-download-simple"></i> Exportar';
}

/* =====================================================
   HELPERS EXPORTADOS
   (usados internamente — mantida compatibilidade com
   chamadas externas caso existam)
   ===================================================== */

function renderLinhaAudit(log) {
  const tbody = document.getElementById('audit-tbody');
  if (!tbody) return;

  const nivelBadge = {
    info:    '<span class="audit-nivel-badge info"><i class="ph ph-info"></i>Info</span>',
    aviso:   '<span class="audit-nivel-badge aviso"><i class="ph ph-warning"></i>Aviso</span>',
    critico: '<span class="audit-nivel-badge critico"><i class="ph ph-warning-circle"></i>Crítico</span>',
  }[log.nivel] || '—';

  const tr = document.createElement('tr');
  tr.style.cursor = 'pointer';
  tr.title = 'Clique para ver detalhes';

  tr.innerHTML = `
    <td>
      <div class="audit-user">
        <div class="audit-user-avatar" style="background:${log.avatarColor};">
          ${iniciais(log.usuario)}
        </div>
        <span class="audit-user-nome">${log.usuario}</span>
      </div>
    </td>
    <td>${gerarAcaoBadge(log.acao)}</td>
    <td class="text-sm">${log.modulo}</td>
    <td class="text-sm text-muted"
      style="max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"
      title="${log.descricao}">${log.descricao}</td>
    <td class="text-sm text-muted" style="font-family:monospace;">${log.ip}</td>
    <td class="text-sm text-muted">${log.dataHora}</td>
    <td>${nivelBadge}</td>
  `;

  tr.addEventListener('click', () => abrirDetalheLog(log));
  tbody.appendChild(tr);
}

function renderResumoItem(item) {
  const lista = document.getElementById('audit-resumo-list');
  if (!lista) return;

  const el = document.createElement('div');
  el.className = 'audit-resumo-item';
  el.innerHTML = `
    <div class="audit-resumo-hora">${item.hora || ''}</div>
    <div class="audit-resumo-dot ${item.cor || 'muted'}"></div>
    <div class="audit-resumo-info">
      <div class="audit-resumo-titulo">${item.titulo || ''}</div>
      <div class="audit-resumo-sub">${item.sub || ''}</div>
    </div>
  `;
  lista.appendChild(el);
}

/* =====================================================
   UTILITÁRIOS INTERNOS
   ===================================================== */

function gerarAcaoBadge(acao) {
  if (!acao) return '—';
  const icones = {
    criar:    'ph-plus-circle',
    editar:   'ph-pencil-simple',
    excluir:  'ph-trash',
    login:    'ph-sign-in',
    logout:   'ph-sign-out',
    exportar: 'ph-file-arrow-down',
    acessar:  'ph-eye',
  };
  const chave = acao.toLowerCase();
  const icone = icones[chave] || 'ph-dot-outline';
  return `<span class="audit-acao-badge ${chave}">
    <i class="ph ${icone}"></i>${acao}
  </span>`;
}

function iniciais(nome) {
  if (!nome || nome === '—') return '?';
  return nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0].toUpperCase())
    .join('');
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatarData(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', {
    day:    '2-digit',
    month:  '2-digit',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  });
}

function formatarHora(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour:   '2-digit',
    minute: '2-digit',
  });
}

/**
 * Gera uma cor de avatar determinística baseada no UUID do usuário.
 * Sempre retorna a mesma cor para o mesmo ID.
 */
function corAvatar(id) {
  const cores = [
    '#0ea5e9','#8b5cf6','#10b981','#f59e0b',
    '#ef4444','#ec4899','#06b6d4','#84cc16',
  ];
  if (!id) return cores[0];
  const idx = id.charCodeAt(0) % cores.length;
  return cores[idx];
}