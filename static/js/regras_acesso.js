/* ============================================================
   CRV CONTROLE DE ACESSO
   REGRAS DE ACESSO — regras_acesso.js
   ============================================================ */

console.log('🚀 REGRAS_ACESSO iniciado');

/* ============================================================
   ESTADO GLOBAL
   ============================================================ */
let regrasLista   = [];
let gruposLista   = [];
let areasLista    = [];
let regraEditando = null;
let grupoEditando = null;
let areaEditando  = null;

/* ============================================================
   INIT — aguarda partials do main.js
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  // Garante que os modais começam fechados independente de qualquer CSS externo
  ['modal-regra', 'modal-grupo', 'modal-area'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('regra-hidden');
  });

  initTabs();
  initModalRegra();
  initModalGrupo();
  initModalArea();
  initBusca();
  carregarTudo();

  // Exportar
  document.getElementById('btn-exportar')?.addEventListener('click', exportarCSV);
});

/* ============================================================
   CARREGAR TUDO
   ============================================================ */
async function carregarTudo() {
  await Promise.all([
    carregarRegras(),
    carregarGrupos(),
    carregarAreas()
  ]);
  atualizarKPIs();
}

/* ============================================================
   ABAS — usa .regra-hidden definido no regras_acesso.css
   ============================================================ */
function initTabs() {
  const paineis = {
    regras: 'tab-regras',
    grupos: 'tab-grupos',
    areas:  'tab-areas'
  };

  document.querySelectorAll('.regra-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.regra-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      Object.values(paineis).forEach(id => {
        document.getElementById(id)?.classList.add('regra-hidden');
      });

      const alvo = paineis[tab.dataset.tab];
      if (alvo) document.getElementById(alvo)?.classList.remove('regra-hidden');
    });
  });
}

/* ============================================================
   BUSCA + FILTROS
   ============================================================ */
function initBusca() {
  const inputBusca   = document.getElementById('busca-regras');
  const filtroTipo   = document.getElementById('filtro-tipo');
  const filtroStatus = document.getElementById('filtro-status');

  const aplicar = () => {
    const termo  = inputBusca?.value.toLowerCase() || '';
    const tipo   = filtroTipo?.value || '';
    const status = filtroStatus?.value || '';

    const filtrada = regrasLista.filter(r => {
      const matchTermo =
        !termo ||
        r.nome?.toLowerCase().includes(termo) ||
        r.grupos?.nome?.toLowerCase().includes(termo) ||
        r.areas?.nome?.toLowerCase().includes(termo);
      const matchTipo   = !tipo   || r.tipo   === tipo;
      const matchStatus = !status || r.status === status;
      return matchTermo && matchTipo && matchStatus;
    });

    renderizarRegras(filtrada);
  };

  inputBusca?.addEventListener('input', aplicar);
  filtroTipo?.addEventListener('change', aplicar);
  filtroStatus?.addEventListener('change', aplicar);
}

/* ============================================================
   HELPERS DE MODAL
   ============================================================ */
function abrirOverlay(id) {
  document.getElementById(id)?.classList.remove('regra-hidden');
  document.body.style.overflow = 'hidden';
}

function fecharOverlay(id) {
  document.getElementById(id)?.classList.add('regra-hidden');
  document.body.style.overflow = '';
}

/* ============================================================
   MODAL REGRA
   ============================================================ */
function initModalRegra() {
  const btnNovo      = document.getElementById('btn-nova-regra');
  const btnNovoEmpty = document.getElementById('btn-nova-regra-empty');
  const btnFechar    = document.getElementById('modal-regra-fechar');
  const btnCancelar  = document.getElementById('btn-regra-cancelar');
  const btnSalvar    = document.getElementById('btn-regra-salvar');
  const overlay      = document.getElementById('modal-regra');

  if (btnNovo)      btnNovo.addEventListener('click',      (e) => { e.stopPropagation(); abrirModalRegra(); });
  if (btnNovoEmpty) btnNovoEmpty.addEventListener('click', (e) => { e.stopPropagation(); abrirModalRegra(); });
  if (btnFechar)    btnFechar.addEventListener('click',    () => fecharOverlay('modal-regra'));
  if (btnCancelar)  btnCancelar.addEventListener('click',  () => fecharOverlay('modal-regra'));
  if (btnSalvar)    btnSalvar.addEventListener('click',    salvarRegra);

}

/* ============================================================
   MODAL GRUPO
   ============================================================ */

function initModalGrupo() {
  const btnNovo      = document.getElementById('btn-novo-grupo');
  const btnNovoEmpty = document.getElementById('btn-novo-grupo-empty');
  const btnFechar    = document.getElementById('modal-grupo-fechar');
  const btnCancelar  = document.getElementById('btn-grupo-cancelar');
  const btnSalvar    = document.getElementById('btn-grupo-salvar');
  const overlay      = document.getElementById('modal-grupo');

  if (btnNovo)      btnNovo.addEventListener('click',      (e) => { e.stopPropagation(); abrirModalGrupo(); });
  if (btnNovoEmpty) btnNovoEmpty.addEventListener('click', (e) => { e.stopPropagation(); abrirModalGrupo(); });
  if (btnFechar)    btnFechar.addEventListener('click',    () => fecharOverlay('modal-grupo'));
  if (btnCancelar)  btnCancelar.addEventListener('click',  () => fecharOverlay('modal-grupo'));
  if (btnSalvar)    btnSalvar.addEventListener('click',    salvarGrupo);

}

function abrirModalRegra(dados) {
  regraEditando = dados ? dados.id : null;

  document.getElementById('modal-regra-titulo').innerHTML = regraEditando
    ? '<i class="ph ph-shield"></i> Editar Regra'
    : '<i class="ph ph-shield-plus"></i> Nova Regra';

  preencherSelectsRegra();

  if (dados) {
    setVal('r-nome',       dados.nome);
    setVal('r-tipo',       dados.tipo);
    setVal('r-prioridade', dados.prioridade);
    setVal('r-grupo',      dados.grupo_id);
    setVal('r-area',       dados.area_id);
    setVal('r-hora-inicio',dados.horario_inicio);
    setVal('r-hora-fim',   dados.horario_fim);
    setVal('r-status',     dados.status);
    const dias = dados.dias_semana || [];
    document.querySelectorAll('.regra-dia input').forEach(cb => {
      cb.checked = dias.includes(Number(cb.value));
    });
  } else {
    limparModalRegra();
  }

  abrirOverlay('modal-regra');
}

function limparModalRegra() {
  ['r-nome', 'r-hora-inicio', 'r-hora-fim'].forEach(id => setVal(id, ''));
  ['r-tipo', 'r-grupo', 'r-area'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.selectedIndex = 0;
  });
  setVal('r-prioridade', 'normal');
  setVal('r-status', 'ativa');
  document.querySelectorAll('.regra-dia input').forEach((cb, i) => {
    cb.checked = i < 5;
  });
}

function preencherSelectsRegra() {
  const sg = document.getElementById('r-grupo');
  const sa = document.getElementById('r-area');
  if (!sg || !sa) return;

  sg.innerHTML = '<option value="">Selecione...</option>';
  sa.innerHTML = '<option value="">Selecione...</option>';

  gruposLista.forEach(g => sg.add(new Option(g.nome, g.id)));
  areasLista.forEach(a => sa.add(new Option(a.nome, a.id)));
}

async function salvarRegra() {
  const sb = window.getSupabase();
  if (!sb) { alert('Banco não conectado.'); return; }

  const nome = document.getElementById('r-nome')?.value.trim();
  const tipo = document.getElementById('r-tipo')?.value;
  if (!nome || !tipo) { alert('Preencha nome e tipo.'); return; }

  const dias = [];
  document.querySelectorAll('.regra-dia input').forEach(cb => {
    if (cb.checked) dias.push(Number(cb.value));
  });

  const dados = {
    nome,
    tipo,
    prioridade:     document.getElementById('r-prioridade')?.value || 'normal',
    grupo_id:       document.getElementById('r-grupo')?.value      || null,
    area_id:        document.getElementById('r-area')?.value       || null,
    horario_inicio: document.getElementById('r-hora-inicio')?.value || null,
    horario_fim:    document.getElementById('r-hora-fim')?.value    || null,
    dias_semana:    dias,
    status:         document.getElementById('r-status')?.value     || 'ativa'
  };

  const response = regraEditando
    ? await sb.from('regras_acesso').update(dados).eq('id', regraEditando)
    : await sb.from('regras_acesso').insert([dados]);

  if (response.error) { alert('Erro: ' + response.error.message); return; }

  fecharOverlay('modal-regra');
  regraEditando = null;
  await carregarRegras();
  atualizarKPIs();
}

function abrirModalGrupo(dados) {
  grupoEditando = dados ? dados.id : null;

  document.getElementById('modal-grupo-titulo').innerHTML = grupoEditando
    ? '<i class="ph ph-users-three"></i> Editar Grupo'
    : '<i class="ph ph-users-three"></i> Novo Grupo';

  setVal('g-nome',      dados ? dados.nome      : '');
  setVal('g-descricao', dados ? dados.descricao : '');

  abrirOverlay('modal-grupo');
}

async function salvarGrupo() {
  const sb = window.getSupabase();
  if (!sb) { alert('Banco não conectado.'); return; }

  const nome = document.getElementById('g-nome')?.value.trim();
  if (!nome) { alert('Nome obrigatório.'); return; }

  const dados = {
    nome,
    descricao: document.getElementById('g-descricao')?.value.trim() || null
  };

  const response = grupoEditando
    ? await sb.from('grupos').update(dados).eq('id', grupoEditando)
    : await sb.from('grupos').insert([dados]);

  if (response.error) { alert('Erro: ' + response.error.message); return; }

  fecharOverlay('modal-grupo');
  grupoEditando = null;
  await carregarGrupos();
  atualizarKPIs();
}

/* ============================================================
   MODAL ÁREA
   ============================================================ */
function initModalArea() {
  const btnNovo      = document.getElementById('btn-nova-area');
  const btnNovoEmpty = document.getElementById('btn-nova-area-empty');
  const btnFechar    = document.getElementById('modal-area-fechar');
  const btnCancelar  = document.getElementById('btn-area-cancelar');
  const btnSalvar    = document.getElementById('btn-area-salvar');
  const overlay      = document.getElementById('modal-area');

  if (btnNovo)      btnNovo.addEventListener('click',      (e) => { e.stopPropagation(); abrirModalArea(); });
  if (btnNovoEmpty) btnNovoEmpty.addEventListener('click', (e) => { e.stopPropagation(); abrirModalArea(); });
  if (btnFechar)    btnFechar.addEventListener('click',    () => fecharOverlay('modal-area'));
  if (btnCancelar)  btnCancelar.addEventListener('click',  () => fecharOverlay('modal-area'));
  if (btnSalvar)    btnSalvar.addEventListener('click',    salvarArea);

}

function abrirModalArea(dados) {
  areaEditando = dados ? dados.id : null;

  document.getElementById('modal-area-titulo').innerHTML = areaEditando
    ? '<i class="ph ph-map-pin"></i> Editar Área'
    : '<i class="ph ph-map-pin"></i> Nova Área';

  setVal('a-nome',      dados ? dados.nome           : '');
  setVal('a-descricao', dados ? dados.descricao      : '');
  setVal('a-nivel',     dados ? dados.nivel_restricao: 'baixo');

  abrirOverlay('modal-area');
}

async function salvarArea() {
  const sb = window.getSupabase();
  if (!sb) { alert('Banco não conectado.'); return; }

  const nome = document.getElementById('a-nome')?.value.trim();
  if (!nome) { alert('Nome obrigatório.'); return; }

  const dados = {
    nome,
    descricao:       document.getElementById('a-descricao')?.value.trim() || null,
    nivel_restricao: document.getElementById('a-nivel')?.value            || 'baixo'
  };

  const response = areaEditando
    ? await sb.from('areas').update(dados).eq('id', areaEditando)
    : await sb.from('areas').insert([dados]);

  if (response.error) { alert('Erro: ' + response.error.message); return; }

  fecharOverlay('modal-area');
  areaEditando = null;
  await carregarAreas();
  atualizarKPIs();
}

/* ============================================================
   CARREGAR REGRAS
   ============================================================ */
async function carregarRegras() {
  const sb = window.getSupabase();
  if (!sb) return;

  const { data, error } = await sb
    .from('regras_acesso')
    .select('*, grupos(nome), areas(nome)')
    .order('created_at', { ascending: false });

  if (error) { console.error('[REGRAS]', error); return; }

  regrasLista = data || [];
  renderizarRegras(regrasLista);
}

function renderizarRegras(lista) {
  const tbody     = document.getElementById('regras-tbody');
  const empty     = document.getElementById('regras-empty');
  const tableWrap = document.getElementById('regras-table-wrap');
  const total     = document.getElementById('regras-total');

  if (!tbody) return;
  tbody.innerHTML = '';

  if (!lista.length) {
    empty?.classList.remove('regra-hidden');
    tableWrap?.classList.add('regra-hidden');
    if (total) total.textContent = '0 regras';
    return;
  }

  empty?.classList.add('regra-hidden');
  tableWrap?.classList.remove('regra-hidden');
  if (total) total.textContent = `${lista.length} regra${lista.length !== 1 ? 's' : ''}`;

  lista.forEach(r => {
    const statusBadge = r.status === 'ativa'
      ? '<span class="badge badge-success">Ativa</span>'
      : '<span class="badge badge-neutral">Inativa</span>';

    const prioBadge = {
      alta:    '<span class="badge badge-warning">Alta</span>',
      critica: '<span class="badge badge-danger">Crítica</span>',
      normal:  '<span class="badge badge-info">Normal</span>'
    }[r.prioridade] || `<span class="badge">${r.prioridade || '—'}</span>`;

    const horario = r.horario_inicio && r.horario_fim
      ? `${r.horario_inicio} → ${r.horario_fim}`
      : '—';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${r.nome || '—'}</strong></td>
      <td>${r.tipo || '—'}</td>
      <td>${r.grupos?.nome || '—'}</td>
      <td>${r.areas?.nome  || '—'}</td>
      <td>${horario}</td>
      <td>${prioBadge}</td>
      <td>${statusBadge}</td>
      <td>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-ghost btn-sm btn-icon" title="Editar" onclick="editarRegra('${r.id}')">
            <i class="ph ph-pencil"></i>
          </button>
          <button class="btn btn-ghost btn-sm btn-icon" title="Excluir" onclick="excluirRegra('${r.id}')">
            <i class="ph ph-trash"></i>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/* ============================================================
   CARREGAR GRUPOS
   ============================================================ */
async function carregarGrupos() {
  const sb = window.getSupabase();
  if (!sb) return;

  const { data, error } = await sb.from('grupos').select('*').order('nome');
  if (error) { console.error('[GRUPOS]', error); return; }

  gruposLista = data || [];
  renderizarGrupos(gruposLista);
}

function renderizarGrupos(lista) {
  const grid  = document.getElementById('grupos-grid');
  const empty = document.getElementById('grupos-empty');
  if (!grid) return;

  grid.innerHTML = '';

  if (!lista.length) {
    empty?.classList.remove('regra-hidden');
    grid.classList.add('regra-hidden');
    return;
  }

  empty?.classList.add('regra-hidden');
  grid.classList.remove('regra-hidden');

  lista.forEach(g => {
    const card = document.createElement('div');
    card.className = 'regra-grupo-card';
    card.innerHTML = `
      <div class="regra-grupo-header">
        <div class="regra-grupo-icon"><i class="ph ph-users-three"></i></div>
        <div>
          <div class="regra-grupo-nome">${g.nome || '—'}</div>
          <div class="regra-grupo-desc">${g.descricao || 'Sem descrição'}</div>
        </div>
      </div>
      <div class="regra-grupo-footer">
        <span><i class="ph ph-users"></i> Grupo</span>
        <div style="display:flex;gap:4px;">
          <button class="btn btn-ghost btn-sm btn-icon" title="Editar" onclick="editarGrupo('${g.id}')">
            <i class="ph ph-pencil"></i>
          </button>
          <button class="btn btn-ghost btn-sm btn-icon" title="Excluir" onclick="excluirGrupo('${g.id}')">
            <i class="ph ph-trash"></i>
          </button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

/* ============================================================
   CARREGAR ÁREAS
   ============================================================ */
async function carregarAreas() {
  const sb = window.getSupabase();
  if (!sb) return;

  const { data, error } = await sb.from('areas').select('*').order('nome');
  if (error) { console.error('[AREAS]', error); return; }

  areasLista = data || [];
  renderizarAreas(areasLista);
}

function renderizarAreas(lista) {
  const grid  = document.getElementById('areas-grid');
  const empty = document.getElementById('areas-empty');
  if (!grid) return;

  grid.innerHTML = '';

  if (!lista.length) {
    empty?.classList.remove('regra-hidden');
    grid.classList.add('regra-hidden');
    return;
  }

  empty?.classList.add('regra-hidden');
  grid.classList.remove('regra-hidden');

  const nivelCor = {
    baixo:   'badge-success',
    medio:   'badge-warning',
    alto:    'badge-danger',
    critico: 'badge-danger'
  };

  lista.forEach(a => {
    const badge = nivelCor[a.nivel_restricao] || '';
    const card = document.createElement('div');
    card.className = 'regra-area-card';
    card.innerHTML = `
      <div class="regra-area-icon ${a.nivel_restricao === 'alto' || a.nivel_restricao === 'critico' ? 'restrita' : ''}">
        <i class="ph ph-map-pin"></i>
      </div>
      <div class="regra-area-nome">${a.nome || '—'}</div>
      <div class="regra-area-meta">${a.descricao || 'Sem descrição'}</div>
      <div class="regra-area-footer">
        <span class="badge ${badge}">${a.nivel_restricao || '—'}</span>
        <div style="display:flex;gap:4px;">
          <button class="btn btn-ghost btn-sm btn-icon" title="Editar" onclick="editarArea('${a.id}')">
            <i class="ph ph-pencil"></i>
          </button>
          <button class="btn btn-ghost btn-sm btn-icon" title="Excluir" onclick="excluirArea('${a.id}')">
            <i class="ph ph-trash"></i>
          </button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

/* ============================================================
   EDITAR
   ============================================================ */
function editarRegra(id) {
  const r = regrasLista.find(x => x.id == id);
  if (r) abrirModalRegra(r);
}

function editarGrupo(id) {
  const g = gruposLista.find(x => x.id == id);
  if (g) abrirModalGrupo(g);
}

function editarArea(id) {
  const a = areasLista.find(x => x.id == id);
  if (a) abrirModalArea(a);
}

/* ============================================================
   EXCLUIR
   ============================================================ */
async function excluirRegra(id) {
  if (!confirm('Excluir esta regra?')) return;
  const sb = window.getSupabase();
  const { error } = await sb.from('regras_acesso').delete().eq('id', id);
  if (error) { alert('Erro: ' + error.message); return; }
  await carregarRegras();
  atualizarKPIs();
}

async function excluirGrupo(id) {
  if (!confirm('Excluir este grupo?')) return;
  const sb = window.getSupabase();
  const { error } = await sb.from('grupos').delete().eq('id', id);
  if (error) { alert('Erro: ' + error.message); return; }
  await carregarGrupos();
  atualizarKPIs();
}

async function excluirArea(id) {
  if (!confirm('Excluir esta área?')) return;
  const sb = window.getSupabase();
  const { error } = await sb.from('areas').delete().eq('id', id);
  if (error) { alert('Erro: ' + error.message); return; }
  await carregarAreas();
  atualizarKPIs();
}

/* ============================================================
   KPIs
   ============================================================ */
function atualizarKPIs() {
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };
  set('kpi-regras',   regrasLista.filter(r => r.status === 'ativa').length);
  set('kpi-grupos',   gruposLista.length);
  set('kpi-areas',    areasLista.length);
  set('kpi-horarios', regrasLista.filter(r => r.horario_inicio).length);
}

/* ============================================================
   HELPER
   ============================================================ */
function setVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val || '';
}

/* ============================================================
   EXPORTAR CSV
   ============================================================ */
function exportarCSV() {
  const totalItens = regrasLista.length + gruposLista.length + areasLista.length;
  if (!totalItens) {
    if (typeof showToast === 'function') showToast('Nenhum dado para exportar.', 'warning');
    return;
  }

  const linhas = [];

  // Regras
  if (regrasLista.length) {
    linhas.push(['=== REGRAS DE ACESSO ===']);
    linhas.push(['"Nome"', '"Área"', '"Grupo"', '"Dias"', '"Horário Início"', '"Horário Fim"', '"Ativa"']);
    regrasLista.forEach(r => {
      linhas.push([
        `"${r.nome              || ''}"`,
        `"${r.areas?.nome       || ''}"`,
        `"${r.grupos?.nome      || ''}"`,
        `"${(r.dias_semana || []).join(', ')}"`,
        `"${r.horario_inicio    || ''}"`,
        `"${r.horario_fim       || ''}"`,
        `"${r.status === 'ativa' ? 'Sim' : 'Não'}"`,
      ].join(','));
    });
    linhas.push(['']);
  }

  // Grupos
  if (gruposLista.length) {
    linhas.push(['=== GRUPOS ===']);
    linhas.push(['"Nome"', '"Descrição"', '"Total membros"']);
    gruposLista.forEach(g => {
      linhas.push([
        `"${g.nome       || ''}"`,
        `"${g.descricao  || ''}"`,
        `"${g.total_membros ?? ''}"`,
      ].join(','));
    });
    linhas.push(['']);
  }

  // Áreas
  if (areasLista.length) {
    linhas.push(['=== ÁREAS ===']);
    linhas.push(['"Nome"', '"Descrição"', '"Nível de acesso"']);
    areasLista.forEach(a => {
      linhas.push([
        `"${a.nome          || ''}"`,
        `"${a.descricao     || ''}"`,
        `"${a.nivel_restricao || ''}"`,
      ].join(','));
    });
  }

  const csv  = linhas.map(l => Array.isArray(l) ? l.join('') : l).join('\r\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `regras_acesso_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  if (typeof showToast === 'function') showToast('Exportação concluída!', 'success');
}